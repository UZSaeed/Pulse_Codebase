/**
 * MCAT Chapter & Sub-chapter structure — based on the official AAMC content outline.
 * Used for chapter-level tagging, manual practice mode, and SRS scheduling.
 */

import type { McatSubject } from './elo';

export interface Chapter {
  id: string;
  name: string;
  topics: string[];
}

export const MCAT_CHAPTERS: Record<McatSubject, Chapter[]> = {
  chem_phys: [
    {
      id: 'cp-gen-chem',
      name: 'General Chemistry',
      topics: ['Atomic Structure', 'Bonding', 'Stoichiometry', 'Solutions', 'Acids & Bases', 'Thermochemistry', 'Equilibrium', 'Kinetics', 'Electrochemistry', 'The Gas Phase', 'Redox Reactions'],
    },
    {
      id: 'cp-physics',
      name: 'Physics',
      topics: ['Kinematics', 'Work & Energy', 'Thermodynamics', 'Fluids', 'Electrostatics', 'Circuits', 'Magnetism', 'Light & Optics', 'Atomic & Nuclear Phenomena', 'Sound & Waves'],
    },
    {
      id: 'cp-orgo',
      name: 'Organic Chemistry',
      topics: ['Bonding & Structure', 'Nomenclature', 'Isomers', 'Nucleophiles & Electrophiles', 'Alcohols & Ethers', 'Aldehydes & Ketones', 'Carboxylic Acids & Derivatives', 'Nitrogen-Containing Compounds', 'Spectroscopy', 'Separations & Lab Techniques'],
    },
    {
      id: 'cp-biochem',
      name: 'Biochemistry',
      topics: ['Amino Acids & Proteins', 'Enzymes', 'Carbohydrate Metabolism', 'Lipids & Lipid Metabolism', 'Biological Membranes', 'DNA & RNA'],
    },
  ],

  cars: [
    {
      id: 'cars-comprehension',
      name: 'Foundations of Comprehension',
      topics: ['Main Idea', 'Tone & Attitude', 'Vocabulary in Context', 'Inferring Meaning', 'Passage Structure'],
    },
    {
      id: 'cars-within',
      name: 'Reasoning Within the Text',
      topics: ['Evaluating Arguments', 'Identifying Assumptions', 'Strengthening & Weakening', 'Logical Structure', 'Rhetorical Analysis'],
    },
    {
      id: 'cars-beyond',
      name: 'Reasoning Beyond the Text',
      topics: ['Applying Passage Ideas', 'New Information Integration', 'Analogical Reasoning', 'Extrapolation', 'Author Response Prediction'],
    },
  ],

  bio_biochem: [
    {
      id: 'bb-cell-bio',
      name: 'Cell Biology',
      topics: ['Cell Theory', 'Organelles', 'Cell Transport', 'Cell Division (Mitosis & Meiosis)', 'Cell Signaling', 'Apoptosis'],
    },
    {
      id: 'bb-molecular',
      name: 'Molecular Biology',
      topics: ['DNA Replication', 'Transcription', 'Translation', 'Gene Expression & Regulation', 'Mutations', 'Biotechnology & Recombinant DNA'],
    },
    {
      id: 'bb-genetics',
      name: 'Genetics & Evolution',
      topics: ['Mendelian Genetics', 'Non-Mendelian Inheritance', 'Hardy-Weinberg', 'Natural Selection', 'Population Genetics', 'Evolutionary Biology'],
    },
    {
      id: 'bb-physiology',
      name: 'Human Physiology',
      topics: ['Nervous System', 'Endocrine System', 'Circulatory System', 'Respiratory System', 'Immune System', 'Renal System', 'GI System', 'Musculoskeletal System', 'Reproductive System', 'Integumentary System'],
    },
    {
      id: 'bb-biochem',
      name: 'Biochemistry',
      topics: ['Amino Acids & Protein Structure', 'Enzymes & Kinetics', 'Glycolysis & Gluconeogenesis', 'Citric Acid Cycle', 'Electron Transport Chain', 'Oxidative Phosphorylation', 'Lipid Metabolism', 'Pentose Phosphate Pathway', 'Hormonal Regulation of Metabolism'],
    },
  ],

  psych_soc: [
    {
      id: 'ps-perception',
      name: 'Sensing & Perception',
      topics: ['Vision', 'Hearing', 'Somatosensation', 'Taste & Smell', 'Sensory Processing', 'Gestalt Principles', 'Attention'],
    },
    {
      id: 'ps-behavior',
      name: 'Behavior & Learning',
      topics: ['Classical Conditioning', 'Operant Conditioning', 'Observational Learning', 'Motivation', 'Emotion', 'Stress & Coping', 'Personality Theories'],
    },
    {
      id: 'ps-cognition',
      name: 'Cognition & Consciousness',
      topics: ['Memory', 'Language', 'Problem Solving', 'Decision Making', 'Intelligence', 'States of Consciousness', 'Sleep & Dreams'],
    },
    {
      id: 'ps-identity',
      name: 'Self & Social Identity',
      topics: ['Self-Concept', 'Social Identity', 'Attitudes', 'Attribution Theory', 'Conformity & Obedience', 'Group Dynamics', 'Stereotypes & Prejudice'],
    },
    {
      id: 'ps-social',
      name: 'Social Structure & Demographics',
      topics: ['Social Inequality', 'Social Stratification', 'Culture', 'Socialization', 'Deviance', 'Healthcare Disparities', 'Globalization'],
    },
  ],
};

/** Flat lookup: chapterId → chapter data */
export function getChapterById(chapterId: string): (Chapter & { subject: McatSubject }) | null {
  for (const [subject, chapters] of Object.entries(MCAT_CHAPTERS)) {
    const found = chapters.find((c) => c.id === chapterId);
    if (found) return { ...found, subject: subject as McatSubject };
  }
  return null;
}
