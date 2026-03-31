import { config } from 'dotenv';
config({ path: '.env.local' });
import { generateSourcedQuestions } from './src/lib/ai.ts';

async function test() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No API key');

  console.log('Testing Sourced Questions Generator...');
  const res = await generateSourcedQuestions(apiKey, {
    subject: 'chem_phys',
    topic: 'Atomic Structure',
    questionCount: 2
  });

  if (!res) { console.log('Returned null'); return; }

  console.log('Passage Length:', res.passage_text.split(' ').length);
  console.log('Figures:', res.image_urls);
  for (const q of res.questions_array) {
    console.log(`\nQ: ${q.stem}`);
    console.log(`Requires Figure: ${q.requiresFigure}`);
    console.log(`Image URLs: ${q.imageUrls}`);
  }
}

test().catch(console.error);
