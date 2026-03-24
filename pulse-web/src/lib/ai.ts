/**
 * AI Question Generation & Token Routing for Pulse MCAT Prep
 *
 * Responsibilities:
 *   1. Build AAMC-style prompts for each subject.
 *   2. Route requests to the appropriate model based on cost/profitability.
 *   3. Parse the structured JSON response from the LLM.
 *
 * The prompt is designed to produce copyright-safe questions by instructing
 * the model to generate original content grounded in public-domain science,
 * while replicating AAMC structural patterns (distractor logic, integrative
 * reasoning, passage-based or discrete format).
 */

import { McatSubject, SUBJECT_LABELS } from './elo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedQuestion {
  passage?: string; // null for discrete questions
  stem: string;
  choices: { label: string; text: string }[];
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  subject: McatSubject;
  topic: string;
  difficulty: number; // estimated ELO
}

export type ModelTier = 'premium' | 'economy';

// ---------------------------------------------------------------------------
// Model routing
// ---------------------------------------------------------------------------

const MODEL_MAP: Record<ModelTier, string> = {
  premium: 'gpt-4o',
  economy: 'gpt-4o-mini', // cheap, fast fallback
};

/**
 * Determine which model tier to use.
 *
 * For Q-bank generation and the "explain to me" chat, we check the
 * user's monthly token budget. If they have exceeded it, we fall back
 * to the economy model so the platform stays profitable.
 *
 * @param tokensUsedThisMonth  Tokens consumed by this user this billing cycle
 * @param monthlyTokenBudget   Profitability ceiling per user
 */
export function selectModelTier(
  tokensUsedThisMonth: number,
  monthlyTokenBudget: number
): ModelTier {
  return tokensUsedThisMonth >= monthlyTokenBudget ? 'economy' : 'premium';
}

export function getModelName(tier: ModelTier): string {
  return MODEL_MAP[tier];
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert MCAT question author. You generate original, copyright-safe practice questions that match the rigor and structural patterns of the official AAMC exam.

Rules:
1. NEVER reproduce content from AAMC, UWorld, Kaplan, or any copyrighted test-prep source.
2. Ground all scientific content in established, public-domain knowledge (textbooks, peer-reviewed research).
3. Use AAMC-style distractor patterns: plausible wrong answers that test common misconceptions.
4. Include integrative reasoning that crosses sub-discipline boundaries when appropriate.
5. Provide a detailed, step-by-step explanation for EVERY question that walks through:
   - Why the correct answer is right
   - Why each distractor is wrong
   - The underlying concept being tested

You MUST respond with valid JSON matching the schema provided.`;

function buildUserPrompt(
  subject: McatSubject,
  topic: string | undefined,
  targetDifficulty: number,
  isPassageBased: boolean
): string {
  const subjectLabel = SUBJECT_LABELS[subject];
  const difficultyLabel =
    targetDifficulty < 1300
      ? 'foundational'
      : targetDifficulty < 1600
        ? 'intermediate'
        : 'advanced';

  const format = isPassageBased
    ? 'Create a passage (150-250 words) followed by 1 question about the passage.'
    : 'Create a standalone discrete question (no passage).';

  return `Generate 1 ${difficultyLabel}-level MCAT ${subjectLabel} question.
${topic ? `Focus topic: ${topic}` : 'Choose an appropriate high-yield topic.'}

${format}

Respond ONLY with JSON in this exact schema (no markdown fences):
{
  "passage": "string or null",
  "stem": "the question text",
  "choices": [
    { "label": "A", "text": "..." },
    { "label": "B", "text": "..." },
    { "label": "C", "text": "..." },
    { "label": "D", "text": "..." }
  ],
  "correctAnswer": "A",
  "explanation": "detailed step-by-step explanation",
  "topic": "the specific topic tested",
  "difficulty": ${targetDifficulty}
}`;
}

// ---------------------------------------------------------------------------
// Generation API call
// ---------------------------------------------------------------------------

export interface GenerateQuestionOptions {
  subject: McatSubject;
  topic?: string;
  targetDifficulty?: number;
  passageBased?: boolean;
  modelTier?: ModelTier;
}

/**
 * Call the OpenAI API (or compatible endpoint) to generate a question.
 *
 * This is designed to run server-side in a Next.js API route.
 */
export async function generateQuestion(
  apiKey: string,
  opts: GenerateQuestionOptions
): Promise<GeneratedQuestion> {
  const {
    subject,
    topic,
    targetDifficulty = 1500,
    passageBased = Math.random() > 0.4, // 60% passage-based by default
    modelTier = 'premium',
  } = opts;

  const model = getModelName(modelTier);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserPrompt(subject, topic, targetDifficulty, passageBased),
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  // Strip potential markdown fences the model might add despite instructions
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const parsed = JSON.parse(cleaned) as Omit<GeneratedQuestion, 'subject'>;

  return {
    ...parsed,
    subject,
  };
}

// ---------------------------------------------------------------------------
// "Explain to me" chat helper
// ---------------------------------------------------------------------------

export interface ExplainChatOptions {
  questionStem: string;
  explanation: string;
  userMessage: string;
  modelTier?: ModelTier;
}

/**
 * Interactive follow-up chat where the user can ask clarifying questions
 * about a previously generated explanation.
 */
export async function explainChat(
  apiKey: string,
  opts: ExplainChatOptions
): Promise<string> {
  const { questionStem, explanation, userMessage, modelTier = 'economy' } = opts;
  const model = getModelName(modelTier);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content:
            'You are a friendly and knowledgeable MCAT tutor. A student just answered a practice question and wants to understand the explanation better. Be concise, use analogies when helpful, and relate concepts back to MCAT-tested principles.',
        },
        {
          role: 'user',
          content: `Here is the question:\n${questionStem}\n\nHere is the official explanation:\n${explanation}\n\nThe student asks:\n${userMessage}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';
}
