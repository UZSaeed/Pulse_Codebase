/**
 * Dummy Question Bank for Spike MCAT Prep
 *
 * Provides pre-built questions across all 4 MCAT subjects, tagged by
 * subject AND chapter, for testing without an OpenAI API key.
 *
 * Each question includes per-distractor explanations.
 */

import type { McatSubject } from './elo';

export interface DummyQuestion {
  id: string;
  subject: McatSubject;
  chapterId: string;
  topic: string;
  passage: string | null;
  stem: string;
  choices: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  distractorExplanations: Record<string, string>;
  difficulty: number;
}

export const DUMMY_QUESTIONS: DummyQuestion[] = [
  // ─── CHEM/PHYS ──────────────────────────────────────────────
  {
    id: 'cp-001',
    subject: 'chem_phys',
    chapterId: 'cp-gen-chem',
    topic: 'Acids & Bases',
    passage: null,
    stem: 'Which of the following solutions would have the lowest pH?',
    choices: [
      { label: 'A', text: '0.1 M NaOH' },
      { label: 'B', text: '0.1 M HCl' },
      { label: 'C', text: '0.1 M CH₃COOH' },
      { label: 'D', text: '0.1 M NaCl' },
    ],
    correctAnswer: 'B',
    explanation: 'HCl is a strong acid that fully dissociates in water, producing the highest concentration of H⁺ ions at 0.1 M. This gives a pH of 1, which is the lowest among all options.',
    distractorExplanations: {
      A: 'NaOH is a strong base (high pH, not low). A 0.1 M NaOH solution would have a pH of 13.',
      C: 'Acetic acid (CH₃COOH) is a weak acid — it only partially dissociates, so its pH would be higher than that of 0.1 M HCl (around pH 2.9).',
      D: 'NaCl is a neutral salt formed from a strong acid and strong base. Its solution has a pH of approximately 7.',
    },
    difficulty: 1300,
  },
  {
    id: 'cp-002',
    subject: 'chem_phys',
    chapterId: 'cp-physics',
    topic: 'Kinematics',
    passage: null,
    stem: 'A ball is thrown vertically upward with an initial velocity of 20 m/s. Ignoring air resistance, what is the maximum height reached by the ball? (g = 10 m/s²)',
    choices: [
      { label: 'A', text: '10 m' },
      { label: 'B', text: '20 m' },
      { label: 'C', text: '30 m' },
      { label: 'D', text: '40 m' },
    ],
    correctAnswer: 'B',
    explanation: 'Using v² = v₀² − 2gh, at maximum height v = 0: 0 = (20)² − 2(10)h → h = 400/20 = 20 m.',
    distractorExplanations: {
      A: 'This would be the result if the initial velocity were about 14.1 m/s, or if you used an incorrect formula.',
      C: 'This is too large — it would require an initial velocity of ~24.5 m/s at g = 10 m/s².',
      D: 'This answer doubles the correct value, possibly from forgetting to divide by 2 in the kinematic equation.',
    },
    difficulty: 1400,
  },
  {
    id: 'cp-003',
    subject: 'chem_phys',
    chapterId: 'cp-orgo',
    topic: 'Nucleophiles & Electrophiles',
    passage: 'In an SN2 reaction, a strong nucleophile attacks a substrate from the back side, inverting the stereochemistry at the carbon center. The rate of the reaction depends on both the concentration of the nucleophile and the substrate.',
    stem: 'Which of the following would be the best nucleophile in a polar aprotic solvent?',
    choices: [
      { label: 'A', text: 'H₂O' },
      { label: 'B', text: 'CH₃OH' },
      { label: 'C', text: 'CN⁻' },
      { label: 'D', text: 'CH₃COOH' },
    ],
    correctAnswer: 'C',
    explanation: 'CN⁻ is a strong nucleophile due to its negative charge and the high electronegativity of nitrogen. In polar aprotic solvents, it is not stabilized by hydrogen bonding, making it an excellent nucleophile for SN2 reactions.',
    distractorExplanations: {
      A: 'Water is a weak nucleophile because it is neutral and a protic solvent. It favors SN1 reactions instead.',
      B: 'Methanol is a weak nucleophile, similar to water. It is neutral and protic.',
      D: 'Acetic acid is an even weaker nucleophile than water and would act as a proton donor instead.',
    },
    difficulty: 1500,
  },
  {
    id: 'cp-004',
    subject: 'chem_phys',
    chapterId: 'cp-biochem',
    topic: 'Enzymes',
    passage: null,
    stem: 'A competitive inhibitor of an enzyme would be expected to:',
    choices: [
      { label: 'A', text: 'Decrease Vmax and increase Km' },
      { label: 'B', text: 'Increase Km without changing Vmax' },
      { label: 'C', text: 'Decrease both Km and Vmax' },
      { label: 'D', text: 'Increase Vmax without changing Km' },
    ],
    correctAnswer: 'B',
    explanation: 'A competitive inhibitor competes with the substrate for the active site. It can be overcome by increasing substrate concentration, so Vmax remains unchanged. However, more substrate is needed to reach half-Vmax, so the apparent Km increases.',
    distractorExplanations: {
      A: 'This describes a mixed inhibitor. Competitive inhibition does not change Vmax.',
      C: 'Competitive inhibition increases Km, not decreases it. This pattern does not match any standard inhibition type.',
      D: 'No standard inhibitor increases Vmax. This answer has the Vmax change backwards.',
    },
    difficulty: 1500,
  },

  // ─── CARS ───────────────────────────────────────────────────
  {
    id: 'cars-001',
    subject: 'cars',
    chapterId: 'cars-comprehension',
    topic: 'Main Idea',
    passage: 'The concept of artistic originality has undergone significant revision over the past century. What was once considered a divine gift — the ability to create something entirely new — is now understood by many scholars as a sophisticated form of recombination. Artists do not create in a vacuum; they draw on cultural memories, existing works, and shared human experiences. The Romantic ideal of the solitary genius, working in isolation to produce unprecedented masterpieces, has given way to a more collaborative and iterative understanding of creativity.',
    stem: 'The primary purpose of this passage is to:',
    choices: [
      { label: 'A', text: 'Argue that modern artists lack originality compared to their predecessors' },
      { label: 'B', text: 'Describe how the understanding of artistic originality has evolved' },
      { label: 'C', text: 'Criticize the Romantic ideal of the solitary genius' },
      { label: 'D', text: 'Propose a new theory of artistic creation' },
    ],
    correctAnswer: 'B',
    explanation: 'The passage traces a shift in how artistic originality is understood — from a "divine gift" creating something "entirely new" to "a sophisticated form of recombination." The passage describes this evolution neutrally.',
    distractorExplanations: {
      A: 'The passage does not make a value judgment that modern artists are less original. It describes a change in understanding, not a decline in quality.',
      C: 'While the Romantic ideal is mentioned, the passage does not criticize it — it merely notes that scholarly understanding has shifted.',
      D: 'The passage describes an existing scholarly understanding, not a novel theory proposed by the author.',
    },
    difficulty: 1400,
  },
  {
    id: 'cars-002',
    subject: 'cars',
    chapterId: 'cars-within',
    topic: 'Evaluating Arguments',
    passage: 'Critics of universal basic income (UBI) programs frequently cite the risk of inflation and reduced workforce participation. However, recent pilot studies in Finland, Kenya, and Stockton, California, have shown minimal inflationary effects and, in several cases, increased entrepreneurial activity among recipients. These findings suggest that the theoretical criticisms may not fully account for behavioral responses observed in practice.',
    stem: 'The author\'s argument would be most weakened by which of the following?',
    choices: [
      { label: 'A', text: 'Evidence that UBI pilot programs are too small to produce measurable inflation' },
      { label: 'B', text: 'A study showing that UBI increases consumer spending on local goods' },
      { label: 'C', text: 'Data demonstrating that larger-scale UBI programs do produce significant inflation' },
      { label: 'D', text: 'A philosophical argument against wealth redistribution' },
    ],
    correctAnswer: 'A',
    explanation: 'The author uses pilot study results to dismiss inflation concerns. If the pilot studies were too small to produce measurable inflation in the first place, this critically undermines the author\'s evidence — the lack of inflation would be due to scale, not proof that inflation won\'t occur at full implementation.',
    distractorExplanations: {
      B: 'This would actually support the author\'s argument by showing positive economic activity from UBI.',
      C: 'While this seems weakening, it would actually support the critics\' position directly rather than specifically undermining the author\'s reasoning — it contradicts but doesn\'t expose a flaw in the logical structure.',
      D: 'A philosophical argument is less relevant than empirical evidence and does not target the author\'s evidence-based reasoning.',
    },
    difficulty: 1600,
  },
  {
    id: 'cars-003',
    subject: 'cars',
    chapterId: 'cars-beyond',
    topic: 'Applying Passage Ideas',
    passage: null,
    stem: 'Based on the previous passage about artistic originality, which of the following would the author most likely agree with?',
    choices: [
      { label: 'A', text: 'A musician who samples older songs is engaging in a legitimate creative process' },
      { label: 'B', text: 'Plagiarism and artistic recombination are effectively the same thing' },
      { label: 'C', text: 'Only classically trained artists can achieve true originality' },
      { label: 'D', text: 'Art created with AI assistance cannot be considered original' },
    ],
    correctAnswer: 'A',
    explanation: 'The passage argues that creativity is a form of recombination drawing on existing cultural materials. A musician sampling older songs fits perfectly with this view of creativity as sophisticated recombination.',
    distractorExplanations: {
      B: 'The passage distinguishes between drawing on existing works creatively and simply copying — recombination implies transformation.',
      C: 'The passage explicitly moves away from the Romantic ideal that privileges certain types of artistic background.',
      D: 'The passage\'s view of creativity as recombination would likely be open to new tools for creative expression.',
    },
    difficulty: 1550,
  },

  // ─── BIO/BIOCHEM ────────────────────────────────────────────
  {
    id: 'bb-001',
    subject: 'bio_biochem',
    chapterId: 'bb-cell-bio',
    topic: 'Cell Transport',
    passage: null,
    stem: 'A red blood cell is placed in a hypertonic solution. Which of the following outcomes is most likely?',
    choices: [
      { label: 'A', text: 'The cell will swell and eventually lyse' },
      { label: 'B', text: 'The cell will crenate as water moves out via osmosis' },
      { label: 'C', text: 'The cell will remain unchanged' },
      { label: 'D', text: 'The cell will actively pump solutes outward to equilibrate' },
    ],
    correctAnswer: 'B',
    explanation: 'In a hypertonic solution, the extracellular environment has a higher solute concentration than the intracellular space. Water moves out of the cell via osmosis down its concentration gradient, causing the cell to shrink (crenate).',
    distractorExplanations: {
      A: 'Swelling and lysis (hemolysis) occurs in a hypotonic solution, where water moves INTO the cell. This is the opposite scenario.',
      C: 'The cell would only remain unchanged in an isotonic solution where solute concentrations are equal.',
      D: 'Red blood cells do not have the ability to actively pump solutes outward to compensate for tonicity changes in this way. Osmosis is a passive process.',
    },
    difficulty: 1300,
  },
  {
    id: 'bb-002',
    subject: 'bio_biochem',
    chapterId: 'bb-molecular',
    topic: 'Transcription',
    passage: 'RNA polymerase II is responsible for transcribing messenger RNA (mRNA) from a DNA template in eukaryotic cells. The enzyme reads the template strand in the 3\' → 5\' direction and synthesizes the mRNA in the 5\' → 3\' direction. Transcription initiation requires the assembly of general transcription factors at the promoter region, including the TATA-binding protein (TBP).',
    stem: 'If a mutation eliminates the TATA box from a gene\'s promoter, the most likely effect would be:',
    choices: [
      { label: 'A', text: 'Increased rate of transcription due to reduced regulation' },
      { label: 'B', text: 'Normal transcription proceeding from an alternative start site' },
      { label: 'C', text: 'Significantly reduced or absent transcription of the gene' },
      { label: 'D', text: 'Normal transcription but with incorrect mRNA processing' },
    ],
    correctAnswer: 'C',
    explanation: 'The TATA box is a critical promoter element where TBP binds, enabling the assembly of the pre-initiation complex. Without it, RNA polymerase II cannot be properly recruited to the promoter, resulting in significantly reduced or absent transcription.',
    distractorExplanations: {
      A: 'Removing a promoter element would impair transcription, not enhance it. Promoters are required for initiation, not inhibition.',
      B: 'While some genes have alternative promoters, the loss of the TATA box typically leads to a major reduction in transcription rather than seamless compensation.',
      D: 'The TATA box affects transcription initiation, not mRNA processing. Processing involves the 5\' cap, splicing, and polyadenylation.',
    },
    difficulty: 1500,
  },
  {
    id: 'bb-003',
    subject: 'bio_biochem',
    chapterId: 'bb-genetics',
    topic: 'Hardy-Weinberg',
    passage: null,
    stem: 'In a population in Hardy-Weinberg equilibrium, the frequency of the homozygous recessive genotype (aa) is 0.09. What is the frequency of heterozygous carriers (Aa)?',
    choices: [
      { label: 'A', text: '0.21' },
      { label: 'B', text: '0.42' },
      { label: 'C', text: '0.49' },
      { label: 'D', text: '0.30' },
    ],
    correctAnswer: 'B',
    explanation: 'If q² = 0.09, then q = 0.3 and p = 1 − 0.3 = 0.7. The heterozygous frequency is 2pq = 2(0.7)(0.3) = 0.42.',
    distractorExplanations: {
      A: 'This is pq (0.7 × 0.3 = 0.21), which forgets the factor of 2. Heterozygotes can be Aa or aA, so you must multiply by 2.',
      C: 'This is p² = (0.7)² = 0.49, which is the homozygous dominant (AA) frequency, not the heterozygous frequency.',
      D: 'This is simply q = 0.3, the allele frequency, not the genotype frequency for heterozygotes.',
    },
    difficulty: 1400,
  },
  {
    id: 'bb-004',
    subject: 'bio_biochem',
    chapterId: 'bb-biochem',
    topic: 'Glycolysis & Gluconeogenesis',
    passage: null,
    stem: 'Which of the following enzymes catalyzes the rate-limiting step of glycolysis?',
    choices: [
      { label: 'A', text: 'Hexokinase' },
      { label: 'B', text: 'Phosphofructokinase-1 (PFK-1)' },
      { label: 'C', text: 'Pyruvate kinase' },
      { label: 'D', text: 'Aldolase' },
    ],
    correctAnswer: 'B',
    explanation: 'PFK-1 catalyzes the phosphorylation of fructose-6-phosphate to fructose-1,6-bisphosphate and is the committed, rate-limiting step of glycolysis. It is allosterically activated by AMP and fructose-2,6-bisphosphate, and inhibited by ATP and citrate.',
    distractorExplanations: {
      A: 'Hexokinase is the first enzyme of glycolysis and is irreversible, but it is not the rate-limiting step. It is inhibited by its product (glucose-6-phosphate).',
      C: 'Pyruvate kinase catalyzes the last step of glycolysis and is regulated, but PFK-1 is the committed rate-limiting step.',
      D: 'Aldolase cleaves fructose-1,6-bisphosphate into two 3-carbon molecules. It is not a regulatory enzyme.',
    },
    difficulty: 1450,
  },

  // ─── PSYCH/SOC ──────────────────────────────────────────────
  {
    id: 'ps-001',
    subject: 'psych_soc',
    chapterId: 'ps-behavior',
    topic: 'Classical Conditioning',
    passage: null,
    stem: 'A patient who previously received chemotherapy that caused nausea now feels nauseous upon entering the hospital. In this example, what is the conditioned stimulus (CS)?',
    choices: [
      { label: 'A', text: 'The chemotherapy drug' },
      { label: 'B', text: 'The nausea felt during treatment' },
      { label: 'C', text: 'The hospital environment' },
      { label: 'D', text: 'The nausea felt upon entering the hospital' },
    ],
    correctAnswer: 'C',
    explanation: 'The hospital environment was initially a neutral stimulus that became associated with the chemotherapy (UCS) and nausea (UCR). After conditioning, the hospital alone triggers nausea, making it the conditioned stimulus (CS).',
    distractorExplanations: {
      A: 'The chemotherapy drug is the unconditioned stimulus (UCS) — it naturally and automatically produces nausea without prior learning.',
      B: 'The nausea during treatment is the unconditioned response (UCR) — the natural, unlearned reaction to the chemotherapy.',
      D: 'The nausea upon entering the hospital is the conditioned response (CR) — the learned reaction to the conditioned stimulus.',
    },
    difficulty: 1350,
  },
  {
    id: 'ps-002',
    subject: 'psych_soc',
    chapterId: 'ps-cognition',
    topic: 'Memory',
    passage: 'Working memory is a cognitive system with a limited capacity that temporarily holds information available for processing. Baddeley\'s model proposes four components: the central executive, the phonological loop, the visuospatial sketchpad, and the episodic buffer.',
    stem: 'A student is trying to remember a phone number by repeating it aloud. Which component of working memory is primarily being used?',
    choices: [
      { label: 'A', text: 'Central executive' },
      { label: 'B', text: 'Phonological loop' },
      { label: 'C', text: 'Visuospatial sketchpad' },
      { label: 'D', text: 'Episodic buffer' },
    ],
    correctAnswer: 'B',
    explanation: 'The phonological loop handles verbal and acoustic information through rehearsal. Repeating a phone number aloud is a classic example of articulatory rehearsal within the phonological loop.',
    distractorExplanations: {
      A: 'The central executive is the supervisory system that directs attention and coordinates information flow between components. It does not directly store or rehearse information.',
      C: 'The visuospatial sketchpad processes visual and spatial information (mental images, spatial layouts), not auditory/verbal rehearsal.',
      D: 'The episodic buffer integrates information from different sources and from long-term memory. Simple verbal rehearsal does not primarily engage this component.',
    },
    difficulty: 1400,
  },
  {
    id: 'ps-003',
    subject: 'psych_soc',
    chapterId: 'ps-identity',
    topic: 'Attribution Theory',
    passage: null,
    stem: 'A manager attributes an employee\'s poor performance to laziness rather than considering that the employee is dealing with a family emergency. This is an example of:',
    choices: [
      { label: 'A', text: 'Self-serving bias' },
      { label: 'B', text: 'Fundamental attribution error' },
      { label: 'C', text: 'Just-world hypothesis' },
      { label: 'D', text: 'Actor-observer bias' },
    ],
    correctAnswer: 'B',
    explanation: 'The fundamental attribution error is the tendency to overemphasize internal/dispositional factors (laziness) and underestimate external/situational factors (family emergency) when explaining others\' behavior.',
    distractorExplanations: {
      A: 'Self-serving bias involves attributing your OWN successes to internal factors and failures to external factors. This scenario involves judging someone else.',
      C: 'The just-world hypothesis is the belief that people get what they deserve. While related, the scenario specifically illustrates attributing behavior to disposition over situation.',
      D: 'Actor-observer bias is the tendency to attribute your own actions to situational factors but others\' actions to dispositional factors. While related, the fundamental attribution error is the more precise term for this overemphasis on disposition.',
    },
    difficulty: 1400,
  },
  {
    id: 'ps-004',
    subject: 'psych_soc',
    chapterId: 'ps-social',
    topic: 'Social Inequality',
    passage: null,
    stem: 'Health disparities in low-income communities are best explained by which sociological concept?',
    choices: [
      { label: 'A', text: 'Medicalization' },
      { label: 'B', text: 'Social determinants of health' },
      { label: 'C', text: 'Sick role theory' },
      { label: 'D', text: 'Labeling theory' },
    ],
    correctAnswer: 'B',
    explanation: 'Social determinants of health are the conditions in which people are born, grow, live, work, and age — including factors like income, education, and access to healthcare. These structural factors drive health disparities across socioeconomic groups.',
    distractorExplanations: {
      A: 'Medicalization refers to the process by which non-medical problems become defined and treated as medical problems. It does not explain income-based health disparities.',
      C: 'Sick role theory (Parsons) describes the social expectations of being ill — rights and obligations of sick individuals. It does not explain systemic disparities.',
      D: 'Labeling theory suggests that being labeled as deviant leads to further deviance. While stigma affects health, it does not broadly explain income-driven health disparities.',
    },
    difficulty: 1350,
  },
];

/**
 * Get questions filtered by subject and optional chapter
 */
export function getDummyQuestions(subject: McatSubject, chapterId?: string, topics?: string[]): DummyQuestion[] {
  return DUMMY_QUESTIONS.filter(
    (q) => q.subject === subject && 
           (!chapterId || q.chapterId === chapterId) &&
           (!topics || topics.length === 0 || topics.includes(q.topic))
  );
}

/**
 * Get a random subset of questions for a practice session
 */
export function getSessionQuestions(
  subject: McatSubject,
  count: number,
  chapterId?: string,
  topics?: string[]
): DummyQuestion[] {
  const pool = getDummyQuestions(subject, chapterId, topics);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
