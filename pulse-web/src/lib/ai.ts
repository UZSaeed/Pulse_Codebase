import { type McatSubject, SUBJECT_LABELS, getDifficultyLabelForElo } from './elo';
import { getOfficialKnowledgeContext } from './sat-question-bank';

export interface GeneratedQuestion {
  id?: string;
  passage?: string | null;
  stem: string;
  choices: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  distractorExplanations: Record<string, string>;
  imageUrls?: string[] | null;
  sourcePmcId?: string | null;
  subject: McatSubject;
  topic: string;
  difficulty: number;
  chapterId?: string;
}

export type ModelTier = 'premium' | 'economy';
type AiProvider = 'openai' | 'gemini';

const MODEL_MAP: Record<ModelTier, string> = {
  premium: 'gpt-4o',
  economy: 'gpt-4o-mini',
};

const GEMINI_MODEL_MAP: Record<ModelTier, string> = {
  premium: 'gemini-2.5-flash',
  economy: 'gemini-2.5-flash',
};

export function selectModelTier(tokensUsedThisMonth: number, monthlyTokenBudget: number): ModelTier {
  return tokensUsedThisMonth >= monthlyTokenBudget ? 'economy' : 'premium';
}

export function getModelName(tier: ModelTier): string {
  return MODEL_MAP[tier];
}

function getGeminiModelName(tier: ModelTier): string {
  return GEMINI_MODEL_MAP[tier];
}

export interface GenerateQuestionOptions {
  subject: McatSubject;
  topic?: string;
  targetDifficulty?: number;
  passageBased?: boolean;
  modelTier?: ModelTier;
  count?: number;
}

const SYSTEM_PROMPT = `You are an expert SAT question writer.

Write original SAT-style questions for the digital SAT.

Requirements:
1. Never copy official College Board wording. Use the official question bank only as structural inspiration.
2. Keep the section and domain accurate:
   - Reading & Writing domains: Information and Ideas, Craft and Structure, Expression of Ideas, Standard English Conventions
   - Math domains: Algebra, Advanced Math, Problem-Solving and Data Analysis, Geometry and Trigonometry
3. Match the requested difficulty:
   - Bronze = easier / foundational SAT difficulty
   - Silver = medium SAT difficulty
   - Gold = harder SAT difficulty
4. Return four answer choices labeled A-D.
5. Return exactly one correct answer.
6. Explain the correct answer clearly and explain why the distractors are wrong.
7. If the question is Reading & Writing, you may include a short text or a small table-style setup if needed.
8. If the question is Math, keep the stem self-contained and SAT-appropriate.

Return valid JSON only.`;

function buildUserPrompt(opts: GenerateQuestionOptions): string {
  const difficulty = opts.targetDifficulty ?? 1000;
  const difficultyLabel = getDifficultyLabelForElo(difficulty);
  const sectionLabel = SUBJECT_LABELS[opts.subject];
  const promptMode =
    opts.subject === 'reading_writing'
      ? 'Prefer short-passage or sentence-editing SAT Reading & Writing style.'
      : 'Prefer concise SAT Math style.';
  const officialContext = getOfficialKnowledgeContext(opts.subject, opts.topic, difficulty, 4);

  return `Create ${opts.count ?? 1} original ${sectionLabel} SAT question(s).

Target domain: ${opts.topic ?? 'Adaptive mixed domain'}
Target proficiency band: ${difficultyLabel}
Target ELO: ${difficulty}
${promptMode}

Use these official SAT question-bank snippets as inspiration for structure, domain fit, and tone. Do not copy them:
${officialContext || 'No local examples available for this filter.'}

Return JSON in this format:
{
  "questions": [
    {
      "passage": "string or null",
      "stem": "question text",
      "choices": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." },
        { "label": "C", "text": "..." },
        { "label": "D", "text": "..." }
      ],
      "correctAnswer": "A",
      "explanation": "clear explanation",
      "distractorExplanations": {
        "B": "why B is wrong",
        "C": "why C is wrong",
        "D": "why D is wrong"
      },
      "topic": "${opts.topic ?? 'Adaptive mixed domain'}",
      "difficulty": ${difficulty}
    }
  ]
}`;
}

export async function generateQuestion(apiKey: string, opts: GenerateQuestionOptions): Promise<GeneratedQuestion> {
  const questions = await generateQuestions(apiKey, { ...opts, count: 1 });
  return questions[0];
}

function parseQuestionResponse(content: string, subject: McatSubject): GeneratedQuestion[] {
  const cleaned = String(content)
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const parsed = JSON.parse(cleaned) as { questions: Omit<GeneratedQuestion, 'subject'>[] };
  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
    : [parsed as unknown as Omit<GeneratedQuestion, 'subject'>];

  return questions.map((question) => ({
    ...question,
    subject,
    passage: question.passage ?? null,
    distractorExplanations: question.distractorExplanations ?? {},
  }));
}

async function generateWithOpenAi(apiKey: string, opts: GenerateQuestionOptions & { count: number }) {
  const model = getModelName(opts.modelTier ?? 'premium');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: Math.min(5000, 1200 * opts.count),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(opts) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return parseQuestionResponse(String(data.choices?.[0]?.message?.content ?? ''), opts.subject);
}

async function generateWithGemini(apiKey: string, opts: GenerateQuestionOptions & { count: number }) {
  const model = getGeminiModelName(opts.modelTier ?? 'premium');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [{ text: buildUserPrompt(opts) }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: Math.min(8192, 1400 * opts.count),
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  const text = String(
    data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('') ?? ''
  );

  return parseQuestionResponse(text, opts.subject);
}

export async function generateQuestions(
  apiKey: string,
  opts: GenerateQuestionOptions & { count: number }
): Promise<GeneratedQuestion[]> {
  const provider: AiProvider = process.env.GEMINI_API_KEY ? 'gemini' : 'openai';
  return provider === 'gemini'
    ? generateWithGemini(apiKey, opts)
    : generateWithOpenAi(apiKey, opts);
}

export interface ExplainChatOptions {
  questionStem: string;
  explanation: string;
  passage?: string | null;
  choices?: unknown;
  userMessage: string;
  modelTier?: ModelTier;
}

export async function explainChat(apiKey: string, opts: ExplainChatOptions): Promise<string> {
  const context = [
    opts.passage ? `Context:\n${opts.passage}` : '',
    `Question:\n${opts.questionStem}`,
    opts.choices ? `Choices:\n${JSON.stringify(opts.choices)}` : '',
    `Current explanation:\n${opts.explanation}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (process.env.GEMINI_API_KEY) {
    const model = getGeminiModelName(opts.modelTier ?? 'economy');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You are a concise, encouraging SAT tutor. Explain only the SAT question or concept the student asks about.',
              },
            ],
          },
          contents: [
            {
              parts: [{ text: `${context}\n\nStudent question:\n${opts.userMessage}` }],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 900,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? '')
        .join('') ?? 'Sorry, I could not generate a response.'
    );
  }

  const model = getModelName(opts.modelTier ?? 'economy');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content:
            'You are a concise, encouraging SAT tutor. Explain only the SAT question or concept the student asks about.',
        },
        {
          role: 'user',
          content: `${context}\n\nStudent question:\n${opts.userMessage}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';
}

export async function validateQuestionScope(): Promise<{ valid: boolean; reason?: string }> {
  return { valid: true };
}
