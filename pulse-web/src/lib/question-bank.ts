import { getOfficialSatSnippets } from './sat-question-bank';
import type { McatSubject } from './elo';

const TOPIC_REFERENCE_LIMIT = 120;

export async function checkAndExpandQuestionBank(subject: McatSubject, topic: string) {
  const references = getOfficialSatSnippets(subject, topic, undefined, TOPIC_REFERENCE_LIMIT);
  return {
    success: true,
    generated: 0,
    referenceCount: references.length,
    type: 'official_reference',
  };
}

export async function checkAndExpandWithSourcedContent(subject: McatSubject, topic: string) {
  return checkAndExpandQuestionBank(subject, topic);
}
