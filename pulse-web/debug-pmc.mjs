import { config } from 'dotenv';
config({ path: '.env.local' });

async function trace(pmcId) {
  const biocUrl = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/${pmcId}/unicode`;
  const biocRes = await fetch(biocUrl);
  const rawData = await biocRes.json();
  
  let data;
  if (Array.isArray(rawData)) data = rawData[0];
  else data = rawData;
  
  const doc = data.documents?.[0];
  const figures = [];
  for (const passage of doc.passages) {
    const sectionType = (passage.infons?.section_type || '').toUpperCase();
    const type = (passage.infons?.type || '').toUpperCase();
    if (sectionType === 'FIG' || sectionType === 'FIGURE' || type === 'FIG' || type === 'FIGURE') {
      const fileName = passage.infons?.file || passage.infons?.graphic || null;
      figures.push({ id: passage.infons?.id, imageUrl: fileName });
    }
  }

  console.log('BioC Extracted Figures:', figures);

  const xmlUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcId}/fullTextXML`;
  const xmlRes = await fetch(xmlUrl);
  const xml = await xmlRes.text();

  for (const fig of figures) {
    if (!fig.imageUrl) continue;
    
    // Original prod logic
    const escapes = fig.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`<\\?image-name ${escapes}\\?>[\\s\\S]*?<\\?image-cloudpmc-urn (urn:cdn:blobs/[^\\?]+)\\?>`);
    const match = xml.match(pattern);
    
    let resolved = null;
    if (match) {
      resolved = match[1];
    } else {
      const fbPattern = new RegExp(`<\\?image-cloudpmc-urn (urn:cdn:blobs/[^\\?]+?${escapes})\\?>`);
      const fbMatch = xml.match(fbPattern);
      if (fbMatch) resolved = fbMatch[1];
    }

    console.log(`[${fig.id}] ${fig.imageUrl} -> ${resolved || 'NULL'}`);
    if (!resolved) {
      const i1 = xml.indexOf(fig.imageUrl);
      console.log(`  Index of exact filename in XML: ${i1}`);
      const base = fig.imageUrl.replace(/\.[^.]+$/, '');
      const i2 = xml.indexOf(base);
      console.log(`  Index of base filename in XML: ${i2}`);
      if (i2 > -1) {
        console.log(`  Context: ${xml.substring(Math.max(0, i2 - 80), i2 + 80)}`);
      }
    }
  }
}

trace('PMC10246689').catch(console.error);
