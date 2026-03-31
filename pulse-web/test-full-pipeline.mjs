// Full pipeline trace: Search PMC → Fetch BioC → Extract Figures → Resolve URLs → Validate
const PMC_BIOC_BASE = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json';

async function trace() {
  // Step 1: Search PMC
  const query = 'enzyme kinetics Michaelis-Menten AND open_access[filter]';
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmax=3&retmode=json&sort=relevance`;
  console.log('=== STEP 1: Search PMC ===');
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const rawIds = searchData?.esearchresult?.idlist ?? [];
  const pmcIds = rawIds.map(id => id.startsWith('PMC') ? id : `PMC${id}`);
  console.log('PMC IDs:', pmcIds);

  if (pmcIds.length === 0) { console.error('No PMC IDs!'); return; }

  const pmcId = pmcIds[0];
  console.log('\nUsing:', pmcId);

  // Step 2: Fetch BioC document
  console.log('\n=== STEP 2: Fetch BioC ===');
  const biocUrl = `${PMC_BIOC_BASE}/${pmcId}/unicode`;
  console.log('URL:', biocUrl);
  const biocRes = await fetch(biocUrl);
  console.log('Status:', biocRes.status);
  const rawData = await biocRes.json();
  
  let data;
  if (Array.isArray(rawData)) {
    console.log('Response is ARRAY (length:', rawData.length, ')');
    data = rawData[0];
  } else {
    console.log('Response is OBJECT');
    data = rawData;
  }
  
  const doc = data.documents?.[0];
  if (!doc) { console.error('No document in BioC response!'); return; }
  console.log('Document found, passages:', doc.passages?.length);

  // Step 3: Extract figures
  console.log('\n=== STEP 3: Extract Figures ===');
  const figures = [];
  for (const passage of doc.passages) {
    const sectionType = (passage.infons?.section_type || '').toUpperCase();
    const type = (passage.infons?.type || '').toUpperCase();
    if (sectionType === 'FIG' || sectionType === 'FIGURE' || type === 'FIG' || type === 'FIGURE') {
      const fileName = passage.infons?.file || passage.infons?.graphic || null;
      const caption = passage.text || '';
      if (caption.length < 20) continue;
      figures.push({
        id: passage.infons?.id || `Figure ${figures.length + 1}`,
        caption: caption.substring(0, 80) + '...',
        imageUrl: fileName, // raw filename
        infons: passage.infons,
      });
    }
  }
  console.log('Figures found:', figures.length);
  figures.forEach((f, i) => {
    console.log(`  [${i}] id=${f.id}, filename=${f.imageUrl}`);
  });

  if (figures.length === 0) {
    console.log('\nNo figures found - checking all passage types...');
    const types = new Set();
    doc.passages.forEach(p => {
      const st = p.infons?.section_type || 'NONE';
      const t = p.infons?.type || 'NONE';
      types.add(`${st}/${t}`);
    });
    console.log('All section_type/type combos:', [...types]);
    return;
  }

  // Step 4: Resolve image URLs via Europe PMC XML
  console.log('\n=== STEP 4: Resolve Image URLs via Europe PMC XML ===');
  const xmlUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcId}/fullTextXML`;
  console.log('Fetching XML from:', xmlUrl);
  
  let xmlRes;
  try {
    xmlRes = await fetch(xmlUrl);
    console.log('XML fetch status:', xmlRes.status);
  } catch (e) {
    console.error('XML fetch FAILED:', e.message);
    return;
  }

  if (!xmlRes.ok) {
    console.error('XML fetch returned non-OK status');
    return;
  }

  const xml = await xmlRes.text();
  console.log('XML length:', xml.length, 'chars');

  for (const fig of figures) {
    if (!fig.imageUrl) { console.log(`  [${fig.id}] No filename, skipping`); continue; }
    
    const fileName = fig.imageUrl;
    const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern 1: image-name followed by image-cloudpmc-urn
    const urnPattern = new RegExp(`<\\?image-name ${escapedName}\\?>[\\s\\S]*?<\\?image-cloudpmc-urn ([^\\?]+)\\?>`);
    const match = xml.match(urnPattern);
    
    if (match && match[1]) {
      const cdnUrl = match[1].replace('urn:cdn:blobs/', 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/');
      console.log(`  [${fig.id}] ✅ Resolved: ${cdnUrl}`);
      fig.resolvedUrl = cdnUrl;
    } else {
      // Fallback
      const fallbackPattern = new RegExp(`<\\?image-cloudpmc-urn (urn:cdn:blobs/[^\\?]+?${escapedName})\\?>`);
      const fallbackMatch = xml.match(fallbackPattern);
      if (fallbackMatch && fallbackMatch[1]) {
        const cdnUrl = fallbackMatch[1].replace('urn:cdn:blobs/', 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/');
        console.log(`  [${fig.id}] ✅ Resolved (fallback): ${cdnUrl}`);
        fig.resolvedUrl = cdnUrl;
      } else {
        console.log(`  [${fig.id}] ❌ FAILED to resolve "${fileName}"`);
        
        // Debug: search for any mention of this filename
        const idx = xml.indexOf(fileName);
        if (idx >= 0) {
          console.log(`    Found filename in XML at index ${idx}`);
          console.log(`    Context: ...${xml.substring(Math.max(0, idx - 50), idx + fileName.length + 200)}...`);
        } else {
          console.log(`    Filename "${fileName}" NOT FOUND anywhere in XML!`);
          // Try without extension
          const baseName = fileName.replace(/\.[^.]+$/, '');
          const baseIdx = xml.indexOf(baseName);
          if (baseIdx >= 0) {
            console.log(`    But base name "${baseName}" found at index ${baseIdx}`);
            console.log(`    Context: ...${xml.substring(Math.max(0, baseIdx - 20), baseIdx + baseName.length + 200)}...`);
          }
        }
      }
    }
  }

  // Step 5: Validate resolved URLs
  console.log('\n=== STEP 5: Validate Resolved URLs ===');
  for (const fig of figures) {
    if (!fig.resolvedUrl) { console.log(`  [${fig.id}] No resolved URL, skip`); continue; }
    try {
      const res = await fetch(fig.resolvedUrl, { method: 'HEAD' });
      console.log(`  [${fig.id}] HEAD ${res.status} ${res.ok ? '✅' : '❌'} - ${fig.resolvedUrl}`);
    } catch (e) {
      console.log(`  [${fig.id}] HEAD FAILED: ${e.message}`);
    }
  }

  console.log('\n=== DONE ===');
}

trace().catch(console.error);
