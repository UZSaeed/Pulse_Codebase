/**
 * AI Question Generation & Token Routing for Spike MCAT Prep
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
import { fetchSourcedContent } from './sourced-content-fetcher';
import { generateMultimodalQuestions, type MultimodalQuestionSet, type MultimodalGenerateOptions } from './multimodal-generator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedQuestion {
  id?: string;
  passage?: string | null; // null for discrete questions
  stem: string;
  choices: { label: string; text: string }[];
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  distractorExplanations: Record<string, string>;
  imageUrls?: string[] | null;
  sourcePmcId?: string | null;
  subject: McatSubject;
  topic: string;
  difficulty: number; // estimated ELO
  chapterId?: string;
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
2. Ground all scientific content in established, public-domain knowledge (textbooks, peer-reviewed research), using entirely novel scenarios, clinical case studies, or experimental setups.
3. Use AAMC-style distractor patterns: plausible wrong answers that test common misconceptions.
4. Include integrative reasoning that crosses sub-discipline boundaries when appropriate.
5. Provide a detailed, step-by-step explanation for the correct answer, AND distinct explanations for why each distractor is wrong.
6. If the passage or question would benefit from a scientific visual, chart, molecular structure, or graph, provide an extremely descriptive 'imagePrompt' that can be given to an image generation model (like DALL-E 3) to create it. If no visual is needed, set 'imagePrompt' to null.

7. SCOPE ENFORCEMENT: ALL questions MUST test ONLY content within these MCAT domains:
   - Biology: cell biology, genetics, organ systems, central dogma, evolution
   - General Chemistry: stoichiometry, atomic structure, bonding, acids/bases, equilibrium, thermochemistry, electrochemistry, gas laws
   - Organic Chemistry: functional groups, reaction mechanisms, stereochemistry, carbonyl chemistry, amino acid structure
   - Biochemistry: enzyme kinetics, metabolic pathways, amino acid properties, protein structure, membrane transport
   - Physics: kinematics, forces, work/energy, fluids, electrostatics, circuits, optics, waves/sound
   - Psychology/Sociology: learning, memory, cognition, social psychology, developmental psychology, sensation/perception

8. FORBIDDEN TOPICS: NEVER ask questions about band gaps, semiconductor physics, solid-state lattice constants, quantum computing, engineering-specific measurements, advanced imaging interpretation (cryo-EM, flow cytometry, mass spectrometry), drug design/pharmacokinetics, computational biology, or machine learning.

9. MANDATORY PIVOTS: If source material references an advanced topic, pivot to a related foundational concept:
   - Complex enzyme mechanism → basic Km, Vmax, inhibition types
   - Advanced cell signaling → basic receptors, second messengers
   - Genetic engineering → central dogma, mutations, inheritance
   - Advanced physiology → basic organ system function, homeostasis
   - Behavioral neuroscience → neurotransmitter function, conditioning
   - Complex statistics → identifying IV/DV, control groups, basic experimental design

10. SELF-CHECK: Before finalizing, ask: "Could a pre-med student answer this using only standard undergraduate textbooks?" If NO, rewrite.

You MUST respond with valid JSON matching the schema provided.`;

export interface AntiPattern {
  question: Omit<GeneratedQuestion, 'subject'>;
  feedback: string;
}

function buildUserPrompt(
  subject: McatSubject,
  topic: string | undefined,
  targetDifficulty: number,
  isPassageBased: boolean,
  examples?: Omit<GeneratedQuestion, 'subject'>[],
  antiPatterns?: AntiPattern[]
): string {
  const subjectLabel = SUBJECT_LABELS[subject];
  const difficultyLabel =
    targetDifficulty < 1300
      ? 'foundational'
      : targetDifficulty < 1600
        ? 'intermediate'
        : 'advanced';

  const format = isPassageBased
    ? 'Create a passage (500-650 words) that reads like a scientific journal article or clinical case study, followed by 1 question about the passage.'
    : 'Create a standalone discrete question (no passage).';

  let examplesText = '';
  if (examples && examples.length > 0) {
    examplesText = `\n\nHere are some HIGH-QUALITY examples to inspire your structure and difficulty:\n` + examples.map((ex, i) => `--- Example ${i + 1} ---\n${JSON.stringify(ex, null, 2)}\n`).join('\n');
  }

  let antiPatternsText = '';
  if (antiPatterns && antiPatterns.length > 0) {
    antiPatternsText = `\n\nCRITICAL: Avoid making the same mistakes as these PREVIOUSLY FLAGGED BAD QUESTIONS. The accompanying feedback explains why they were rejected:\n` + antiPatterns.map((ap, i) => `--- Bad Example ${i + 1} ---\nQuestion Data: ${JSON.stringify(ap.question, null, 2)}\nFeedback: ${ap.feedback}\n`).join('\n');
  }

  return `Generate 1 ${difficultyLabel}-level MCAT ${subjectLabel} question.
${topic ? `Focus topic: ${topic}` : 'Choose an appropriate high-yield topic.'}

${format}${examplesText}${antiPatternsText}

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
  "explanation": "detailed step-by-step explanation for the correct answer",
  "distractorExplanations": {
    "A": "Why A is wrong (omit if A is correct)",
    "B": "Why B is wrong",
    "C": "Why C is wrong",
    "D": "Why D is wrong"
  },
  "imagePrompt": "string describing visual/diagram to generate, or null",
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
  examples?: Omit<GeneratedQuestion, 'subject'>[];
  antiPatterns?: AntiPattern[];
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
    examples,
    antiPatterns,
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
      max_tokens: 3000, // increased to support longer 600-word passages
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserPrompt(subject, topic, targetDifficulty, passageBased, examples, antiPatterns),
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
// Sourced Generation API call
// ---------------------------------------------------------------------------

/**
 * Orchestrator to fetch real scientific papers from PMC
 * and run them through the multimodal question generator.
 */
export async function generateSourcedQuestions(
  apiKey: string,
  opts: MultimodalGenerateOptions
): Promise<MultimodalQuestionSet | null> {
  const { subject, topic } = opts;
  if (!topic) {
    console.warn('[SourcedGen] Topic is required to search PMC');
    return null;
  }

  const content = await fetchSourcedContent(subject, topic);
  if (!content) {
    return null;
  }

  return generateMultimodalQuestions(apiKey, content, opts);
}

// ---------------------------------------------------------------------------
// "Explain to me" chat helper
// ---------------------------------------------------------------------------

export interface ExplainChatOptions {
  questionStem: string;
  explanation: string;
  passage?: string | null;
  choices?: any;
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
  const { questionStem, explanation, passage, choices, userMessage, modelTier = 'economy' } = opts;
  const model = getModelName(modelTier);

  const contextStr = [
    passage ? `Passage:\n${passage}\n` : '',
    `Question:\n${questionStem}\n`,
    choices ? `Choices:\n${JSON.stringify(choices, null, 2)}\n` : '',
    `Official Explanation:\n${explanation}\n`
  ].join('\n');

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
            'You are a strict but friendly MCAT tutor. You only answer questions related to the MCAT, the passage, or the underlying scientific concepts. If a user asks something entirely off-topic, politely decline to answer to conserve processing power. Do not engage in writing stories, generating code, or casual chat.',
        },
        {
          role: 'user',
          content: `Here is the current question context:\n${contextStr}\n\nThe student asks:\n${userMessage}`,
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

// ---------------------------------------------------------------------------
// Post-generation scope validation
// ---------------------------------------------------------------------------

/**
 * Validate that a generated question is within MCAT scope.
 * Makes a fast secondary LLM call to check if the question could be answered
 * by an undergraduate student using standard textbooks.
 *
 * Returns { valid: true } if in scope, or { valid: false, reason: string } if not.
 */
export async function validateQuestionScope(
  apiKey: string,
  question: { stem: string; choices: { label: string; text: string }[]; passage?: string | null; explanation: string },
  modelTier: ModelTier = 'economy'
): Promise<{ valid: boolean; reason?: string }> {
  const model = getModelName(modelTier);

  const questionContext = [
    question.passage ? `Passage excerpt: ${question.passage.substring(0, 300)}...` : '',
    `Question: ${question.stem}`,
    `Choices: ${question.choices.map(c => `${c.label}) ${c.text}`).join(' | ')}`,
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.0,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: 'You are an MCAT content scope validator. Your job is to determine whether a practice question tests content within MCAT scope. MCAT tests: undergraduate biology, general chemistry, organic chemistry, biochemistry, physics, psychology, and sociology. If the question requires specialized graduate-level knowledge, advanced lab technique interpretation, or engineering concepts to answer correctly, it is OUT OF SCOPE. Respond with JSON: {"valid": true} or {"valid": false, "reason": "brief explanation"}. No markdown fences.',
          },
          {
            role: 'user',
            content: `Could an undergraduate pre-med student answer this using only standard Biology, Chemistry, Physics, and Psychology textbooks plus the provided passage context?\n\n${questionContext}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('[ScopeValidation] API error, assuming valid:', response.status);
      return { valid: true };
    }

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content ?? '').trim();
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const result = JSON.parse(cleaned);
      return { valid: !!result.valid, reason: result.reason };
    } catch {
      console.warn('[ScopeValidation] Failed to parse response:', cleaned);
      return { valid: true }; // Fail-open
    }
  } catch (err) {
    console.warn('[ScopeValidation] Error:', err);
    return { valid: true }; // Fail-open on network errors
  }
}
