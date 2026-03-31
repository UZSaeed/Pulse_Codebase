import { config } from 'dotenv';
config({ path: '.env.local' });
import { fetchSourcedContent } from './src/lib/sourced-content-fetcher.ts';

async function test() {
  console.log('Fetching content...');
  const res = await fetchSourcedContent('chem_phys', 'Atomic Structure');
  
  if (!res) { console.log('Returned null'); return; }

  console.log('PMC ID:', res.pmcId);
  console.log('Total figures:', res.figures.length);
  for (const f of res.figures) {
    console.log(`Figure ${f.id}: imageUrl=${f.imageUrl}`);
  }
}

test().catch(console.error);
