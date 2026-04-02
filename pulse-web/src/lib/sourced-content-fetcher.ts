/**
 * SourcedContentFetcher — PubMed Central Integration
 *
 * Searches PMC for Open Access scientific papers and retrieves:
 *   - Full text (structured via BioC API)
 *   - Associated figures with captions and image URLs
 *
 * Section-specific logic:
 *   - BB, CP, PS → full_text + associated_figures
 *   - CARS → full_text only (no figures)
 *
 * Rate limiting:
 *   - Without API key: max 3 requests/second
 *   - With API key: max 10 requests/second
 *
 * @see https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/
 * @see https://www.ncbi.nlm.nih.gov/books/NBK25499/
 */

import type { McatSubject } from './elo';
import { getRandomPMCQuery, type FigureType } from './aamc-topics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourcedFigure {
  id: string;               // e.g., "Figure 1", "Fig 2A"
  caption: string;          // Full figure caption text
  imageUrl: string | null;  // Direct URL to figure image (null if unavailable)
  figureType: FigureType;   // Classified type for MCAT relevance
}

export interface SourcedContent {
  pmcId: string;
  title: string;
  authors: string;
  fullText: string;         // Cleaned, truncated passage text (~600-800 words)
  figures: SourcedFigure[]; // Empty for CARS
  license: string;
  fetchedAt: Date;
}

// ---------------------------------------------------------------------------
// BioC API Response Types (subset)
// ---------------------------------------------------------------------------

interface BioCPassage {
  offset: number;
  text: string;
  infons: Record<string, string>;
  sentences?: { text: string; offset: number }[];
}

interface BioCDocument {
  id: string;
  passages: BioCPassage[];
  infons: Record<string, string>;
}

interface BioCResponse {
  source: string;
  date: string;
  documents: BioCDocument[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const NCBI_ESEARCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PMC_BIOC_BASE = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json';

/** Minimum delay between NCBI requests (ms) — 334ms ≈ 3 req/sec */
const MIN_REQUEST_DELAY_MS = 350;

/** Maximum passage length in words for the generated passage */
const MAX_PASSAGE_WORDS = 1800;

/** Minimum passage length to consider usable */
const MIN_PASSAGE_WORDS = 150;

/** Subjects that require figures */
const FIGURE_REQUIRED_SUBJECTS: McatSubject[] = ['bio_biochem', 'chem_phys', 'psych_soc'];

// ---------------------------------------------------------------------------
// Internal state (simple rate limiter)
// ---------------------------------------------------------------------------

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

// ---------------------------------------------------------------------------
// 1. Search PMC via E-utilities
// ---------------------------------------------------------------------------

/**
 * Search PubMed Central for Open Access articles matching a query.
 * Returns an array of PMC IDs.
 */
export async function searchPMC(
  query: string,
  maxResults: number = 10
): Promise<string[]> {
  const apiKey = process.env.NCBI_API_KEY;
  const params = new URLSearchParams({
    db: 'pmc',
    term: `${query} AND open_access[filter]`,
    retmax: String(maxResults),
    retmode: 'json',
    sort: 'relevance',
  });

  if (apiKey) {
    params.set('api_key', apiKey);
  }

  const url = `${NCBI_ESEARCH_BASE}?${params.toString()}`;

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      console.error(`[PMC Search] HTTP ${response.status}: ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    const idList: string[] = data?.esearchresult?.idlist ?? [];

    // ESearch returns numeric IDs — prepend 'PMC' for BioC API
    return idList.map((id: string) => (id.startsWith('PMC') ? id : `PMC${id}`));
  } catch (err) {
    console.error('[PMC Search] Error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 2. Fetch Paper Content via BioC API
// ---------------------------------------------------------------------------

/**
 * Fetch the full structured content of a PMC article via the BioC API.
 */
async function fetchBioCDocument(pmcId: string): Promise<BioCDocument | null> {
  // BioC API expects just the numeric part or the full PMC ID
  const cleanId = pmcId.startsWith('PMC') ? pmcId : `PMC${pmcId}`;
  const url = `${PMC_BIOC_BASE}/${cleanId}/unicode`;

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) {
      if (response.status === 404 && cleanId.startsWith('PMC')) {
        // Try without 'PMC' prefix as last resort
        const fallbackUrl = `${PMC_BIOC_BASE}/${cleanId.replace('PMC', '')}/unicode`;
        const retry = await rateLimitedFetch(fallbackUrl);
        if (retry.ok) {
          const data = await retry.json();
          if (data.documents?.length > 0) return data.documents[0];
        }
      }
      console.error(`[BioC] HTTP ${response.status} for ${cleanId}`);
      return null;
    }

    const rawData = await response.json();
    let data: BioCResponse;
    if (Array.isArray(rawData)) {
      if (rawData.length === 0) {
        console.warn(`[BioC] Empty array returned for ${cleanId}`);
        return null;
      }
      data = rawData[0];
    } else {
      data = rawData;
    }

    if (!data.documents || data.documents.length === 0) {
      console.warn(`[BioC] No documents returned for ${cleanId}`);
      return null;
    }

    return data.documents[0];
  } catch (err) {
    console.error(`[BioC] Error fetching ${cleanId}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. Extract & Classify Figures
// ---------------------------------------------------------------------------

/**
 * Classify a figure based on its caption text using keyword heuristics.
 */
export function classifyFigure(caption: string): FigureType {
  const lower = caption.toLowerCase();

  // Bar chart indicators
  if (
    /\b(bar\s*chart|bar\s*graph|error\s*bars?|mean\s*[±+\-]\s*(sd|sem|se)|column\s*graph)\b/.test(lower) ||
    /\b(fold\s*change|relative\s*(expression|abundance|level))\b/.test(lower)
  ) {
    return 'bar_chart';
  }

  // Line graph / kinetic plot indicators
  if (
    /\b(line\s*graph|time\s*course|kinetic|dose[- ]response|growth\s*curve|survival\s*curve)\b/.test(lower) ||
    /\b(over\s*time|temporal|concentration[- ]dependent)\b/.test(lower)
  ) {
    return 'line_graph';
  }

  // Western blot indicators
  if (
    /\b(western\s*blot|immunoblot|kda|anti-|antibod|band\s*intensit|protein\s*expression)\b/.test(lower)
  ) {
    return 'western_blot';
  }

  // Flowchart / pathway indicators
  if (
    /\b(pathway|signaling|cascade|schematic|flowchart|flow\s*chart|diagram|mechanism)\b/.test(lower)
  ) {
    return 'flowchart';
  }

  return 'other';
}

// ---------------------------------------------------------------------------
// 3b. MCAT Figure Appropriateness Filter
// ---------------------------------------------------------------------------

/**
 * Reject figures that depict non-MCAT-appropriate techniques/imaging.
 * Returns true if the figure is MCAT-appropriate, false if it should be rejected.
 *
 * MCAT-appropriate: standard bar/line graphs, Michaelis-Menten curves,
 *   Lineweaver-Burk plots, SDS-PAGE gels, Western blots, basic schematics,
 *   oxygen dissociation curves, Eadie-Hofstee, simple diagrams.
 *
 * NOT MCAT-appropriate: confocal/fluorescence microscopy, cryo-EM, flow cytometry,
 *   mass spectrometry, multi-panel research figures, AFM, FRET, super-resolution,
 *   PET/CT imaging, electropherograms, HPLC chromatograms, NMR spectra of
 *   complex molecules, etc.
 */
export function isFigureMCATAppropriate(caption: string): boolean {
  const lower = caption.toLowerCase();

  // ── REJECT patterns: advanced imaging, complex lab techniques ──
  const rejectPatterns = [
    // Advanced microscopy
    /\b(confocal|fluorescen(ce|t)\s*microscop|electron\s*microscop|cryo[- ]?(em|electron)|transmission\s*electron|scanning\s*electron|SEM\b|TEM\b|super[- ]?resolution|STED|PALM|STORM|two[- ]?photon|light\s*sheet|multiphoton)\b/i,
    // Flow cytometry / FACS
    /\b(flow\s*cytometr|FACS|fluorescence[- ]activated|scatter\s*plot.*SSC|FSC.*SSC|gating\s*strateg|dot\s*plot.*CD\d)\b/i,
    // Mass spectrometry
    /\b(mass\s*spectromet|LC[- ]?MS|GC[- ]?MS|MALDI|tandem\s*mass|MS\/MS|ESI[- ]?MS|QTOF|orbitrap|ion\s*trap|m\/z\s*ratio)\b/i,
    // Advanced sequencing / omics
    /\b(RNA[- ]?seq|ChIP[- ]?seq|ATAC[- ]?seq|Hi[- ]?C|single[- ]?cell|scRNA|whole[- ]?genome|exome|metagenom|proteomi|metabolomi|lipidomic|transcriptom)\b/i,
    // Advanced structural biology
    /\b(X[- ]?ray\s*crystall|crystallograph|diffraction\s*pattern|Å\s*resolution|angstrom|cryo[- ]?EM\s*structure|electron\s*density)\b/i,
    // Advanced biophysics / imaging
    /\b(atomic\s*force\s*microscop|AFM|FRET|surface\s*plasmon|SPR|biolayer\s*interfero|circular\s*dichroism|CD\s*spectr)\b/i,
    // Clinical / diagnostic imaging beyond MCAT
    /\b(PET[- ]?CT|SPECT|angiograph|arteriograph|cardiac\s*catheter|coronary\s*angiogra)\b/i,
    // Advanced molecular techniques
    /\b(optogenetic|patch[- ]?clamp|electrophysiolog|voltage[- ]?clamp|current[- ]?clamp)\b/i,
    // Bioinformatics visuals
    /\b(heat\s*map.*gene|volcano\s*plot|principal\s*component|PCA\s*plot|cluster\s*analysis|phylogenetic\s*tree.*bootstrap|network\s*analysis|STRING)\b/i,
    // Complex multi-panel indicators
    /\b(representative\s*image|micrograph|photomicrograph|histolog.*stain|immunohistochem|immunofluorescen|H\s*&\s*E\s*stain)\b/i,
  ];

  for (const pattern of rejectPatterns) {
    if (pattern.test(lower)) {
      return false;
    }
  }

  // ── APPROVE patterns: standard MCAT-level figures ──
  const approvePatterns = [
    /\b(bar\s*(chart|graph)|line\s*(chart|graph)|scatter\s*plot|curve|histogram)\b/i,
    /\b(Michaelis[- ]?Menten|Lineweaver[- ]?Burk|Eadie[- ]?Hofstee|enzyme\s*kinetic)\b/i,
    /\b(SDS[- ]?PAGE|gel\s*electrophoresis|western\s*blot|immunoblot)\b/i,
    /\b(oxygen\s*dissociation|hemoglobin.*curve|dose[- ]?response)\b/i,
    /\b(schematic|diagram|pathway|flowchart|overview|illustration|model)\b/i,
    /\b(growth\s*curve|survival\s*curve|titration\s*curve|pH.*curve)\b/i,
    /\b(table|percent|frequency|proportion|mean|standard\s*deviation)\b/i,
    /\b(graph|chart|plot|data|results?\s*show|figure\s*shows)\b/i,
  ];

  for (const pattern of approvePatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  // If no strong signal either way, reject by default (conservative)
  return false;
}

/**
 * Extract figure passages from a BioC document.
 * Filters for passages with section_type === 'FIG'.
 */
function extractFiguresFromBioC(doc: BioCDocument, pmcId: string): SourcedFigure[] {
  const figures: SourcedFigure[] = [];

  for (const passage of doc.passages) {
    const sectionType = passage.infons?.section_type || passage.infons?.type || '';

    if (sectionType.toUpperCase() === 'FIG' || sectionType.toUpperCase() === 'FIGURE') {
      const figId =
        passage.infons?.id ||
        passage.infons?.figure_id ||
        `Figure ${figures.length + 1}`;

      const caption = passage.text || '';
      if (!caption || caption.length < 20) continue; // Skip empty/trivial captions

      // Attempt to construct image URL from PMC
      // Temporarily store just the filename as imageUrl so we can resolve it later
      const fileName = passage.infons?.file || passage.infons?.graphic || null;
      let imageUrl: string | null = null;
      if (fileName) {
        imageUrl = fileName; // We'll resolve this to the actual CDN blob URN
      }

      figures.push({
        id: figId,
        caption,
        imageUrl,
        figureType: classifyFigure(caption),
      });
    }
  }

  return figures;
}

// ---------------------------------------------------------------------------
// 4. Extract Passage Text
// ---------------------------------------------------------------------------

/**
 * Extract the main body text from a BioC document.
 *
 * MCAT SCOPE: Only include INTRODUCTION, RESULTS (first ~500 words), and
 * DISCUSSION. Explicitly EXCLUDE Methods/Materials/Experimental Procedures
 * to prevent advanced lab protocol descriptions from contaminating the
 * passage text that gets fed to the LLM.
 */
function extractPassageText(doc: BioCDocument): string {
  // Sections to EXCLUDE entirely
  const excludedSections = new Set([
    'FIG', 'FIGURE', 'TABLE', 'REF', 'SUPPL', 'COMP_INT',
    'AUTH_CONT', 'ACK_FUND', 'KEYWORD', 'ABBR',
  ]);

  // Methods/Materials sections to EXCLUDE (critical for MCAT scope)
  const methodsSections = new Set([
    'METHODS', 'MATERIALS', 'MATERIALS AND METHODS',
    'METHODS AND MATERIALS', 'EXPERIMENTAL', 'EXPERIMENTAL PROCEDURES',
    'EXPERIMENTAL SECTION', 'SUBJECTS AND METHODS', 'STUDY DESIGN',
    'MATERIALS & METHODS', 'PROCEDURES', 'PROTOCOL',
  ]);

  const textParts: string[] = [];
  let resultsWordCount = 0;
  const MAX_RESULTS_WORDS = 500; // Cap results section to prevent data-dump contamination

  for (const passage of doc.passages) {
    const sectionType = (passage.infons?.section_type || '').toUpperCase();
    const type = (passage.infons?.type || '').toUpperCase();
    const sectionName = (passage.infons?.section || '').toUpperCase();

    // Skip non-body sections
    if (excludedSections.has(sectionType) || excludedSections.has(type)) continue;
    if (type === 'FRONT' || type === 'BACK' || type === 'REF') continue;

    // Skip Methods/Materials sections (MCAT scope enforcement)
    if (methodsSections.has(sectionType) || methodsSections.has(sectionName)) continue;
    // Also catch methods by partial match in section name
    if (sectionName.includes('METHOD') || sectionName.includes('MATERIAL') ||
        sectionName.includes('EXPERIMENTAL') || sectionName.includes('PROCEDURE')) continue;

    const text = passage.text?.trim();
    if (!text || text.length < 30) continue;

    // Cap Results section to prevent overwhelming detail
    if (sectionType === 'RESULTS' || sectionName.includes('RESULT')) {
      const wordCount = text.split(/\s+/).length;
      if (resultsWordCount + wordCount > MAX_RESULTS_WORDS) {
        // Take partial results to hit cap
        if (resultsWordCount < MAX_RESULTS_WORDS) {
          const remaining = MAX_RESULTS_WORDS - resultsWordCount;
          const truncatedWords = text.split(/\s+/).slice(0, remaining);
          textParts.push(truncatedWords.join(' '));
        }
        resultsWordCount = MAX_RESULTS_WORDS;
        continue;
      }
      resultsWordCount += wordCount;
    }

    textParts.push(text);
  }

  return textParts.join('\n\n');
}

/**
 * Truncate passage text to approximately MAX_PASSAGE_WORDS words,
 * trying to break at paragraph boundaries.
 */
function truncatePassage(fullText: string): string {
  const words = fullText.split(/\s+/);
  if (words.length <= MAX_PASSAGE_WORDS) return fullText;

  // Find a paragraph break near the word limit
  const truncatedWords = words.slice(0, MAX_PASSAGE_WORDS);
  const truncated = truncatedWords.join(' ');

  // Try to end at the last period
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > truncated.length * 0.7) {
    return truncated.substring(0, lastPeriod + 1);
  }

  return truncated + '...';
}

// ---------------------------------------------------------------------------
// 5. Extract Metadata
// ---------------------------------------------------------------------------

function extractMetadata(doc: BioCDocument): { title: string; authors: string; license: string } {
  let title = 'Untitled';
  let authors = 'Unknown';
  let license = 'Open Access';

  // Title is usually in the first TITLE passage
  for (const passage of doc.passages) {
    const type = (passage.infons?.type || '').toUpperCase();
    const sectionType = (passage.infons?.section_type || '').toUpperCase();

    if (type === 'TITLE' || sectionType === 'TITLE') {
      if (passage.text && passage.text.length > 5) {
        title = passage.text.trim();
        break;
      }
    }
  }

  // Authors and license from document-level infons
  if (doc.infons) {
    if (doc.infons.authors) authors = doc.infons.authors;
    if (doc.infons.license) license = doc.infons.license;
  }

  return { title, authors, license };
}

// ---------------------------------------------------------------------------
// 6. Main Orchestrator: fetchSourcedContent
// ---------------------------------------------------------------------------

/**
 * Fetch real scientific content from PubMed Central for question generation.
 *
 * - For BB, CP, PS: retrieves full_text + associated_figures
 * - For CARS: retrieves full_text only (no figures)
 *
 * @param subject — MCAT subject section
 * @param topic — Specific topic within the subject
 * @returns SourcedContent or null if no suitable content found
 */
export async function fetchSourcedContent(
  subject: McatSubject,
  topic: string
): Promise<SourcedContent | null> {
  const needsFigures = FIGURE_REQUIRED_SUBJECTS.includes(subject);

  // 1. Get a search query for this topic
  const query = getRandomPMCQuery(topic, subject);
  console.log(`[SourcedFetcher] Searching PMC for "${query}" (topic: ${topic}, subject: ${subject})`);

  // 2. Search PMC for relevant papers
  const pmcIds = await searchPMC(query, 15);
  if (pmcIds.length === 0) {
    console.warn(`[SourcedFetcher] No PMC results for query: ${query}`);
    return null;
  }

  // 3. Shuffle and try papers until we find a suitable one
  const shuffled = [...pmcIds].sort(() => Math.random() - 0.5);

  for (const pmcId of shuffled.slice(0, 10)) {
    try {
      const doc = await fetchBioCDocument(pmcId);
      if (!doc) continue;

      // Extract passage text
      const rawText = extractPassageText(doc);
      if (rawText.split(/\s+/).length < MIN_PASSAGE_WORDS) {
        console.log(`[SourcedFetcher] ${pmcId} text too short, skipping`);
        continue;
      }

      const passageText = truncatePassage(rawText);
      const metadata = extractMetadata(doc);

      // Extract figures (only for science sections)
      let figures: SourcedFigure[] = [];
      if (needsFigures) {
        const rawFigures = extractFiguresFromBioC(doc, pmcId);

        // MCAT APPROPRIATENESS FILTER: reject figures depicting advanced techniques
        const mcatApprovedFigures = rawFigures.filter((f) => isFigureMCATAppropriate(f.caption));
        console.log(`[SourcedFetcher] ${pmcId}: ${rawFigures.length} total figures, ${mcatApprovedFigures.length} MCAT-appropriate`);

        // From approved figures, prioritize classified (non-"other") ones
        const classifiedFigures = mcatApprovedFigures.filter((f) => f.figureType !== 'other');
        if (classifiedFigures.length > 0) {
          const priorityOrder: Record<FigureType, number> = {
            bar_chart: 0,
            line_graph: 1,
            western_blot: 2,
            flowchart: 3,
            other: 4,
          };
          figures = [...classifiedFigures]
            .sort((a, b) => priorityOrder[a.figureType] - priorityOrder[b.figureType])
            .slice(0, 2);
        } else if (mcatApprovedFigures.length > 0) {
          // Fall back to any MCAT-approved figures (up to 2)
          figures = mcatApprovedFigures.slice(0, 2);
        }
        // If NO MCAT-appropriate figures exist, figures stays empty []
        // The generator will handle this gracefully (text-only questions)
      }

      if (needsFigures && figures.length > 0) {
        await resolveImageUrls(pmcId, figures);
      }

      return {
        pmcId,
        title: metadata.title,
        authors: metadata.authors,
        fullText: passageText,
        figures,
        license: metadata.license,
        fetchedAt: new Date(),
      };
    } catch (err) {
      console.error(`[SourcedFetcher] Error processing ${pmcId}:`, err);
      continue;
    }
  }

  console.warn(`[SourcedFetcher] No suitable content found after trying ${Math.min(10, shuffled.length)} papers`);
  return null;
}

// ---------------------------------------------------------------------------
// 7. Validate Image URL
// ---------------------------------------------------------------------------

/**
 * Check if a figure's image URL is accessible.
 * Used for fallback logic: if image fails, generate text-only with caption.
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Validate figures and mark inaccessible ones with null imageUrl.
 * Returns figures with validated URLs.
 */
export async function validateFigureUrls(
  figures: SourcedFigure[]
): Promise<SourcedFigure[]> {
  const validated = await Promise.all(
    figures.map(async (fig) => {
      if (!fig.imageUrl) return fig;
      // Skip validation for the reliable CDN URLs to save time and avoid headless browser blocks
      if (fig.imageUrl.includes('cdn.ncbi.nlm.nih.gov')) {
        return fig;
      }
      const isValid = await validateImageUrl(fig.imageUrl);
      return { ...fig, imageUrl: isValid ? fig.imageUrl : null };
    })
  );
  return validated;
}

/**
 * Resolve raw filenames to actual CDN blob URLs via Europe PMC XML.
 */
async function resolveImageUrls(pmcId: string, figures: SourcedFigure[]): Promise<void> {
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcId}/fullTextXML`;
  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) return;
    const xml = await response.text();

    for (const fig of figures) {
      if (!fig.imageUrl) continue;
      const fileName = fig.imageUrl; // Stored here by extractFiguresFromBioC
      const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Look for <?image-name ...?> followed by <?image-cloudpmc-urn ...?>
      const urnPattern = new RegExp(`<\\?image-name ${escapedName}\\?>[\\s\\S]*?<\\?image-cloudpmc-urn ([^\\?]+)\\?>`);
      const match = xml.match(urnPattern);
      
      // Look for the newer schema: <?cloudpmc-path blobs/...?>
      const pathPattern = new RegExp(`<\\?cloudpmc-path (blobs/[^\\?]+?${escapedName})\\?>`);
      const pathMatch = xml.match(pathPattern);
      
      if (match && match[1]) {
        fig.imageUrl = match[1].replace('urn:cdn:blobs/', 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/');
      } else if (pathMatch && pathMatch[1]) {
        fig.imageUrl = 'https://cdn.ncbi.nlm.nih.gov/pmc/' + pathMatch[1];
      } else {
        // Fallback: any URN ending with the exact filename
        const fallbackPattern = new RegExp(`<\\?image-cloudpmc-urn (urn:cdn:blobs/[^\\?]+?${escapedName})\\?>`);
        const fallbackMatch = xml.match(fallbackPattern);
        if (fallbackMatch && fallbackMatch[1]) {
          fig.imageUrl = fallbackMatch[1].replace('urn:cdn:blobs/', 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/');
        } else {
          fig.imageUrl = null; // Unresolvable
        }
      }
    }
  } catch (err) {
    console.error(`[resolveImageUrls] Error fetching XML for ${pmcId}`, err);
    figures.forEach(f => f.imageUrl = null);
  }
}
