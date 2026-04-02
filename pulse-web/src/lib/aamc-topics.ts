/**
 * AAMC High-Yield Topic → PMC Search Query Mapping
 *
 * Maps each MCAT topic to optimized PubMed Central search queries.
 * These queries are used by SourcedContentFetcher to find Open Access
 * papers with relevant figures (bar charts, western blots, kinetic plots, etc.)
 *
 * Search terms are designed to:
 *   1. Return papers with experimental data and figures.
 *   2. Target high-yield concepts that appear on the MCAT.
 *   3. Prioritize papers with quantitative results (graphs, charts).
 */

import type { McatSubject } from './elo';

// ---------------------------------------------------------------------------
// Topic → PMC Query Map
// ---------------------------------------------------------------------------

/**
 * Each topic can map to multiple PMC search queries.
 * The fetcher will randomly select one query per request to ensure variety.
 */
export const TOPIC_TO_PMC_QUERIES: Record<string, string[]> = {
  // ─── CHEM/PHYS: General Chemistry ──────────────────────────
  'Atomic Structure': [
    'atomic emission spectroscopy analysis',
    'electron configuration spectral lines',
    'photoelectron spectroscopy atomic orbitals',
  ],
  'Bonding': [
    'chemical bonding molecular orbital theory',
    'intermolecular forces hydrogen bonding analysis',
    'covalent bond polarity electronegativity',
  ],
  Stoichiometry: [
    'stoichiometric analysis limiting reagent',
    'chemical reaction yield optimization',
    'molar ratio calculation chemical synthesis',
  ],
  Solutions: [
    'solution concentration colligative properties',
    'solubility equilibrium precipitation',
    'osmotic pressure biological membrane',
  ],
  'Acids & Bases': [
    'acid-base titration curve analysis',
    'buffer capacity pH regulation biological',
    'Henderson-Hasselbalch equation physiological pH',
  ],
  Thermochemistry: [
    'enthalpy reaction calorimetry measurement',
    'Hess law thermochemical calculation',
    'bond energy reaction enthalpy',
  ],
  Equilibrium: [
    'chemical equilibrium Le Chatelier principle',
    'equilibrium constant temperature dependence',
    'solubility product Ksp precipitation',
  ],
  Kinetics: [
    'reaction kinetics rate law determination',
    'Arrhenius equation activation energy',
    'enzyme kinetics Michaelis-Menten',
  ],
  Electrochemistry: [
    'electrochemical cell galvanic potential',
    'Nernst equation electrode potential',
    'electrolysis Faraday law',
  ],
  'The Gas Phase': [
    'ideal gas law deviation real gas',
    'partial pressure Dalton law mixture',
    'gas kinetic molecular theory',
  ],
  'Redox Reactions': [
    'oxidation reduction reaction biological',
    'redox potential electron transfer chain',
    'oxidizing agent reducing agent reaction',
  ],

  // ─── CHEM/PHYS: Physics ────────────────────────────────────
  Kinematics: [
    'projectile motion biomechanics analysis',
    'acceleration velocity displacement measurement',
    'motion analysis kinematic equations',
  ],
  'Work & Energy': [
    'work energy theorem conservation',
    'potential kinetic energy conversion biological',
    'mechanical energy conservation system',
  ],
  Thermodynamics: [
    'entropy free energy biological thermodynamics',
    'Gibbs free energy spontaneity reaction',
    'second law thermodynamics entropy change',
  ],
  Fluids: [
    'fluid dynamics Bernoulli equation hemodynamics',
    'blood flow viscosity cardiovascular',
    'hydrostatic pressure capillary fluid exchange',
  ],
  Electrostatics: [
    'electric field potential charge distribution',
    'Coulomb law electrostatic interaction',
    'capacitance dielectric membrane potential',
  ],
  Circuits: [
    'electrical circuit resistor parallel series',
    'Ohm law circuit analysis voltage',
    'RC circuit time constant electrophysiology',
  ],
  Magnetism: [
    'magnetic field MRI imaging principle',
    'electromagnetic induction Faraday law',
    'magnetic resonance nuclear spin',
  ],
  'Light & Optics': [
    'refraction lens image formation optics',
    'diffraction interference spectroscopy',
    'UV-Vis absorption spectroscopy analysis',
  ],
  'Atomic & Nuclear Phenomena': [
    'radioactive decay half-life nuclear medicine',
    'PET scan positron emission tomography',
    'nuclear fission fusion energy',
  ],
  'Sound & Waves': [
    'ultrasound wave frequency Doppler effect',
    'acoustic impedance sound transmission tissue',
    'standing wave harmonics resonance',
  ],

  // ─── CHEM/PHYS: Organic Chemistry ─────────────────────────
  'Bonding & Structure': [
    'molecular structure bond angle hybridization',
    'organic compound structural analysis NMR',
    'functional group characterization spectroscopy',
  ],
  Nomenclature: [
    'IUPAC nomenclature organic compound',
    'systematic naming organic molecules',
  ],
  Isomers: [
    'stereoisomerism enantiomer diastereomer chirality',
    'conformational isomer analysis NMR',
    'optical rotation chiral center drug',
  ],
  'Nucleophiles & Electrophiles': [
    'nucleophilic substitution SN1 SN2 mechanism',
    'electrophilic addition reaction alkene',
    'nucleophilicity basicity solvent effect',
  ],
  'Alcohols & Ethers': [
    'alcohol oxidation aldehyde ketone synthesis',
    'ether formation Williamson synthesis',
  ],
  'Aldehydes & Ketones': [
    'aldehyde ketone nucleophilic addition reaction',
    'carbonyl compound reactivity reduction',
  ],
  'Carboxylic Acids & Derivatives': [
    'carboxylic acid ester amide hydrolysis',
    'acyl substitution mechanism nucleophilic',
    'fatty acid carboxylate synthesis',
  ],
  'Nitrogen-Containing Compounds': [
    'amine basicity amino acid nitrogen',
    'amide bond peptide linkage protein',
  ],
  Spectroscopy: [
    'NMR spectroscopy chemical shift structure',
    'IR spectroscopy functional group identification',
    'mass spectrometry molecular ion fragmentation',
  ],
  'Separations & Lab Techniques': [
    'chromatography HPLC separation technique',
    'gel electrophoresis protein purification',
    'distillation extraction separation method',
  ],

  // ─── CHEM/PHYS: Biochemistry ───────────────────────────────
  'Amino Acids & Proteins': [
    'amino acid structure protein folding',
    'protein secondary structure alpha helix beta sheet',
    'disulfide bond protein stability',
  ],
  Enzymes: [
    'enzyme inhibition competitive noncompetitive uncompetitive',
    'enzyme kinetics Km Vmax catalytic efficiency',
    'allosteric regulation enzyme activity',
  ],
  'Carbohydrate Metabolism': [
    'glycolysis gluconeogenesis metabolic pathway',
    'glucose metabolism insulin regulation',
    'carbohydrate catabolism anabolism',
  ],
  'Lipids & Lipid Metabolism': [
    'fatty acid oxidation beta-oxidation',
    'lipid metabolism cholesterol synthesis',
    'phospholipid membrane bilayer',
  ],
  'Biological Membranes': [
    'membrane transport channel protein',
    'cell membrane fluidity cholesterol',
    'signal transduction membrane receptor',
  ],
  'DNA & RNA': [
    'DNA replication polymerase fidelity',
    'RNA processing splicing mRNA',
    'reverse transcription RT-PCR',
  ],

  // ─── BIO/BIOCHEM: Cell Biology ─────────────────────────────
  'Cell Theory': [
    'cell biology organelle function ultrastructure',
    'prokaryotic eukaryotic cell comparison',
  ],
  Organelles: [
    'mitochondria function electron microscopy',
    'endoplasmic reticulum Golgi protein trafficking',
    'lysosome autophagy cellular degradation',
  ],
  'Cell Transport': [
    'active transport Na-K ATPase pump',
    'osmosis diffusion membrane permeability',
    'vesicular transport endocytosis exocytosis',
  ],
  'Cell Division (Mitosis & Meiosis)': [
    'mitosis cell cycle checkpoint regulation',
    'meiosis crossing over genetic recombination',
    'cell cycle CDK cyclin regulation cancer',
  ],
  'Cell Signaling': [
    'MAPK signaling pathway cell proliferation',
    'G protein coupled receptor signal transduction',
    'receptor tyrosine kinase phosphorylation cascade',
  ],
  Apoptosis: [
    'apoptosis programmed cell death caspase',
    'Bcl-2 family apoptotic pathway mitochondria',
    'apoptosis cancer tumor suppressor p53',
  ],

  // ─── BIO/BIOCHEM: Molecular Biology ────────────────────────
  'DNA Replication': [
    'DNA replication origin fork helicase polymerase',
    'DNA repair mismatch nucleotide excision',
    'telomere telomerase replication aging',
  ],
  Transcription: [
    'transcription factor promoter RNA polymerase',
    'gene transcription regulation enhancer',
    'epigenetic modification histone acetylation methylation',
  ],
  Translation: [
    'ribosome translation initiation elongation termination',
    'tRNA aminoacyl synthetase codon anticodon',
    'post-translational modification protein',
  ],
  'Gene Expression & Regulation': [
    'gene expression regulation operon lac trp',
    'microRNA gene silencing regulation',
    'CRISPR gene editing expression',
  ],
  Mutations: [
    'point mutation frameshift deletion insertion',
    'missense nonsense mutation protein function',
    'mutation rate DNA damage repair',
  ],
  'Biotechnology & Recombinant DNA': [
    'PCR polymerase chain reaction amplification',
    'gel electrophoresis DNA fragment analysis',
    'recombinant DNA cloning plasmid vector',
  ],

  // ─── BIO/BIOCHEM: Genetics & Evolution ─────────────────────
  'Mendelian Genetics': [
    'Mendelian inheritance dominant recessive cross',
    'monohybrid dihybrid cross Punnett square',
    'autosomal inheritance pattern pedigree',
  ],
  'Non-Mendelian Inheritance': [
    'epistasis polygenic inheritance trait',
    'X-linked inheritance hemophilia color blindness',
    'incomplete dominance codominance genes',
  ],
  'Hardy-Weinberg': [
    'Hardy-Weinberg equilibrium allele frequency population',
    'population genetics gene flow genetic drift',
    'allele frequency selection pressure evolution',
  ],
  'Natural Selection': [
    'natural selection fitness adaptation evolution',
    'directional stabilizing disruptive selection',
    'sexual selection reproductive fitness',
  ],
  'Population Genetics': [
    'population genetics bottleneck founder effect',
    'genetic drift migration gene flow',
    'speciation reproductive isolation mechanism',
  ],
  'Evolutionary Biology': [
    'phylogenetic evolutionary tree comparative anatomy',
    'homologous analogous structure evolution',
    'convergent divergent evolution molecular clock',
  ],

  // ─── BIO/BIOCHEM: Human Physiology ─────────────────────────
  'Nervous System': [
    'action potential neuron synapse neurotransmitter',
    'central nervous system brain structure function',
    'peripheral nervous system autonomic parasympathetic',
  ],
  'Endocrine System': [
    'hormone secretion feedback loop endocrine',
    'insulin glucagon glucose homeostasis',
    'thyroid hormone metabolism regulation',
  ],
  'Circulatory System': [
    'cardiac output blood pressure hemodynamics',
    'heart rate electrocardiogram ECG analysis',
    'blood flow coronary vascular resistance',
  ],
  'Respiratory System': [
    'gas exchange alveoli oxygen carbon dioxide',
    'hemoglobin oxygen dissociation curve',
    'ventilation perfusion ratio lung function',
  ],
  'Immune System': [
    'immune response T cell B cell antibody',
    'innate adaptive immunity inflammation',
    'antigen presentation MHC cytokine',
  ],
  'Renal System': [
    'kidney nephron filtration reabsorption secretion',
    'glomerular filtration rate creatinine clearance',
    'acid-base balance renal compensation',
  ],
  'GI System': [
    'digestion absorption gastrointestinal enzyme',
    'gut microbiome intestinal barrier function',
    'liver metabolism bile acid secretion',
  ],
  'Musculoskeletal System': [
    'muscle contraction actin myosin sarcomere',
    'skeletal muscle fiber type fatigue',
    'bone remodeling osteoblast osteoclast',
  ],
  'Reproductive System': [
    'reproductive hormone estrogen testosterone cycle',
    'oogenesis spermatogenesis gametogenesis',
    'embryo development implantation placenta',
  ],
  'Integumentary System': [
    'skin barrier function wound healing',
    'melanocyte pigmentation UV radiation',
  ],

  // ─── BIO/BIOCHEM: Biochemistry ─────────────────────────────
  'Amino Acids & Protein Structure': [
    'protein structure determination X-ray crystallography',
    'amino acid sequence protein folding misfolding',
    'protein-protein interaction binding affinity',
  ],
  'Enzymes & Kinetics': [
    'enzyme kinetics inhibition Lineweaver-Burk plot',
    'catalytic mechanism active site substrate specificity',
    'enzyme regulation phosphorylation allosteric',
  ],
  'Glycolysis & Gluconeogenesis': [
    'glycolysis pathway regulation PFK enzyme',
    'gluconeogenesis fasting glucose production liver',
    'Warburg effect cancer cell glycolysis',
  ],
  'Citric Acid Cycle': [
    'TCA cycle citric acid Krebs intermediates',
    'citrate synthase regulation mitochondria',
    'anaplerotic reaction TCA cycle replenishment',
  ],
  'Electron Transport Chain': [
    'electron transport chain complex I II III IV',
    'mitochondrial membrane potential proton gradient',
    'reactive oxygen species superoxide dismutase',
  ],
  'Oxidative Phosphorylation': [
    'ATP synthase oxidative phosphorylation coupling',
    'uncoupling protein thermogenesis brown fat',
    'chemiosmotic theory proton motive force',
  ],
  'Lipid Metabolism': [
    'beta-oxidation fatty acid mitochondria',
    'ketogenesis ketone body metabolism fasting',
    'cholesterol biosynthesis HMG-CoA reductase statin',
  ],
  'Pentose Phosphate Pathway': [
    'pentose phosphate pathway NADPH ribose',
    'glucose-6-phosphate dehydrogenase deficiency',
    'NADPH oxidative stress glutathione',
  ],
  'Hormonal Regulation of Metabolism': [
    'insulin signaling glucose uptake GLUT4',
    'glucagon cAMP glycogenolysis liver',
    'cortisol stress response metabolic regulation',
  ],

  // ─── PSYCH/SOC: Sensing & Perception ───────────────────────
  Vision: [
    'visual perception processing retina cortex',
    'color vision cone rod photoreceptor',
    'visual acuity contrast sensitivity test',
  ],
  Hearing: [
    'auditory processing cochlea frequency discrimination',
    'hearing loss audiometry test result',
    'sound localization binaural auditory cortex',
  ],
  Somatosensation: [
    'somatosensory cortex tactile perception',
    'pain perception nociceptor gate control theory',
  ],
  'Taste & Smell': [
    'olfactory receptor smell perception neural',
    'taste receptor gustation molecular mechanism',
  ],
  'Sensory Processing': [
    'sensory integration multisensory processing brain',
    'signal detection theory psychophysics threshold',
  ],
  'Gestalt Principles': [
    'visual perception Gestalt principles grouping',
    'perceptual organization figure-ground relationship',
  ],
  Attention: [
    'selective attention cognitive control task performance',
    'attentional bias anxiety emotional processing',
    'divided attention multitasking cognitive load',
  ],

  // ─── PSYCH/SOC: Behavior & Learning ────────────────────────
  'Classical Conditioning': [
    'classical conditioning Pavlovian fear response',
    'conditioned stimulus response extinction',
    'taste aversion conditioned learning',
  ],
  'Operant Conditioning': [
    'operant conditioning reinforcement schedule behavior',
    'positive negative reinforcement punishment',
    'token economy behavior modification',
  ],
  'Observational Learning': [
    'observational learning social modeling behavior',
    'mirror neuron imitation social cognition',
  ],
  Motivation: [
    'motivation reward dopamine neural pathway',
    'intrinsic extrinsic motivation self-determination',
    'hunger satiety hypothalamus regulation',
  ],
  Emotion: [
    'emotion regulation amygdala prefrontal cortex',
    'facial expression emotion recognition universal',
    'stress response cortisol HPA axis',
  ],
  'Stress & Coping': [
    'psychological stress coping mechanism health',
    'burnout resilience mental health outcome',
    'stress cortisol cardiovascular risk behavioral',
  ],
  'Personality Theories': [
    'personality trait Big Five psychometric assessment',
    'personality disorder diagnostic assessment',
  ],

  // ─── PSYCH/SOC: Cognition & Consciousness ──────────────────
  Memory: [
    'memory encoding retrieval hippocampus fMRI',
    'working memory cognitive performance aging',
    'long-term memory consolidation sleep',
  ],
  Language: [
    'language processing Broca Wernicke area fMRI',
    'bilingualism cognitive advantage executive function',
    'language acquisition development critical period',
  ],
  'Problem Solving': [
    'problem solving cognitive strategy decision',
    'cognitive bias heuristic judgment decision making',
  ],
  'Decision Making': [
    'decision making risk behavior neuroeconomics',
    'framing effect prospect theory behavioral',
    'cognitive bias anchoring judgment',
  ],
  Intelligence: [
    'intelligence quotient cognitive ability assessment',
    'cognitive development intelligence testing',
    'fluid crystallized intelligence aging',
  ],
  'States of Consciousness': [
    'consciousness awareness altered state',
    'hypnosis meditation consciousness research',
  ],
  'Sleep & Dreams': [
    'sleep stages REM NREM polysomnography EEG',
    'sleep deprivation cognitive performance health',
    'circadian rhythm melatonin sleep regulation',
  ],

  // ─── PSYCH/SOC: Self & Social Identity ─────────────────────
  'Self-Concept': [
    'self-concept self-esteem identity psychological',
    'self-efficacy academic performance outcome',
  ],
  'Social Identity': [
    'social identity group belonging intergroup',
    'identity formation adolescence development',
  ],
  Attitudes: [
    'attitude change persuasion cognitive dissonance',
    'implicit explicit attitude measurement IAT',
  ],
  'Attribution Theory': [
    'attribution theory fundamental error bias',
    'causal attribution social judgment behavior',
  ],
  'Conformity & Obedience': [
    'conformity obedience social influence experiment',
    'group pressure Asch conformity experiment',
    'obedience authority Milgram experiment',
  ],
  'Group Dynamics': [
    'group dynamics team performance social loafing',
    'groupthink decision making organizational',
    'bystander effect diffusion responsibility',
  ],
  'Stereotypes & Prejudice': [
    'stereotype threat performance minority',
    'implicit bias prejudice discrimination racial',
    'intergroup contact prejudice reduction',
  ],

  // ─── PSYCH/SOC: Social Structure & Demographics ────────────
  'Social Inequality': [
    'social determinants health disparities income',
    'socioeconomic status health outcome inequality',
    'health equity access healthcare disparity',
  ],
  'Social Stratification': [
    'social stratification class mobility inequality',
    'income inequality health outcome population',
  ],
  Culture: [
    'cultural influence health behavior practice',
    'cross-cultural psychology collectivism individualism',
  ],
  Socialization: [
    'socialization process identity development',
    'family socialization childhood development',
  ],
  Deviance: [
    'deviance social control labeling theory',
    'substance abuse addiction social factor',
  ],
  'Healthcare Disparities': [
    'healthcare disparity racial ethnic minority',
    'access healthcare rural urban disparity',
    'social determinants health equity intervention',
  ],
  Globalization: [
    'globalization health impact population',
    'global health inequality access medicine',
  ],

  // ─── CARS (text-only, no figure queries needed) ────────────
  'Main Idea': ['humanities philosophy ethics essay analysis'],
  'Tone & Attitude': ['critical analysis rhetoric persuasion essay'],
  'Vocabulary in Context': ['literary criticism textual analysis interpretation'],
  'Inferring Meaning': ['philosophical argument interpretation essay'],
  'Passage Structure': ['essay structure argument analysis rhetoric'],
  'Evaluating Arguments': ['philosophical debate ethics reasoning argument'],
  'Identifying Assumptions': ['logical reasoning assumption critical thinking'],
  'Strengthening & Weakening': ['argument analysis evidence reasoning'],
  'Logical Structure': ['logic reasoning deductive inductive argument'],
  'Rhetorical Analysis': ['rhetoric persuasion analysis speech essay'],
  'Applying Passage Ideas': ['critical reading application interpretation'],
  'New Information Integration': ['information integration reasoning analysis'],
  'Analogical Reasoning': ['analogy reasoning comparative analysis'],
  Extrapolation: ['extrapolation prediction reasoning evidence'],
  'Author Response Prediction': ['author perspective prediction analysis'],
};

// ---------------------------------------------------------------------------
// Helper: Get a random query for a topic
// ---------------------------------------------------------------------------

/**
 * Returns a random PMC search query for the given topic.
 * Falls back to a generic subject-level query if the topic isn't mapped.
 */
export function getRandomPMCQuery(topic: string, subject?: McatSubject): string {
  let baseQuery = '';
  const queries = TOPIC_TO_PMC_QUERIES[topic];
  
  if (queries && queries.length > 0) {
    baseQuery = queries[Math.floor(Math.random() * queries.length)];
  } else {
    // Fallback: generic subject-level queries
    const subjectFallbacks: Record<string, string> = {
      chem_phys: 'general chemistry physics experimental analysis',
      cars: 'humanities social science essay critical analysis',
      bio_biochem: 'biology biochemistry molecular cellular experimental',
      psych_soc: 'psychology sociology behavioral health research',
    };
    baseQuery = subject && subjectFallbacks[subject] ? subjectFallbacks[subject] : 'biomedical research experimental analysis';
  }

  // Do not restrict CARS passages with science filters
  if (subject === 'cars') return baseQuery;

  // ──────────────────────────────────────────────────────────────────────────
  // MCAT SCOPE FILTER v2 — Review Article Targeting + Journal Whitelist
  //
  // Strategy:
  //   1. TARGET review articles — they synthesize foundational knowledge and
  //      read much closer to MCAT passages than primary research papers.
  //   2. WHITELIST journals that publish educational, broad-scope content.
  //   3. INCLUDE terms that bias toward foundational/educational framing.
  //   4. EXCLUDE advanced techniques, niche methodologies, and engineering.
  // ──────────────────────────────────────────────────────────────────────────

  // 1. Review article filter  
  const reviewFilter = `AND "review"[Filter]`;

  // 2. Journal whitelist — broad-scope, educational, foundational journals
  const journalWhitelist = `AND ("PLoS Biol"[Journal] OR "PLoS One"[Journal] OR "J Biol Chem"[Journal] OR "CBE Life Sci Educ"[Journal] OR "Biochem Mol Biol Educ"[Journal] OR "Front Physiol"[Journal] OR "Front Mol Biosci"[Journal] OR "Front Immunol"[Journal] OR "Front Psychol"[Journal] OR "Front Neurosci"[Journal] OR "Int J Mol Sci"[Journal] OR "Molecules"[Journal] OR "Cells"[Journal] OR "Biomolecules"[Journal] OR "Physiol Rev"[Journal] OR "Annu Rev Biochem"[Journal] OR "Trends Biochem Sci"[Journal] OR "Nat Rev Mol Cell Biol"[Journal] OR "Am J Physiol"[Journal] OR "BMC Biol"[Journal] OR "BMC Biochem"[Journal] OR "Sci Rep"[Journal] OR "eLife"[Journal] OR "Proc Natl Acad Sci U S A"[Journal])`;

  // 3. Foundational bias terms
  const foundationalBias = `AND (mechanism OR pathway OR regulation OR physiology OR "basic mechanism" OR fundamental OR homeostasis OR metabolism)`;

  // 4. Comprehensive exclusion of advanced techniques and non-MCAT domains
  const advancedExclusions = `NOT (nanoparticle OR nanomaterial OR "materials science" OR "clinical trial" OR randomized OR "tissue engineering" OR "machine learning" OR "deep learning" OR "artificial intelligence" OR MOF OR ZIF OR electrocatalyst OR Pyrolysis OR encapsulation OR "advanced materials" OR lattice OR "scanning tunneling" OR STM OR semiconductor OR epitaxy OR GaAs OR "quantum dot" OR "solid state" OR "Cryo-EM" OR "cryo-electron" OR "X-ray crystallography" OR "flow cytometry" OR "mass spectrometry imaging" OR "MALDI" OR "single-cell sequencing" OR "RNA-seq" OR "ChIP-seq" OR "ATAC-seq" OR optogenetics OR "super-resolution" OR "confocal microscopy" OR "atomic force microscopy" OR AFM OR "surface plasmon" OR FRET OR "fluorescence lifetime" OR "next-generation sequencing" OR "whole-genome sequencing" OR proteomics OR metabolomics OR lipidomics OR "systems biology" OR bioinformatics OR "computational biology" OR "molecular dynamics simulation" OR "in silico" OR "CRISPR screen" OR "knockout mouse" OR "transgenic mouse" OR "gene therapy" OR "CAR-T" OR immunotherapy OR "checkpoint inhibitor" OR "monoclonal antibody therapy" OR "phase III" OR "phase II" OR pharmacokinetics OR "drug delivery" OR "nanocarrier" OR biofilm OR "quorum sensing")`;

  return `${baseQuery} ${reviewFilter} ${journalWhitelist} ${foundationalBias} ${advancedExclusions}`;
}

// ---------------------------------------------------------------------------
// Figure type priority for MCAT
// ---------------------------------------------------------------------------

/** Figure types prioritized for MCAT question creation, in order of preference */
export const FIGURE_TYPE_PRIORITY = [
  'bar_chart',
  'line_graph',
  'western_blot',
  'flowchart',
  'other',
] as const;

export type FigureType = (typeof FIGURE_TYPE_PRIORITY)[number];
