import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from './src/lib/prisma.ts';

async function main() {
  console.log('Clearing questions from the database...');
  
  const result = await prisma.question.deleteMany({});
  
  console.log(`Successfully deleted ${result.count} questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
