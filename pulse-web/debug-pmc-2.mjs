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

  const xmlUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcId}/fullTextXML`;
  const xmlRes = await fetch(xmlUrl);
  const xml = await xmlRes.text();

  for (const fig of figures) {
    if (!fig.imageUrl) continue;
    
    // Original prod logic
    const fileName = fig.imageUrl;
    const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // First format: urn:cdn:blobs/
    const urnPattern = new RegExp(`<\\?image-name ${escapedName}\\?>[\\s\\S]*?<\\?image-cloudpmc-urn (urn:cdn:blobs/[^\\?]+)\\?>`);
    const match = xml.match(urnPattern);
    
    // Second format: <?cloudpmc-path blobs/...?>
    const pathPattern = new RegExp(`<\\?cloudpmc-path (blobs/[^\\?]+?${escapedName})\\?>`);
    const pathMatch = xml.match(pathPattern);

    if (match && match[1]) {
      fig.resolved = match[1].replace('urn:cdn:blobs/', 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/');
    } else if (pathMatch && pathMatch[1]) {
      fig.resolved = 'https://cdn.ncbi.nlm.nih.gov/pmc/' + pathMatch[1];
    } else {
      const fallbackPattern = new RegExp(`<\\?image-cloudpmc-urn (urn:cdn:blobs/[^\\?]+?${escapedName})\\?>`);
      const fallbackMatch = xml.match(fallbackPattern);
      if (fallbackMatch && fallbackMatch[1]) {
        fig.resolved = fallbackMatch[1].replace('urn:cdn:blobs/', 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/');
      } else {
        fig.resolved = null;
      }
    }
    console.log(`[${fig.id}] ${fig.imageUrl} -> ${fig.resolved}`);
  }
}

trace('PMC10246689').catch(console.error);
