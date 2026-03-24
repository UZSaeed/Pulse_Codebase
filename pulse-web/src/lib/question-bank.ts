import { prisma } from './prisma';
import { generateQuestion, type GeneratedQuestion } from './ai';
import type { McatSubject } from './elo';

const TOPIC_QUESTION_LIMIT = 100;

export async function checkAndExpandQuestionBank(subject: McatSubject, topic: string) {
  // Count how many questions exist for this topic
  const count = await prisma.question.count({
    where: { topic }
  });

  if (count >= TOPIC_QUESTION_LIMIT) {
    return { success: true, generated: 0, reason: 'limit_reached' };
  }

  // If under limit, generate a new question
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  // Fetch up to 2 unflagged (high quality) questions to use as few-shot examples
  const existingQuestions = await prisma.question.findMany({
    where: {
      topic,
      flags: { none: {} }
    },
    take: 2,
    orderBy: { createdAt: 'desc' }
  });

  const examples = existingQuestions.map(q => ({
    passage: q.passage ? q.passage : undefined,
    stem: q.text,
    choices: q.choices ? JSON.parse(q.choices) : [],
    correctAnswer: q.correctAnswer ? q.correctAnswer : 'A',
    explanation: q.explanation,
    distractorExplanations: q.distractorExplanations ? JSON.parse(q.distractorExplanations) : undefined,
    topic: q.topic ? q.topic : topic,
    difficulty: q.baseDifficulty
  }));

  // Fetch flagged questions to use as anti-patterns, but ONLY if >= 10% of users who saw it flagged it
  const flaggedQuestions = await prisma.question.findMany({
    where: { flags: { some: {} } },
    include: { flags: true, performances: true },
    orderBy: { createdAt: 'desc' }
  });

  const validAntiPatterns = flaggedQuestions.filter(q => {
    const totalSeen = Math.max(q.performances.length, 1);
    return (q.flags.length / totalSeen) >= 0.10; // 10% threshold
  }).slice(0, 2);

  const antiPatterns = validAntiPatterns.map(q => ({
    question: {
      passage: q.passage ? q.passage : undefined,
      stem: q.text,
      choices: q.choices ? JSON.parse(q.choices) : [],
      correctAnswer: q.correctAnswer ? q.correctAnswer : 'A',
      explanation: q.explanation,
      distractorExplanations: q.distractorExplanations ? JSON.parse(q.distractorExplanations) : undefined,
      topic: q.topic ? q.topic : topic,
      difficulty: q.baseDifficulty
    },
    feedback: q.flags.map(f => `Reason: ${f.reason}. Details: ${f.details || 'none'}`).join(' | ')
  }));

  // We loop to generate multiple if needed, but for rate limiting let's just generate 1 at a time per request
  const generated = await generateQuestion(apiKey, {
    subject,
    topic,
    targetDifficulty: 1500, // Can be randomized or requested
    passageBased: Math.random() > 0.4,
    examples: examples.length > 0 ? examples : undefined,
    antiPatterns: antiPatterns.length > 0 ? antiPatterns : undefined
  });

  // Example visual generation logic utilizing DALL-E when an imagePrompt exists
  /*
  let base64Visual = null;
  if (generated.imagePrompt) {
    const visualRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: "POST",
      headers: { ... },
      body: JSON.stringify({ prompt: generated.imagePrompt, size: "1024x1024", model: "dall-e-3" })
    });
    // Upload image to Supabase storage and get URL, then save URL to question passage, etc.
  }
  */

  await prisma.question.create({
    data: {
      subject: generated.subject,
      topic: generated.topic,
      passage: generated.passage,
      text: generated.stem,
      choices: JSON.stringify(generated.choices),
      correctAnswer: generated.correctAnswer,
      explanation: generated.explanation,
      distractorExplanations: generated.distractorExplanations ? JSON.stringify(generated.distractorExplanations) : null,
      baseDifficulty: generated.difficulty,
    }
  });

  return { success: true, generated: 1 };
}
