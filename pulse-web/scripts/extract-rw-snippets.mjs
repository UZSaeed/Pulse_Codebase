/**
 * Extracts SAT Reading & Writing question snippets from College Board
 * question bank PDF exports and merges them into sat-official-snippets.json.
 *
 * Usage: node scripts/extract-rw-snippets.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const QUESTIONS_ROOT = join(ROOT, '..', 'Questions', 'English');
const SNIPPETS_PATH = join(ROOT, 'src', 'data', 'sat-official-snippets.json');

const DOMAIN_MAP = {
  'Craft and Structure': 'Craft and Structure',
  'Expression of Ideas': 'Expression of Ideas',
  'Standard English Conventions': 'Standard English Conventions',
  'Information and Ideas': 'Information and Ideas',
};

const DIFFICULTY_MAP = {
  'Easy': 'easy',
  'Medium': 'medium',
  'Hard': 'hard',
};

function findPdfs() {
  const pdfs = [];
  for (const [domain] of Object.entries(DOMAIN_MAP)) {
    for (const [diffLabel, diffVal] of Object.entries(DIFFICULTY_MAP)) {
      const dir = join(QUESTIONS_ROOT, domain, diffLabel);
      try {
        const result = execSync(`find "${dir}" -name "*.pdf" -type f`, { encoding: 'utf-8' }).trim();
        if (result) {
          for (const pdfPath of result.split('\n')) {
            pdfs.push({ path: pdfPath.trim(), domain, difficulty: diffVal });
          }
        }
      } catch {
        // directory may not exist
      }
    }
  }
  return pdfs;
}

function parseQuestionBlock(block, domain, difficulty) {
  const idMatch = block.match(/Question\s*ID:\s*([a-f0-9]+)/i);
  if (!idMatch) return null;
  const sourceId = idMatch[1];

  // Extract skill from metadata line
  const skillPatterns = [
    /Words in Context/i,
    /Text Structure and\s*Purpose/i,
    /Cross-Text Connections/i,
    /Central Ideas and Details/i,
    /Inferences/i,
    /Command of Evidence/i,
    /Rhetorical Synthesis/i,
    /Transitions/i,
    /Boundaries/i,
    /Form, Structure, and Sense/i,
  ];
  let skill = '';
  for (const pat of skillPatterns) {
    const m = block.match(pat);
    if (m) { skill = m[0].replace(/\s+/g, ' ').trim(); break; }
  }

  // Everything from the line after the difficulty tag to "Answer" or first choice
  const parts = block.split(/\n/);
  let questionStart = -1;
  let answerStart = -1;

  for (let i = 0; i < parts.length; i++) {
    if (/^(?:Easy|Medium|Hard)\s*$/i.test(parts[i].trim()) && questionStart === -1) {
      // Next non-empty line after difficulty is start of question header
      // Actually the next line is "Question" header, skip it
      for (let j = i + 1; j < parts.length; j++) {
        if (parts[j].trim() === 'Question') { questionStart = j + 1; break; }
        if (parts[j].trim().length > 0) { questionStart = j; break; }
      }
      if (questionStart === -1) questionStart = i + 1;
    }
    if (/^\s*Answer\s*$/i.test(parts[i]) && answerStart === -1) {
      answerStart = i;
    }
  }

  // Fallback: find "Question" header
  if (questionStart === -1) {
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].trim() === 'Question') { questionStart = i + 1; break; }
    }
  }

  if (questionStart === -1) return null;
  if (answerStart === -1) answerStart = parts.length;

  let prompt = parts.slice(questionStart, answerStart).join('\n').trim();
  if (!prompt || prompt.length < 20) return null;

  // Extract answer choices (only first occurrence of each letter)
  const choices = [];
  const seen = new Set();
  const choiceRegex = /^([A-D])\.\s+(.+?)$/gm;
  let m;
  while ((m = choiceRegex.exec(block)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      choices.push({ label: m[1], text: m[2].trim() });
    }
  }

  // Extract correct answer
  const correctMatch = block.match(/Correct\s*Answer:\s*([A-D])/i);
  const correctAnswer = correctMatch ? correctMatch[1] : '';

  // Extract rationale for the correct choice
  let rationale = '';
  if (correctAnswer) {
    const ratMatch = block.match(/Rationale\s*\n([\s\S]*?)(?:Choice [A-D] is incorrect|$)/i);
    if (ratMatch) rationale = ratMatch[1].replace(/\s+/g, ' ').trim();
  }

  return {
    section: 'reading_writing',
    domain: DOMAIN_MAP[domain] || domain,
    skill,
    difficulty,
    sourceId,
    prompt: prompt.replace(/\s+/g, ' ').trim(),
    choices: choices.slice(0, 4),
    correctAnswer,
    rationale: rationale.slice(0, 500),
  };
}

function extractQuestionsFromText(text, domain, difficulty) {
  const snippets = [];
  const blocks = text.split(/(?=Question\s*ID:\s*[a-f0-9]+)/i);

  for (const block of blocks) {
    const snippet = parseQuestionBlock(block, domain, difficulty);
    if (snippet && snippet.choices.length === 4 && snippet.correctAnswer) {
      snippets.push(snippet);
    }
  }

  return snippets;
}

async function main() {
  console.log('Finding PDFs...');
  const pdfs = findPdfs();
  console.log(`Found ${pdfs.length} PDFs to process\n`);

  const existing = JSON.parse(readFileSync(SNIPPETS_PATH, 'utf-8'));
  const existingIds = new Set(existing.map(s => s.sourceId).filter(Boolean));
  console.log(`Existing snippets: ${existing.length} (${existingIds.size} unique IDs)`);

  const existingRwDomains = new Set(
    existing.filter(s => s.section === 'reading_writing').map(s => s.domain)
  );
  console.log(`Existing RW domains: ${[...existingRwDomains].join(', ')}\n`);

  let newSnippets = [];

  for (const pdf of pdfs) {
    console.log(`Processing: ${pdf.domain} / ${pdf.difficulty}`);
    console.log(`  File: ${pdf.path}`);

    try {
      const buf = readFileSync(pdf.path);
      const parser = new PDFParse(new Uint8Array(buf));
      const result = await parser.getText();
      const text = result.text;

      console.log(`  Pages: ${result.total}, Text length: ${text.length}`);

      const extracted = extractQuestionsFromText(text, pdf.domain, pdf.difficulty);
      const fresh = extracted.filter(s => !existingIds.has(s.sourceId));

      console.log(`  Extracted: ${extracted.length} questions (${fresh.length} new)`);

      for (const s of fresh) {
        existingIds.add(s.sourceId);
      }
      newSnippets.push(...fresh);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }

  if (newSnippets.length === 0) {
    console.log('\nNo new snippets to add.');
    return;
  }

  const merged = [...existing, ...newSnippets];
  writeFileSync(SNIPPETS_PATH, JSON.stringify(merged, null, 2) + '\n');

  console.log(`\nAdded ${newSnippets.length} new snippets`);
  console.log(`Total snippets: ${merged.length}`);

  const coverage = {};
  merged.forEach(s => {
    const key = `${s.section} > ${s.domain}`;
    coverage[key] = (coverage[key] || 0) + 1;
  });
  console.log('\nUpdated coverage:');
  Object.entries(coverage).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

main().catch(console.error);
