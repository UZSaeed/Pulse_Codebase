/**
 * SAT section/domain/skill map.
 *
 * We keep the legacy export names so the UI can migrate with fewer moving parts.
 */

import type { SatSection } from './elo';

export interface Chapter {
  id: string;
  name: string;
  topics: string[];
}

export const MCAT_CHAPTERS: Record<SatSection, Chapter[]> = {
  reading_writing: [
    {
      id: 'rw-information-ideas',
      name: 'Information and Ideas',
      topics: [
        'Central Ideas and Details',
        'Command of Evidence',
        'Inferences',
        'Data Interpretation',
      ],
    },
    {
      id: 'rw-craft-structure',
      name: 'Craft and Structure',
      topics: [
        'Words in Context',
        'Text Structure and Purpose',
        'Cross-Text Connections',
        'Rhetorical Synthesis',
      ],
    },
    {
      id: 'rw-expression-ideas',
      name: 'Expression of Ideas',
      topics: [
        'Transitions',
        'Rhetorical Revision',
        'Organization',
        'Precision and Concision',
      ],
    },
    {
      id: 'rw-standard-english-conventions',
      name: 'Standard English Conventions',
      topics: [
        'Sentence Boundaries',
        'Form, Structure, and Sense',
        'Usage',
        'Punctuation',
      ],
    },
  ],
  math: [
    {
      id: 'math-algebra',
      name: 'Algebra',
      topics: [
        'Linear Equations in One Variable',
        'Linear Equations in Two Variables',
        'Linear Functions',
        'Systems of Linear Equations',
        'Linear Inequalities',
      ],
    },
    {
      id: 'math-advanced-math',
      name: 'Advanced Math',
      topics: [
        'Equivalent Expressions',
        'Nonlinear Equations',
        'Nonlinear Functions',
        'Quadratics',
        'Exponential Models',
      ],
    },
    {
      id: 'math-problem-solving-data-analysis',
      name: 'Problem-Solving and Data Analysis',
      topics: [
        'Ratios, Rates, and Proportions',
        'Percentages',
        'One-Variable Data',
        'Two-Variable Data',
        'Probability and Inference',
      ],
    },
    {
      id: 'math-geometry-trigonometry',
      name: 'Geometry and Trigonometry',
      topics: [
        'Area and Volume',
        'Lines, Angles, and Triangles',
        'Right Triangles and Trigonometry',
        'Circles',
        'Coordinate Geometry',
      ],
    },
  ],
};

export function getChapterById(chapterId: string): (Chapter & { subject: SatSection }) | null {
  for (const [subject, chapters] of Object.entries(MCAT_CHAPTERS)) {
    const found = chapters.find((chapter) => chapter.id === chapterId);
    if (found) {
      return { ...found, subject: subject as SatSection };
    }
  }
  return null;
}

export function getAllSatDomains(): Array<Chapter & { subject: SatSection }> {
  return Object.entries(MCAT_CHAPTERS).flatMap(([subject, chapters]) =>
    chapters.map((chapter) => ({ ...chapter, subject: subject as SatSection }))
  );
}
