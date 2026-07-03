import officialSnippets from '@/data/sat-official-snippets.json';
import type { McatSubject } from './elo';
import { getDifficultyLabelForElo } from './elo';
import { MCAT_CHAPTERS } from './chapters';

export interface OfficialSatSnippet {
  section: McatSubject;
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourcePdf?: string;
  pageNumber?: number;
  sourceId: string;
  skill?: string;
  prompt: string;
  choices: { label: string; text: string }[];
  correctAnswer?: string;
  rationale?: string;
  usableAsPractice?: boolean;
  rawChoiceCount?: number;
}

export interface PracticeQuestion {
  id: string;
  subject: McatSubject;
  topic: string;
  passage?: string | null;
  stem: string;
  choices: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  distractorExplanations: Record<string, string>;
  difficulty: number;
}

const snippets = officialSnippets as OfficialSatSnippet[];

export function getOfficialSatSnippets(
  subject: McatSubject,
  domain?: string,
  difficulty?: OfficialSatSnippet['difficulty'],
  count: number = 6
): OfficialSatSnippet[] {
  const normalizedDomain = domain?.toLowerCase();
  const resolvedDomain =
    normalizedDomain &&
    MCAT_CHAPTERS[subject].find(
      (chapter) =>
        chapter.name.toLowerCase() === normalizedDomain ||
        chapter.topics.some((topic) => topic.toLowerCase() === normalizedDomain)
    )?.name.toLowerCase();

  return snippets
    .filter((snippet) => snippet.section === subject)
    .filter((snippet) => !resolvedDomain || snippet.domain.toLowerCase() === resolvedDomain)
    .filter((snippet) => !difficulty || snippet.difficulty === difficulty)
    .slice(0, count);
}

export function getOfficialKnowledgeContext(
  subject: McatSubject,
  domain?: string,
  targetElo: number = 1000,
  count: number = 5
): string {
  const difficulty = getDifficultyLabelForElo(targetElo).toLowerCase() as OfficialSatSnippet['difficulty'];
  const examples = getOfficialSatSnippets(subject, domain, difficulty, count);

  return examples
    .map((example, index) => {
      const choices =
        example.choices.length > 0
          ? example.choices.map((choice) => `${choice.label}. ${choice.text}`).join(' | ')
          : 'Choices not extractable from PDF export.';
      return `Example ${index + 1} [${example.domain}, ${example.difficulty}, source ${example.sourceId}]: ${example.prompt}\nChoices: ${choices}`;
    })
    .join('\n\n');
}

export function getQuestionBankSummary(): Record<string, number> {
  return snippets.reduce<Record<string, number>>((acc, snippet) => {
    const key = `${snippet.section}:${snippet.domain}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export const LOCAL_SAT_FALLBACK_QUESTIONS: PracticeQuestion[] = [
  {
    id: 'rw-ii-1',
    subject: 'reading_writing',
    topic: 'Command of Evidence',
    passage:
      'A school district tested whether later start times improved attendance. Two similar high schools were observed for a semester. The school that shifted its first bell later saw a larger increase in average daily attendance than the school that kept its original schedule.',
    stem: 'Which choice best supports the claim that the schedule change may have improved attendance?',
    choices: [
      { label: 'A', text: 'The later-start school showed a larger attendance gain during the same semester.' },
      { label: 'B', text: 'Students at both schools reported liking their teachers.' },
      { label: 'C', text: 'The schools offered a similar number of extracurricular activities.' },
      { label: 'D', text: 'Attendance was tracked electronically instead of on paper.' },
    ],
    correctAnswer: 'A',
    explanation:
      'Choice A directly links the intervention, a later start time, to a stronger attendance outcome than the comparison school, so it is the best evidence for the claim.',
    distractorExplanations: {
      B: 'Teacher preference does not directly support the claim about attendance and start times.',
      C: 'Similar extracurricular offerings may control for outside factors, but they do not themselves support the claim.',
      D: 'A new attendance-tracking method does not show that the schedule change improved attendance.',
    },
    difficulty: 1020,
  },
  {
    id: 'rw-se-1',
    subject: 'reading_writing',
    topic: 'Sentence Boundaries',
    passage: null,
    stem: 'The museum opened a new exhibit on marine fossils, many visitors stayed for the curator\'s lecture afterward.',
    choices: [
      { label: 'A', text: 'fossils, many visitors stayed' },
      { label: 'B', text: 'fossils; many visitors stayed' },
      { label: 'C', text: 'fossils many visitors stayed' },
      { label: 'D', text: 'fossils and many visitors stayed' },
    ],
    correctAnswer: 'B',
    explanation:
      'The sentence contains two independent clauses. A semicolon correctly joins them without a coordinating conjunction.',
    distractorExplanations: {
      A: 'A comma alone creates a comma splice between two independent clauses.',
      C: 'Removing punctuation produces a run-on sentence.',
      D: 'Adding and changes the meaning and still leaves the sentence awkwardly structured.',
    },
    difficulty: 980,
  },
  {
    id: 'rw-cs-1',
    subject: 'reading_writing',
    topic: 'Words in Context',
    passage:
      'Because the biographer relied on newly uncovered letters, her portrait of the artist was more nuanced than earlier accounts.',
    stem: 'As used in the text, what does the word "nuanced" most nearly mean?',
    choices: [
      { label: 'A', text: 'Simplified' },
      { label: 'B', text: 'Detailed' },
      { label: 'C', text: 'Biased' },
      { label: 'D', text: 'Humorous' },
    ],
    correctAnswer: 'B',
    explanation:
      'Nuanced means showing subtle distinctions or complexity. Detailed is the closest match in context.',
    distractorExplanations: {
      A: 'Simplified is the opposite of nuanced.',
      C: 'The sentence does not suggest unfair favoritism or prejudice.',
      D: 'Nothing in the sentence indicates humor.',
    },
    difficulty: 1100,
  },
  {
    id: 'math-alg-1',
    subject: 'math',
    topic: 'Linear Equations in One Variable',
    passage: null,
    stem: 'If 3x + 8 = 29, what is the value of x?',
    choices: [
      { label: 'A', text: '5' },
      { label: 'B', text: '7' },
      { label: 'C', text: '9' },
      { label: 'D', text: '11' },
    ],
    correctAnswer: 'B',
    explanation:
      'Subtract 8 from both sides to get 3x = 21, then divide by 3. Therefore x = 7.',
    distractorExplanations: {
      A: 'Using 5 would make the left side 23, not 29.',
      C: 'Using 9 would make the left side 35.',
      D: 'Using 11 would make the left side 41.',
    },
    difficulty: 960,
  },
  {
    id: 'math-adv-1',
    subject: 'math',
    topic: 'Quadratics',
    passage: null,
    stem: 'Which value of x is a solution to x^2 - 9 = 0?',
    choices: [
      { label: 'A', text: '1' },
      { label: 'B', text: '3' },
      { label: 'C', text: '4' },
      { label: 'D', text: '9' },
    ],
    correctAnswer: 'B',
    explanation:
      'Set x^2 equal to 9, then take square roots. The solutions are x = 3 and x = -3. Of the listed choices, 3 appears.',
    distractorExplanations: {
      A: '1 squared is 1, and 1 - 9 is not 0.',
      C: '4 squared is 16, so it does not satisfy the equation.',
      D: '9 squared is 81, not 9.',
    },
    difficulty: 1160,
  },
  {
    id: 'math-psda-1',
    subject: 'math',
    topic: 'Ratios, Rates, and Proportions',
    passage: null,
    stem: 'A recipe uses 3 cups of flour for every 2 cups of sugar. If a baker uses 12 cups of flour, how many cups of sugar are needed?',
    choices: [
      { label: 'A', text: '6' },
      { label: 'B', text: '8' },
      { label: 'C', text: '9' },
      { label: 'D', text: '18' },
    ],
    correctAnswer: 'B',
    explanation:
      'The flour amount increased by a factor of 4, from 3 to 12, so the sugar amount must also be multiplied by 4. 2 times 4 is 8.',
    distractorExplanations: {
      A: '6 would correspond to multiplying 2 by 3, not 4.',
      C: '9 does not preserve the original 3-to-2 ratio.',
      D: '18 is greater than the flour amount and does not match the ratio.',
    },
    difficulty: 1040,
  },
  {
    id: 'math-geo-1',
    subject: 'math',
    topic: 'Area and Volume',
    passage: null,
    stem: 'A rectangle has length 9 and width 4. What is its area?',
    choices: [
      { label: 'A', text: '13' },
      { label: 'B', text: '18' },
      { label: 'C', text: '36' },
      { label: 'D', text: '72' },
    ],
    correctAnswer: 'C',
    explanation:
      'Area of a rectangle is length times width. 9 multiplied by 4 equals 36.',
    distractorExplanations: {
      A: '13 is the perimeter of half the rectangle, not the area.',
      B: '18 is 9 plus 9, not length times width.',
      D: '72 doubles the correct product.',
    },
    difficulty: 1000,
  },
];

export function getFallbackQuestions(subject: McatSubject, topics?: string[], count: number = 5): PracticeQuestion[] {
  const normalizedTopics = (topics ?? []).map((topic) => topic.toLowerCase());
  const pool = LOCAL_SAT_FALLBACK_QUESTIONS.filter((question) => question.subject === subject).filter(
    (question) => normalizedTopics.length === 0 || normalizedTopics.includes(question.topic.toLowerCase())
  );
  return pool.slice(0, count);
}
