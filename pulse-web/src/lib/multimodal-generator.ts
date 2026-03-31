/**
 * MultimodalPassageGenerator — "AAMC Writer" Persona
 *
 * Uses a multimodal LLM (GPT-4o) with Chain-of-Thought (CoT) prompting
 * to generate AAMC Skill 4 style questions from real scientific papers
 * and their associated figures.
 *
 * Prompt Structure (CoT for Vision):
 *   STEP 1: Describe each figure, identify IV, DV, Controls, p-values
 *   STEP 2: Generate 4-6 questions (≥2 requiring figure interpretation)
 *   STEP 3: Provide detailed AAMC-style explanations referencing figures
 *
 * Fallback: If image URLs are inaccessible, switches to text-only
 *           generation using figure captions as embedded descriptions.
 */

import type { McatSubject } from './elo';
import { SUBJECT_LABELS } from './elo';
import { getModelName, selectModelTier, type ModelTier } from './ai';
import {
  type SourcedContent,
  type SourcedFigure,
  validateFigureUrls,
} from './sourced-content-fetcher';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultimodalQuestion {
  stem: string;
  choices: { label: string; text: string }[];
  correctAnswer: string;       // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  distractorExplanations: Record<string, string>;
  requiresFigure: boolean;
  referencedFigure?: string;   // e.g., "Figure 1"
  difficulty: number;
  topic: string;
  imageUrls?: string[] | null;
}

export interface MultimodalQuestionSet {
  passage_text: string;
  image_urls: string[];
  source_metadata: {
    pmcId: string;
    title: string;
    authors: string;
    license: string;
  };
  questions_array: MultimodalQuestion[];
  subject_metadata: {
    subject: McatSubject;
    chapter: string;
    topics: string[];
  };
}

export interface MultimodalGenerateOptions {
  subject: McatSubject;
  topic: string;
  chapter?: string;
  targetDifficulty?: number;
  modelTier?: ModelTier;
  questionCount?: number;       // default 4-6
}

// ---------------------------------------------------------------------------
// System Prompt — AAMC Item Writer Persona
// ---------------------------------------------------------------------------

const MULTIMODAL_SYSTEM_PROMPT = `You are an expert AAMC Item Writer with deep expertise in MCAT question construction.

ROLE: You create rigorous, copyright-safe MCAT practice questions from real scientific research papers.

RULES:
1. NEVER reproduce content from AAMC, UWorld, Kaplan, or any copyrighted test-prep source.
2. Use the provided scientific passage and figures as the SOLE basis for your questions.
3. Questions must test AAMC Skill 4 (Research Design and Execution) and Skill 2 (Scientific Reasoning).
4. At least TWO questions must explicitly require interpreting a trend, value, or pattern from a figure.
5. Use AAMC-standard distractor patterns:
   - "Goes beyond the evidence" (answer makes a claim not supported by the data)
   - "Confuses correlation with causation"
   - "True statement that doesn't answer the question"
   - "Reverses the direction of a relationship shown in the data"
   - "Misidentifies the independent or dependent variable"
6. Every explanation must be detailed and reference specific data from the passage or figures.
7. CRITICAL SCOPE ENFORCEMENT: The provided research paper WILL be highly advanced (e.g., graduate-level, specialized clinical medicine, advanced materials engineering). **YOU MUST STRIP AWAY THE COMPLEXITY**. Only use the paper as a backdrop. ALL questions MUST test ONLY foundational, 100-level undergraduate science concepts (e.g., Gen Chem: Stoichiometry, electron configurations, VSEPR; Biology: central dogma, basic cell structures; Physics: basic kinematics, rudimentary circuits). If the paper uses a complex transition-metal catalyst, ask a basic question about transition metal characteristics. **NEVER ask a question that requires prior knowledge of the advanced topic.**
8. FORBIDDEN TOPICS: NEVER ask questions about band gaps, semiconductor physics, solid-state lattice constants, quantum computing, or engineering-specific measurements.
9. MANDATORY PIVOTS: If you see a complex paper, you MUST pivot to one of these:
   - Atomic Structure (valence electrons, subshell configuration, Zeff, atomic/ionic radius).
   - Bonding (electronegativity differences, bond polarity, octet rule, hybridization).
   - Periodic Trends (ionization energy, electron affinity).
   - Stoichiometry (limiting reagents, percent yield).
   - Laboratory Techniques (identifying controls, independent vs dependent variables).
10. PASSAGE LENGTH: Ensure the passage is 700-1000 words of dense, AAMC-style prose.

WORKFLOW (Chain-of-Thought):
STEP 1 — VISION REASONING: For each provided figure:
  a) Describe the figure in one sentence.
  b) Identify the Independent Variable (IV), Dependent Variable (DV), and Control Groups.
  c) Note any Statistical Significance: p-values, error bars (overlapping vs non-overlapping), asterisks.
  d) Identify the key trend or finding.

STEP 2 — QUESTION CREATION: Generate questions in the specified JSON format.
  - At least 2 questions must explicitly require the user to interpret a trend from a figure.
  - Questions should reference figures as "Based on Figure 1..." or "According to Figure 2..."
  - Include a mix of difficulty levels.

STEP 3 — EXPLANATIONS: For every answer choice, provide a detailed AAMC-style explanation.
  - If the answer is found in a figure, specifically write "As seen in Figure 1..." or "Figure 2 shows..."
  - Explain WHY each distractor is wrong using specific evidence.

You MUST respond with valid JSON matching the schema provided. No markdown fences.`;

// ---------------------------------------------------------------------------
// CARS-specific system prompt (no figures)
// ---------------------------------------------------------------------------

const CARS_SYSTEM_PROMPT = `You are an expert AAMC Item Writer specializing in Critical Analysis and Reasoning Skills (CARS).

ROLE: You create rigorous MCAT CARS practice questions from provided text passages.

RULES:
1. NEVER reproduce content from AAMC, UWorld, Kaplan, or any copyrighted source.
2. Questions must test reading comprehension, argument analysis, and reasoning skills.
3. Use the provided passage as the SOLE source material.
4. Passage questions should cover: Main Idea, Tone, Inference, Strengthening/Weakening, Application.
5. Use AAMC-standard CARS distractor patterns:
   - "Too extreme" (overstates the author's position)
   - "Out of scope" (brings in external information not in the passage)
   - "Opposite" (reverses the author's actual position)
   - "True but doesn't answer the question"

You MUST respond with valid JSON matching the schema provided. No markdown fences.`;

// ---------------------------------------------------------------------------
// Prompt Construction
// ---------------------------------------------------------------------------

function buildMultimodalUserPrompt(
  sourcedContent: SourcedContent,
  opts: MultimodalGenerateOptions,
  figuresWithValidUrls: SourcedFigure[]
): { role: string; content: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> } {
  const { subject, topic, targetDifficulty = 1500, questionCount = 5 } = opts;
  const subjectLabel = SUBJECT_LABELS[subject];
  const isCars = subject === 'cars';

  const difficultyLabel =
    targetDifficulty < 1300
      ? 'foundational (1200-1300 ELO)'
      : targetDifficulty < 1600
        ? 'intermediate (1400-1600 ELO)'
        : 'advanced (1700+ ELO)';

  // Build text content
  let textContent = `Generate ${questionCount} ${subjectLabel} MCAT questions at ${difficultyLabel} difficulty.
Focus topic: ${topic}

--- SOURCE PAPER ---
Title: ${sourcedContent.title}
Authors: ${sourcedContent.authors}

--- PASSAGE TEXT ---
${sourcedContent.fullText}
`;

  // Add figure captions (always include as text, even when images are sent)
  if (figuresWithValidUrls.length > 0) {
    textContent += '\n--- FIGURE CAPTIONS ---\n';
    figuresWithValidUrls.forEach((fig, i) => {
      textContent += `${fig.id}: ${fig.caption}\n\n`;
    });
    textContent += `\nIMPORTANT: At least ${Math.min(2, figuresWithValidUrls.length)} questions MUST require interpreting data from the figures above.\n`;
  }

  // Add output schema
  textContent += `
Respond ONLY with JSON in this exact schema:
{
  "passage_text": "A refined, AAMC-style passage (700-1000 words) based on the source material above. Write it as a highly detailed, multi-paragraph scientific research summary suitable for the MCAT. Do NOT copy verbatim.",
  "questions_array": [
    {
      "stem": "The question text. For figure questions, start with 'Based on Figure 1...' or 'According to Figure 2...'",
      "choices": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." },
        { "label": "C", "text": "..." },
        { "label": "D", "text": "..." }
      ],
      "correctAnswer": "A",
      "explanation": "Detailed AAMC-style explanation. Reference figures with 'As seen in Figure 1...'",
      "distractorExplanations": {
        "A": "Why this is wrong (omit for correct answer)",
        "B": "Why this is wrong",
        "C": "Why this is wrong",
        "D": "Why this is wrong"
      },
      "requiresFigure": true,
      "referencedFigure": "Figure 1",
      "difficulty": ${targetDifficulty},
      "topic": "${topic}"
    }
  ]
}`;

  // Build the content array with text and optional images
  const contentParts: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> = [];

  // Always add text first
  contentParts.push({ type: 'text', text: textContent });

  // Add images for non-CARS subjects if available
  if (!isCars) {
    for (const fig of figuresWithValidUrls) {
      if (fig.imageUrl) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: fig.imageUrl, detail: 'high' },
        });
      }
    }
  }

  return { role: 'user', content: contentParts };
}

/**
 * Build a text-only fallback prompt when image URLs are unavailable.
 * Embeds figure captions as descriptive text within the passage.
 */
function buildTextOnlyFallbackPrompt(
  sourcedContent: SourcedContent,
  opts: MultimodalGenerateOptions
): string {
  const { subject, topic, targetDifficulty = 1500, questionCount = 5 } = opts;
  const subjectLabel = SUBJECT_LABELS[subject];

  const difficultyLabel =
    targetDifficulty < 1300
      ? 'foundational (1200-1300 ELO)'
      : targetDifficulty < 1600
        ? 'intermediate (1400-1600 ELO)'
        : 'advanced (1700+ ELO)';

  let prompt = `Generate ${questionCount} ${subjectLabel} MCAT questions at ${difficultyLabel} difficulty.
Focus topic: ${topic}

--- SOURCE PAPER ---
Title: ${sourcedContent.title}
Authors: ${sourcedContent.authors}

--- PASSAGE TEXT ---
${sourcedContent.fullText}
`;

  // Embed figure captions as text descriptions
  if (sourcedContent.figures.length > 0) {
    prompt += '\n--- FIGURE DESCRIPTIONS (images unavailable, use captions only) ---\n';
    sourcedContent.figures.forEach((fig) => {
      prompt += `${fig.id}: ${fig.caption}\n\n`;
    });
    prompt += 'Generate questions that reference these figure descriptions. Write "Based on the data described in Figure 1..." style questions.\n';
  }

  prompt += `
Respond ONLY with JSON in this exact schema:
{
  "passage_text": "A refined, AAMC-style passage (700-1000 words) based on the source material. Include detailed references to figures as described in the captions. Write as a multi-paragraph scientific research summary. Do NOT copy verbatim.",
  "questions_array": [
    {
      "stem": "The question text",
      "choices": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." },
        { "label": "C", "text": "..." },
        { "label": "D", "text": "..." }
      ],
      "correctAnswer": "A",
      "explanation": "Detailed explanation",
      "distractorExplanations": {
        "A": "Why wrong (omit if correct)",
        "B": "Why wrong",
        "C": "Why wrong",
        "D": "Why wrong"
      },
      "requiresFigure": false,
      "referencedFigure": null,
      "difficulty": ${targetDifficulty},
      "topic": "${topic}"
    }
  ]
}`;

  return prompt;
}

// ---------------------------------------------------------------------------
// Main Generator Function
// ---------------------------------------------------------------------------

/**
 * Generate AAMC-style questions from sourced scientific content using
 * multimodal LLM prompting with Chain-of-Thought vision reasoning.
 *
 * Handles fallback: if figure images fail to load, regenerates with
 * text-only + embedded figure captions.
 */
export async function generateMultimodalQuestions(
  apiKey: string,
  sourcedContent: SourcedContent,
  opts: MultimodalGenerateOptions
): Promise<MultimodalQuestionSet> {
  const {
    subject,
    topic,
    chapter = '',
    modelTier = 'premium',
  } = opts;

  const model = getModelName(modelTier);
  const isCars = subject === 'cars';

  // Validate image URLs for non-CARS subjects
  let validatedFigures = sourcedContent.figures;
  let useMultimodal = false;

  if (!isCars && sourcedContent.figures.length > 0) {
    validatedFigures = await validateFigureUrls(sourcedContent.figures);
    const hasValidImages = validatedFigures.some((f) => f.imageUrl !== null);
    useMultimodal = hasValidImages;
  }

  const systemPrompt = isCars ? CARS_SYSTEM_PROMPT : MULTIMODAL_SYSTEM_PROMPT;

  let messages: Array<Record<string, unknown>>;

  if (useMultimodal) {
    // Multimodal path: send images + text
    const userMessage = buildMultimodalUserPrompt(sourcedContent, opts, validatedFigures);
    messages = [
      { role: 'system', content: systemPrompt },
      userMessage,
    ];
  } else {
    // Text-only fallback: embed figure captions in text
    const userPrompt = buildTextOnlyFallbackPrompt(sourcedContent, opts);
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  console.log(`[MultimodalGen] Generating questions for "${topic}" from ${sourcedContent.pmcId} (multimodal: ${useMultimodal})`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 8000,  // large enough for 4-6 questions with explanations
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  // Parse JSON response
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  let parsed: { passage_text: string; questions_array: MultimodalQuestion[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('[MultimodalGen] Failed to parse LLM response:', cleaned.substring(0, 200));
    throw new Error('Failed to parse multimodal question response from LLM');
  }

  // Validate and enforce minimums
  if (!parsed.questions_array || parsed.questions_array.length === 0) {
    throw new Error('LLM returned no questions');
  }

  // Collect validated image URLs
  const imageUrls = validatedFigures
    .filter((f) => f.imageUrl !== null)
    .map((f) => f.imageUrl as string);

  return {
    passage_text: parsed.passage_text || sourcedContent.fullText,
    image_urls: imageUrls,
    source_metadata: {
      pmcId: sourcedContent.pmcId,
      title: sourcedContent.title,
      authors: sourcedContent.authors,
      license: sourcedContent.license,
    },
    questions_array: parsed.questions_array.map((q) => ({
      ...q,
      topic: q.topic || topic,
      difficulty: q.difficulty || opts.targetDifficulty || 1500,
      distractorExplanations: q.distractorExplanations || {},
      requiresFigure: q.requiresFigure ?? false,
      imageUrls: imageUrls, // Attach the full figure set to every question in the passage block
    })),
    subject_metadata: {
      subject,
      chapter,
      topics: [topic],
    },
  };
}
