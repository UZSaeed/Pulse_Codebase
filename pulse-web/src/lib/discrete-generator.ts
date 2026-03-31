/**
 * DiscreteGenerator — Standalone Question Generator
 *
 * Generates standalone discrete MCAT questions from micro-concepts.
 * No passage or figures required — these are short, focused questions
 * that test a single knowledge point (e.g., "Calculate the pI of Lysine").
 *
 * Refactored from the original ai.ts discrete path into a dedicated module.
 */

import type { McatSubject } from './elo';
import { SUBJECT_LABELS } from './elo';
import { getModelName, type ModelTier, type GeneratedQuestion, type AntiPattern } from './ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscreteQuestionOptions {
  subject: McatSubject;
  topic?: string;
  targetDifficulty?: number;
  modelTier?: ModelTier;
  examples?: Omit<GeneratedQuestion, 'subject'>[];
  antiPatterns?: AntiPattern[];
  count?: number; // Batch count support
}

// ---------------------------------------------------------------------------
// System Prompt (Discrete-specific)
// ---------------------------------------------------------------------------

const DISCRETE_SYSTEM_PROMPT = `You are an expert MCAT question author specializing in standalone discrete questions.

CONTEXT: Discrete questions on the MCAT are freestanding questions that do NOT accompany a passage. They test a single concept or calculation directly.

RULES:
1. NEVER reproduce content from AAMC, UWorld, Kaplan, or any copyrighted source.
2. Ground all content in public-domain scientific knowledge.
3. Questions must be self-contained — all information needed to answer is in the stem.
4. Use AAMC-style distractor patterns:
   - Common misconceptions
   - Calculation errors (off by a factor, wrong sign, wrong formula)
   - Confusing similar concepts (e.g., Km vs Vmax, sympathetic vs parasympathetic)
   - True statements that don't answer the specific question
5. Provide a detailed step-by-step explanation for the correct answer.
6. Provide distinct explanations for WHY each distractor is wrong.
7. Do NOT include any passage or figure references.

You MUST respond with valid JSON matching the schema provided. No markdown fences.`;

// ---------------------------------------------------------------------------
// Prompt Construction
// ---------------------------------------------------------------------------

function buildDiscreteUserPrompt(
  opts: DiscreteQuestionOptions
): string {
  const {
    subject,
    topic,
    targetDifficulty = 1500,
    examples,
    antiPatterns,
  } = opts;

  const subjectLabel = SUBJECT_LABELS[subject];
  const difficultyLabel =
    targetDifficulty < 1300
      ? 'foundational'
      : targetDifficulty < 1600
        ? 'intermediate'
        : 'advanced';

  let prompt = `Generate 1 ${difficultyLabel}-level standalone discrete MCAT ${subjectLabel} question.
${topic ? `Focus micro-concept: ${topic}` : 'Choose an appropriate high-yield micro-concept.'}

This is a DISCRETE question — NO passage, NO figures. The question stem must be self-contained.

Common discrete question types for ${subjectLabel}:
`;

  // Add subject-specific guidance
  const subjectGuidance: Record<McatSubject, string> = {
    chem_phys: `- pH/pKa calculations
- Unit conversions and dimensional analysis
- Identifying reaction types/mechanisms
- Circuit problems (Ohm's law, power)
- Gas law calculations
- Identifying stronger acids/bases/nucleophiles`,
    cars: `- Vocabulary in context
- Logical reasoning (standalone)
- Identifying argument structure`,
    bio_biochem: `- Amino acid pI calculations
- Identifying rate-limiting enzymes
- Predicting inheritance patterns
- Matching hormones to functions
- Identifying organelle functions
- Predicting mutation effects`,
    psych_soc: `- Identifying psychological disorders
- Matching theorists to theories
- Identifying conditioning types (CS, UCS, CR, UCR)
- Applying sociological concepts
- Identifying defense mechanisms
- Stages of development (Piaget, Erikson, Kohlberg)`,
  };

  prompt += subjectGuidance[subject] || '';

  // Add few-shot examples
  if (examples && examples.length > 0) {
    prompt += `\n\nHigh-quality examples to match in style and rigor:\n`;
    examples.forEach((ex, i) => {
      prompt += `--- Example ${i + 1} ---\n${JSON.stringify(ex, null, 2)}\n\n`;
    });
  }

  // Add anti-patterns
  if (antiPatterns && antiPatterns.length > 0) {
    prompt += `\nCRITICAL: Avoid these previously flagged bad patterns:\n`;
    antiPatterns.forEach((ap, i) => {
      prompt += `--- Bad Example ${i + 1} ---\nQuestion: ${JSON.stringify(ap.question, null, 2)}\nFeedback: ${ap.feedback}\n\n`;
    });
  }

  prompt += `
Respond ONLY with JSON in this exact schema (no markdown fences). If you generate multiple questions, respond with a JSON object containing a "questions" array.

GENERATE ${opts.count || 1} QUESTIONS.

Schema for a SINGLE question:
{
  "passage": null,
  "stem": "the question text (self-contained, no passage reference)",
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
  "imagePrompt": null,
  "topic": "the specific micro-concept tested",
  "difficulty": ${targetDifficulty}
}

If ${opts.count || 1} > 1, wrap them in:
{
  "questions": [ {...}, {...} ]
}`;

  return prompt;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate a standalone discrete MCAT question.
 * No passage, no figures — pure concept testing.
 */
export async function generateDiscreteQuestion(
  apiKey: string,
  opts: DiscreteQuestionOptions
): Promise<GeneratedQuestion> {
  const questions = await generateDiscreteQuestions(apiKey, { ...opts, count: 1 });
  return questions[0];
}

/**
 * Generate multiple discrete questions in a single batch.
 */
export async function generateDiscreteQuestions(
  apiKey: string,
  opts: DiscreteQuestionOptions & { count: number }
): Promise<GeneratedQuestion[]> {
  const model = getModelName(opts.modelTier || 'premium');
  const userPrompt = buildDiscreteUserPrompt(opts);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      max_tokens: Math.min(4000, 1000 * opts.count),
      messages: [
        { role: 'system', content: DISCRETE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsedRaw = JSON.parse(cleaned);
    let questions: any[] = [];
    
    if (parsedRaw.questions && Array.isArray(parsedRaw.questions)) {
      questions = parsedRaw.questions;
    } else if (Array.isArray(parsedRaw)) {
      questions = parsedRaw;
    } else {
      questions = [parsedRaw];
    }

    return questions.map(q => ({
      ...q,
      passage: undefined,
      subject: opts.subject,
    })) as GeneratedQuestion[];
  } catch (err) {
    console.error('[DiscreteGen] Failed to parse batch response:', cleaned.substring(0, 500));
    throw err;
  }
}
