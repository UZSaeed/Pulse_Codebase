const query = 'enzyme kinetics Michaelis-Menten';
const params = new URLSearchParams({
  db: 'pmc',
  term: query + ' AND open_access[filter]',
  retmax: '5',
  retmode: 'json',
  sort: 'relevance',
});

const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?' + params.toString();
console.log('Searching PMC:', searchUrl);

const res = await fetch(searchUrl);
const data = await res.json();
const ids = data?.esearchresult?.idlist ?? [];
console.log('PMC search IDs (raw):', ids);

const pmcIds = ids.map(id => id.startsWith('PMC') ? id : 'PMC' + id);
console.log('PMC IDs (with prefix):', pmcIds);

if (pmcIds.length === 0) {
  console.error('No PMC IDs returned!');
  process.exit(1);
}

// Test BioC fetch on first 3 IDs
for (const pmcId of pmcIds.slice(0, 3)) {
  console.log('\n--- Testing', pmcId, '---');
  
  const url1 = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/${pmcId}/unicode`;
  console.log('URL (with PMC prefix):', url1);
  const r1 = await fetch(url1);
  console.log('Status Prefix:', r1.status);
  
  const url2 = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/${pmcId.replace('PMC', '')}/unicode`;
  console.log('URL (without prefix):', url2);
  const r2 = await fetch(url2);
  console.log('Status No Prefix:', r2.status);

  if (r1.ok) {
     const text = await r1.text();
     console.log('Prefix returned valid JSON?', text.startsWith('{'));
  }
}
