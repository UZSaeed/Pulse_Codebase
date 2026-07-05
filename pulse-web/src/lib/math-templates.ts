/**
 * Parameterized SAT Math question templates.
 *
 * Each template describes one question "shape" per domain × difficulty band.
 * Numbers are placeholders drawn from a seeded RNG, the answer is computed,
 * and distractors encode the most common student errors — so one template
 * yields hundreds of distinct-but-sound questions without an LLM call.
 *
 * Graph-based templates emit a GraphSpec that the client renders with the
 * function-plot library (no AI image generation).
 */

import { MCAT_CHAPTERS } from './chapters';

export type DifficultyBand = 'easy' | 'medium' | 'hard';

/** Rendered client-side by <MathGraph /> using function-plot. */
export interface GraphSpec {
  kind: 'function-plot';
  xDomain: [number, number];
  yDomain: [number, number];
  data: Array<{
    fn?: string;
    points?: [number, number][];
    fnType?: 'points';
    graphType?: 'polyline' | 'scatter';
    color?: string;
  }>;
  caption?: string;
}

export interface MathTemplateQuestion {
  templateId: string;
  seed: number;
  subject: 'math';
  domain: string;
  topic: string;
  difficultyBand: DifficultyBand;
  difficulty: number;
  stem: string;
  choices: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  distractorExplanations: Record<string, string>;
  graphSpec?: GraphSpec;
}

/** Deterministic PRNG (mulberry32) so templateId + seed always reproduces the same question. */
function createRng(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** Integer in [min, max] inclusive. */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    shuffle: <T>(items: T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

type Rng = ReturnType<typeof createRng>;

interface TemplateOutput {
  stem: string;
  answer: { value: string; explanation: string };
  distractors: { value: string; why: string }[];
  graphSpec?: GraphSpec;
}

interface MathTemplate {
  id: string;
  chapterId: string;
  topic: string;
  band: DifficultyBand;
  generate: (rng: Rng) => TemplateOutput;
}

const fmt = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

/** Band → ELO anchor aligned with the Bronze/Silver/Gold tier floors in elo.ts. */
const BAND_ELO: Record<DifficultyBand, { base: number; spread: number }> = {
  easy: { base: 950, spread: 120 },
  medium: { base: 1300, spread: 160 },
  hard: { base: 1680, spread: 180 },
};

/* ------------------------------------------------------------------ */
/* Algebra                                                             */
/* ------------------------------------------------------------------ */

const algebraTemplates: MathTemplate[] = [
  {
    id: 'alg-linear-one-var',
    chapterId: 'math-algebra',
    topic: 'Linear Equations in One Variable',
    band: 'easy',
    generate: (rng) => {
      const a = rng.int(2, 9);
      const x = rng.int(2, 12);
      const b = rng.int(1, 19);
      const c = a * x + b;
      return {
        stem: `If ${a}x + ${b} = ${c}, what is the value of x?`,
        answer: {
          value: fmt(x),
          explanation: `Subtract ${b} from both sides to get ${a}x = ${c - b}, then divide both sides by ${a}. Therefore x = ${x}.`,
        },
        distractors: [
          { value: fmt(c - b), why: `${c - b} comes from subtracting ${b} but forgetting to divide by ${a}.` },
          { value: fmt(Math.round(((c + b) / a) * 100) / 100), why: `This comes from adding ${b} instead of subtracting it before dividing.` },
          { value: fmt(x + a), why: `This does not satisfy the equation; substituting it back gives ${a * (x + a) + b}, not ${c}.` },
        ],
      };
    },
  },
  {
    id: 'alg-linear-function-eval',
    chapterId: 'math-algebra',
    topic: 'Linear Functions',
    band: 'easy',
    generate: (rng) => {
      const m = rng.int(2, 8);
      const b = rng.int(-9, 9);
      const k = rng.int(2, 9);
      const y = m * k + b;
      const bTerm = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      return {
        stem: `The function f is defined by f(x) = ${m}x ${bTerm}. What is the value of f(${k})?`,
        answer: {
          value: fmt(y),
          explanation: `Substitute x = ${k}: f(${k}) = ${m}(${k}) ${bTerm} = ${m * k} ${bTerm} = ${y}.`,
        },
        distractors: [
          { value: fmt(m * k - b), why: `This flips the sign of the constant term ${b}.` },
          { value: fmt(m + k + b), why: `This adds ${m} and ${k} instead of multiplying them.` },
          { value: fmt(m * (k + b)), why: `This incorrectly adds the constant to x before multiplying by ${m}.` },
        ],
      };
    },
  },
  {
    id: 'alg-system-sum-diff',
    chapterId: 'math-algebra',
    topic: 'Systems of Linear Equations',
    band: 'medium',
    generate: (rng) => {
      const x = rng.int(3, 14);
      const y = rng.int(1, x - 1);
      const s = x + y;
      const d = x - y;
      return {
        stem: `In the system of linear equations below, what is the value of x?\n\nx + y = ${s}\nx − y = ${d}`,
        answer: {
          value: fmt(x),
          explanation: `Add the two equations: 2x = ${s + d}, so x = ${x}. (Then y = ${y}.)`,
        },
        distractors: [
          { value: fmt(y), why: `${y} is the value of y, not x.` },
          { value: fmt(s), why: `${s} is the value of x + y, not x alone.` },
          { value: fmt(s + d), why: `${s + d} equals 2x — the result of adding the equations before dividing by 2.` },
        ],
      };
    },
  },
  {
    id: 'alg-slope-graph',
    chapterId: 'math-algebra',
    topic: 'Linear Equations in Two Variables',
    band: 'medium',
    generate: (rng) => {
      const m = rng.pick([-3, -2, -1, 1, 2, 3] as const);
      const b = rng.int(-4, 4);
      const x1 = rng.int(-4, -1);
      const x2 = rng.int(1, 4);
      const y1 = m * x1 + b;
      const y2 = m * x2 + b;
      return {
        stem: `The graph of a line in the xy-plane is shown. The line passes through the points (${x1}, ${y1}) and (${x2}, ${y2}). What is the slope of the line?`,
        graphSpec: {
          kind: 'function-plot',
          xDomain: [-8, 8],
          yDomain: [-12, 12],
          data: [
            { fn: `${m} * x + ${b}`, color: '#00D8E8' },
            { points: [[x1, y1], [x2, y2]], fnType: 'points', graphType: 'scatter', color: '#facc15' },
          ],
          caption: `Line through (${x1}, ${y1}) and (${x2}, ${y2})`,
        },
        answer: {
          value: fmt(m),
          explanation: `Slope = (y₂ − y₁)/(x₂ − x₁) = (${y2} − ${y1})/(${x2} − ${x1}) = ${y2 - y1}/${x2 - x1} = ${m}.`,
        },
        distractors: [
          { value: fmt(-m), why: `This reverses the sign — it comes from subtracting the coordinates in inconsistent order.` },
          { value: fmt(b), why: `${b} is the y-intercept of the line, not its slope.` },
          {
            value: fmt(Math.round((1 / m) * 100) / 100),
            why: `This is the reciprocal of the slope — dividing the change in x by the change in y instead of the reverse.`,
          },
        ],
      };
    },
  },
  {
    id: 'alg-inequality-budget',
    chapterId: 'math-algebra',
    topic: 'Linear Inequalities',
    band: 'hard',
    generate: (rng) => {
      const cost = rng.int(3, 12);
      const fee = rng.int(5, 30);
      const n = rng.int(6, 24);
      const budget = fee + cost * n + rng.int(0, cost - 1);
      const maxItems = Math.floor((budget - fee) / cost);
      return {
        stem: `A print shop charges a one-time setup fee of $${fee} plus $${cost} per poster. A student club can spend at most $${budget}. What is the maximum number of posters the club can order?`,
        answer: {
          value: fmt(maxItems),
          explanation: `Let p be the number of posters. Then ${fee} + ${cost}p ≤ ${budget}, so p ≤ ${(budget - fee)}/${cost} ≈ ${fmt((budget - fee) / cost)}. The greatest whole number of posters is ${maxItems}.`,
        },
        distractors: [
          { value: fmt(Math.floor(budget / cost)), why: `This ignores the $${fee} setup fee.` },
          { value: fmt(maxItems + 1), why: `Ordering ${maxItems + 1} posters would cost $${fee + cost * (maxItems + 1)}, which exceeds the $${budget} budget.` },
          { value: fmt(Math.max(1, maxItems - 1)), why: `The club can afford more than this — ${maxItems} posters cost only $${fee + cost * maxItems}.` },
        ],
      };
    },
  },
  {
    id: 'alg-system-no-solution',
    chapterId: 'math-algebra',
    topic: 'Systems of Linear Equations',
    band: 'hard',
    generate: (rng) => {
      const a = rng.int(2, 6);
      const b = rng.int(2, 9);
      const mult = rng.int(2, 4);
      const c1 = rng.int(3, 15);
      let c2 = rng.int(3, 40);
      if (c2 === mult * c1) c2 += 1;
      const k = mult * b;
      return {
        stem: `In the system of equations below, k is a constant. If the system has no solution, what is the value of k?\n\n${a}x + ${b}y = ${c1}\n${a * mult}x + ky = ${c2}`,
        answer: {
          value: fmt(k),
          explanation: `A system has no solution when the lines are parallel: coefficients proportional but constants not. Since ${a * mult} = ${mult} × ${a}, we need k = ${mult} × ${b} = ${k}. The constants (${c2} ≠ ${mult} × ${c1}) confirm the lines are distinct.`,
        },
        distractors: [
          { value: fmt(b), why: `k = ${b} matches the first equation's y-coefficient but ignores that the x-coefficient was multiplied by ${mult}.` },
          { value: fmt(mult * a), why: `${mult * a} scales the x-coefficient rather than the y-coefficient.` },
          { value: fmt(k + a), why: `With k = ${k + a} the coefficient ratios differ, so the lines intersect at exactly one point.` },
        ],
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/* Advanced Math                                                       */
/* ------------------------------------------------------------------ */

const advancedTemplates: MathTemplate[] = [
  {
    id: 'adv-quadratic-simple-root',
    chapterId: 'math-advanced-math',
    topic: 'Quadratics',
    band: 'easy',
    generate: (rng) => {
      const n = rng.int(3, 12);
      return {
        stem: `What is the positive solution to the equation x² − ${n * n} = 0?`,
        answer: {
          value: fmt(n),
          explanation: `Add ${n * n} to both sides: x² = ${n * n}. Taking square roots gives x = ${n} or x = −${n}; the positive solution is ${n}.`,
        },
        distractors: [
          { value: fmt(n * n), why: `${n * n} is x², not x.` },
          { value: fmt(Math.round((n * n) / 2)), why: `Dividing ${n * n} by 2 is not the same as taking its square root.` },
          { value: fmt(n + 1), why: `(${n + 1})² = ${(n + 1) * (n + 1)}, which does not equal ${n * n}.` },
        ],
      };
    },
  },
  {
    id: 'adv-exponent-rules',
    chapterId: 'math-advanced-math',
    topic: 'Equivalent Expressions',
    band: 'easy',
    generate: (rng) => {
      const a = rng.int(2, 6);
      const b = rng.int(2, 6);
      return {
        stem: `Which value of k makes the equation (x^${a})(x^${b}) = x^k true for all positive values of x?`,
        answer: {
          value: fmt(a + b),
          explanation: `When multiplying powers with the same base, add the exponents: x^${a} · x^${b} = x^(${a}+${b}) = x^${a + b}.`,
        },
        distractors: [
          { value: fmt(a * b), why: `${a * b} comes from multiplying the exponents, which applies to (x^${a})^${b}, not to a product.` },
          { value: fmt(Math.abs(a - b) === a + b ? a + b + 1 : Math.abs(a - b)), why: `Subtracting exponents applies to division of powers, not multiplication.` },
          { value: fmt(a + b + 1), why: `Adding the exponents gives ${a + b}, not ${a + b + 1}.` },
        ],
      };
    },
  },
  {
    id: 'adv-parabola-vertex',
    chapterId: 'math-advanced-math',
    topic: 'Nonlinear Functions',
    band: 'medium',
    generate: (rng) => {
      const h = rng.int(-5, 5);
      const k = rng.int(-6, 6);
      const sign = rng.pick([1, -1] as const);
      const inner = h >= 0 ? `x − ${h}` : `x + ${Math.abs(h)}`;
      const kTerm = k >= 0 ? `+ ${k}` : `− ${Math.abs(k)}`;
      const lead = sign === 1 ? '' : '−';
      return {
        stem: `The graph of y = ${lead}(${inner})² ${kTerm} is shown in the xy-plane. What are the coordinates of the vertex of the parabola?`,
        graphSpec: {
          kind: 'function-plot',
          xDomain: [h - 7, h + 7],
          yDomain: sign === 1 ? [k - 4, k + 12] : [k - 12, k + 4],
          data: [{ fn: `${sign} * (x - ${h})^2 + ${k}`, color: '#00D8E8' }],
          caption: 'Graph of the parabola',
        },
        answer: {
          value: `(${h}, ${k})`,
          explanation: `Vertex form is y = a(x − h)² + k with vertex (h, k). Here h = ${h} and k = ${k}, so the vertex is (${h}, ${k}).`,
        },
        distractors: [
          { value: `(${-h}, ${k})`, why: `This flips the sign of h — remember the form is (x − h), so (${inner}) means h = ${h}.` },
          { value: `(${h}, ${-k})`, why: `This flips the sign of k; the constant ${kTerm.replace('− ', '-').replace('+ ', '')} is added directly.` },
          { value: `(${k}, ${h})`, why: `This swaps the x- and y-coordinates of the vertex.` },
        ],
      };
    },
  },
  {
    id: 'adv-quadratic-factored-roots',
    chapterId: 'math-advanced-math',
    topic: 'Nonlinear Equations',
    band: 'medium',
    generate: (rng) => {
      const p = rng.int(1, 8);
      let q = rng.int(1, 8);
      if (q === p) q = p + 1;
      const bCoef = -(p + q);
      const cCoef = p * q;
      const bTerm = bCoef >= 0 ? `+ ${bCoef}x` : `− ${Math.abs(bCoef)}x`;
      return {
        stem: `The equation x² ${bTerm} + ${cCoef} = 0 has two solutions. What is the sum of the solutions?`,
        answer: {
          value: fmt(p + q),
          explanation: `The equation factors as (x − ${p})(x − ${q}) = 0, so the solutions are ${p} and ${q}. Their sum is ${p + q}. (Equivalently, the sum of roots equals −b/a = ${p + q}.)`,
        },
        distractors: [
          { value: fmt(cCoef), why: `${cCoef} is the product of the solutions (c/a), not their sum.` },
          { value: fmt(-(p + q)), why: `This is b itself; the sum of roots is −b/a, so the sign must flip.` },
          { value: fmt(Math.abs(p - q)), why: `${Math.abs(p - q)} is the difference of the solutions, not their sum.` },
        ],
      };
    },
  },
  {
    id: 'adv-exponential-growth',
    chapterId: 'math-advanced-math',
    topic: 'Exponential Models',
    band: 'hard',
    generate: (rng) => {
      const p0 = rng.pick([200, 300, 400, 500, 600, 800] as const);
      const d = rng.pick([3, 4, 5, 6] as const);
      const periods = rng.int(2, 4);
      const t = d * periods;
      const result = p0 * Math.pow(2, periods);
      return {
        stem: `A bacteria culture starts with ${p0} cells and doubles every ${d} hours. The population is modeled by P(t) = ${p0} · 2^(t/${d}), where t is time in hours. How many cells will the culture have after ${t} hours?`,
        answer: {
          value: fmt(result),
          explanation: `After ${t} hours the culture has doubled ${t}/${d} = ${periods} times, so P(${t}) = ${p0} · 2^${periods} = ${p0} · ${Math.pow(2, periods)} = ${result}.`,
        },
        distractors: [
          { value: fmt(p0 * 2 * periods), why: `This multiplies by 2 × ${periods} instead of 2^${periods} — doubling is exponential, not linear.` },
          { value: fmt(p0 * Math.pow(2, t)), why: `This doubles every hour (2^${t}) instead of every ${d} hours.` },
          { value: fmt(p0 + Math.pow(2, periods)), why: `This adds 2^${periods} to the starting population instead of multiplying by it.` },
        ],
      };
    },
  },
  {
    id: 'adv-discriminant-one-solution',
    chapterId: 'math-advanced-math',
    topic: 'Quadratics',
    band: 'hard',
    generate: (rng) => {
      const r = rng.int(2, 9);
      const k = 2 * r;
      const c = r * r;
      return {
        stem: `In the equation x² + kx + ${c} = 0, k is a positive constant. If the equation has exactly one real solution, what is the value of k?`,
        answer: {
          value: fmt(k),
          explanation: `Exactly one real solution requires the discriminant to be zero: k² − 4(1)(${c}) = 0, so k² = ${4 * c} and k = ${k} (taking the positive value). The equation becomes (x + ${r})² = 0.`,
        },
        distractors: [
          { value: fmt(r), why: `${r} is the square root of ${c}, but the condition is k² = 4 × ${c}, giving k = ${k}.` },
          { value: fmt(4 * c), why: `${4 * c} is k², not k.` },
          { value: fmt(c), why: `${c} is the constant term c, not the value of k that makes the discriminant zero.` },
        ],
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/* Problem-Solving and Data Analysis                                   */
/* ------------------------------------------------------------------ */

const psdaTemplates: MathTemplate[] = [
  {
    id: 'psda-ratio-scale',
    chapterId: 'math-problem-solving-data-analysis',
    topic: 'Ratios, Rates, and Proportions',
    band: 'easy',
    generate: (rng) => {
      const a = rng.int(2, 6);
      const b = rng.int(2, 9);
      const mult = rng.int(3, 8);
      const contexts = [
        { unitA: 'cups of flour', unitB: 'cups of sugar', item: 'A recipe' },
        { unitA: 'liters of blue paint', unitB: 'liters of yellow paint', item: 'A paint mixture' },
        { unitA: 'pencils', unitB: 'erasers', item: 'A supply kit' },
      ] as const;
      const ctx = rng.pick(contexts);
      return {
        stem: `${ctx.item} uses ${a} ${ctx.unitA} for every ${b} ${ctx.unitB}. If ${a * mult} ${ctx.unitA} are used, how many ${ctx.unitB} are needed?`,
        answer: {
          value: fmt(b * mult),
          explanation: `The amount of ${ctx.unitA.split(' ').pop()} was multiplied by ${mult} (from ${a} to ${a * mult}), so multiply ${b} by the same factor: ${b} × ${mult} = ${b * mult}.`,
        },
        distractors: [
          { value: fmt(a * mult), why: `This repeats the given quantity instead of scaling the second quantity.` },
          { value: fmt(b * mult + b), why: `This scales by ${mult + 1} instead of ${mult}.` },
          { value: fmt(Math.max(1, b * (mult - 1))), why: `This scales by ${mult - 1} instead of ${mult}, breaking the ${a}:${b} ratio.` },
        ],
      };
    },
  },
  {
    id: 'psda-percent-of',
    chapterId: 'math-problem-solving-data-analysis',
    topic: 'Percentages',
    band: 'easy',
    generate: (rng) => {
      const p = rng.pick([10, 15, 20, 25, 30, 40, 60, 75] as const);
      const n = rng.pick([40, 60, 80, 120, 160, 200, 240, 300] as const);
      const result = (p / 100) * n;
      return {
        stem: `What is ${p}% of ${n}?`,
        answer: {
          value: fmt(result),
          explanation: `${p}% means ${p}/100. Multiply: (${p}/100) × ${n} = ${fmt(result)}.`,
        },
        distractors: [
          { value: fmt(result * 10), why: `This uses ${p}/10 instead of ${p}/100.` },
          { value: fmt(n - p), why: `This subtracts ${p} from ${n} instead of taking a percentage.` },
          { value: fmt(Math.round((result / 2) * 100) / 100), why: `This is ${p / 2}% of ${n}, half the requested percentage.` },
        ],
      };
    },
  },
  {
    id: 'psda-missing-mean',
    chapterId: 'math-problem-solving-data-analysis',
    topic: 'One-Variable Data',
    band: 'medium',
    generate: (rng) => {
      const count = 5;
      const mean = rng.int(10, 30);
      const values = Array.from({ length: count - 1 }, () => rng.int(mean - 8, mean + 8));
      const missing = mean * count - values.reduce((sum, v) => sum + v, 0);
      const partialSum = values.reduce((sum, v) => sum + v, 0);
      return {
        stem: `The mean of five test scores is ${mean}. Four of the scores are ${values.join(', ')}. What is the fifth score?`,
        answer: {
          value: fmt(missing),
          explanation: `The five scores must total ${mean} × 5 = ${mean * count}. The four known scores sum to ${partialSum}, so the fifth score is ${mean * count} − ${partialSum} = ${missing}.`,
        },
        distractors: [
          { value: fmt(mean), why: `The fifth score need not equal the mean; it must make the total ${mean * count}.` },
          { value: fmt(Math.round((partialSum / 4) * 100) / 100), why: `This is the mean of only the four known scores.` },
          { value: fmt(missing + count), why: `With this score the total would be ${partialSum + missing + count}, giving a mean above ${mean}.` },
        ],
      };
    },
  },
  {
    id: 'psda-percent-change',
    chapterId: 'math-problem-solving-data-analysis',
    topic: 'Percentages',
    band: 'medium',
    generate: (rng) => {
      const price = rng.pick([40, 50, 60, 80, 120, 150, 200] as const);
      const p = rng.pick([5, 10, 15, 20, 25, 30] as const);
      const newPrice = price * (1 + p / 100);
      return {
        stem: `The price of a jacket is $${price}. The store raises the price by ${p}%. What is the new price of the jacket?`,
        answer: {
          value: `$${fmt(newPrice)}`,
          explanation: `A ${p}% increase multiplies the price by 1 + ${p}/100 = ${1 + p / 100}. So the new price is ${price} × ${1 + p / 100} = $${fmt(newPrice)}.`,
        },
        distractors: [
          { value: `$${fmt(price * (1 - p / 100))}`, why: `This is a ${p}% decrease, not an increase.` },
          { value: `$${fmt(price + p)}`, why: `This adds ${p} dollars instead of ${p} percent.` },
          { value: `$${fmt((price * p) / 100)}`, why: `This is only the amount of the increase, not the new total price.` },
        ],
      };
    },
  },
  {
    id: 'psda-scatter-prediction',
    chapterId: 'math-problem-solving-data-analysis',
    topic: 'Two-Variable Data',
    band: 'medium',
    generate: (rng) => {
      const m = rng.pick([2, 3, 4, 5] as const);
      const b = rng.int(5, 20);
      const k = rng.int(6, 12);
      const predicted = m * k + b;
      const points: [number, number][] = Array.from({ length: 8 }, (_, i) => {
        const x = i + 1;
        return [x, m * x + b + rng.int(-2, 2)];
      });
      return {
        stem: `The scatterplot shows the relationship between hours studied, x, and quiz score, y, for eight students, along with the line of best fit y = ${m}x + ${b}. Based on the line of best fit, what is the predicted quiz score for a student who studies ${k} hours?`,
        graphSpec: {
          kind: 'function-plot',
          xDomain: [0, k + 3],
          yDomain: [0, m * (k + 3) + b + 6],
          data: [
            { points, fnType: 'points', graphType: 'scatter', color: '#facc15' },
            { fn: `${m} * x + ${b}`, color: '#00D8E8' },
          ],
          caption: `Line of best fit: y = ${m}x + ${b}`,
        },
        answer: {
          value: fmt(predicted),
          explanation: `Substitute x = ${k} into the line of best fit: y = ${m}(${k}) + ${b} = ${m * k} + ${b} = ${predicted}.`,
        },
        distractors: [
          { value: fmt(m * k - b), why: `This subtracts the intercept ${b} instead of adding it.` },
          { value: fmt(m * k), why: `This omits the y-intercept ${b} of the line of best fit.` },
          { value: fmt(m + k + b), why: `This adds the slope and x-value instead of multiplying them.` },
        ],
      };
    },
  },
  {
    id: 'psda-table-probability',
    chapterId: 'math-problem-solving-data-analysis',
    topic: 'Probability and Inference',
    band: 'hard',
    generate: (rng) => {
      const yesA = rng.int(12, 40) * 2;
      const noA = rng.int(10, 30) * 2;
      const yesB = rng.int(12, 40) * 2;
      const noB = rng.int(10, 30) * 2;
      const totalA = yesA + noA;
      const totalYes = yesA + yesB;
      const total = yesA + noA + yesB + noB;
      const simplify = (num: number, den: number) => {
        const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
        const g = gcd(num, den);
        return `${num / g}/${den / g}`;
      };
      return {
        stem: `A survey asked students in Grade 11 and Grade 12 whether they exercise regularly. The results:\n\nGrade 11 — Yes: ${yesA}, No: ${noA}\nGrade 12 — Yes: ${yesB}, No: ${noB}\n\nIf a surveyed Grade 11 student is selected at random, what is the probability that the student exercises regularly?`,
        answer: {
          value: simplify(yesA, totalA),
          explanation: `The selection is restricted to the ${totalA} Grade 11 students. Of those, ${yesA} said yes, so the probability is ${yesA}/${totalA} = ${simplify(yesA, totalA)}.`,
        },
        distractors: [
          { value: simplify(yesA, total), why: `This divides by all ${total} students surveyed, but the question restricts the selection to Grade 11 students.` },
          { value: simplify(yesA, totalYes), why: `This divides by all students who said yes (${totalYes}) instead of all Grade 11 students.` },
          { value: simplify(noA, totalA), why: `This is the probability that a Grade 11 student does NOT exercise regularly.` },
        ],
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/* Geometry and Trigonometry                                           */
/* ------------------------------------------------------------------ */

const geometryTemplates: MathTemplate[] = [
  {
    id: 'geo-rectangle-area',
    chapterId: 'math-geometry-trigonometry',
    topic: 'Area and Volume',
    band: 'easy',
    generate: (rng) => {
      const l = rng.int(5, 15);
      const w = rng.int(3, l - 1);
      return {
        stem: `A rectangle has a length of ${l} centimeters and a width of ${w} centimeters. What is the area of the rectangle, in square centimeters?`,
        answer: {
          value: fmt(l * w),
          explanation: `Area of a rectangle = length × width = ${l} × ${w} = ${l * w} square centimeters.`,
        },
        distractors: [
          { value: fmt(2 * (l + w)), why: `${2 * (l + w)} is the perimeter of the rectangle, not the area.` },
          { value: fmt(l + w), why: `This adds the dimensions instead of multiplying them.` },
          { value: fmt(l * w * 2), why: `This doubles the correct area.` },
        ],
      };
    },
  },
  {
    id: 'geo-triangle-third-angle',
    chapterId: 'math-geometry-trigonometry',
    topic: 'Lines, Angles, and Triangles',
    band: 'easy',
    generate: (rng) => {
      const a = rng.int(30, 80);
      const b = rng.int(30, Math.min(80, 170 - a));
      const c = 180 - a - b;
      return {
        stem: `Two angles of a triangle measure ${a}° and ${b}°. What is the measure of the third angle?`,
        answer: {
          value: `${c}°`,
          explanation: `The angles of a triangle sum to 180°. So the third angle is 180° − ${a}° − ${b}° = ${c}°.`,
        },
        distractors: [
          { value: `${180 - a}°`, why: `This subtracts only the first angle from 180° and ignores the ${b}° angle.` },
          { value: `${360 - a - b}°`, why: `This uses 360° (the sum for a quadrilateral) instead of 180°.` },
          { value: `${a + b}°`, why: `${a + b}° is the sum of the two given angles, not the third angle.` },
        ],
      };
    },
  },
  {
    id: 'geo-circle-area',
    chapterId: 'math-geometry-trigonometry',
    topic: 'Circles',
    band: 'medium',
    generate: (rng) => {
      const r = rng.int(3, 12);
      return {
        stem: `A circle has a radius of ${r} inches. What is the area of the circle, in square inches?`,
        answer: {
          value: `${r * r}π`,
          explanation: `Area of a circle = πr² = π(${r})² = ${r * r}π square inches.`,
        },
        distractors: [
          { value: `${2 * r}π`, why: `${2 * r}π is the circumference of the circle (2πr), not the area.` },
          { value: `${2 * r * r}π`, why: `This doubles the correct area — the formula is πr², not 2πr².` },
          { value: `${r}π`, why: `This uses πr instead of πr².` },
        ],
      };
    },
  },
  {
    id: 'geo-pythagorean',
    chapterId: 'math-geometry-trigonometry',
    topic: 'Right Triangles and Trigonometry',
    band: 'medium',
    generate: (rng) => {
      const triple = rng.pick([
        [3, 4, 5],
        [5, 12, 13],
        [6, 8, 10],
        [8, 15, 17],
        [7, 24, 25],
        [9, 12, 15],
        [12, 16, 20],
      ] as const);
      const [a, b, c] = triple;
      return {
        stem: `A right triangle has legs of length ${a} and ${b}. What is the length of the hypotenuse?`,
        answer: {
          value: fmt(c),
          explanation: `By the Pythagorean theorem, hypotenuse² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}. So the hypotenuse is √${c * c} = ${c}.`,
        },
        distractors: [
          { value: fmt(a + b), why: `The hypotenuse is not the sum of the legs; it must satisfy c² = a² + b².` },
          { value: fmt(c * c), why: `${c * c} is the square of the hypotenuse; take the square root to get ${c}.` },
          { value: fmt(c + 2), why: `(${c + 2})² = ${(c + 2) * (c + 2)}, which does not equal ${a * a} + ${b * b} = ${c * c}.` },
        ],
      };
    },
  },
  {
    id: 'geo-circle-equation',
    chapterId: 'math-geometry-trigonometry',
    topic: 'Coordinate Geometry',
    band: 'hard',
    generate: (rng) => {
      const h = rng.int(-6, 6);
      const k = rng.int(-6, 6);
      const r = rng.int(2, 9);
      const hTerm = h === 0 ? 'x²' : h > 0 ? `(x − ${h})²` : `(x + ${Math.abs(h)})²`;
      const kTerm = k === 0 ? 'y²' : k > 0 ? `(y − ${k})²` : `(y + ${Math.abs(k)})²`;
      return {
        stem: `In the xy-plane, the graph of ${hTerm} + ${kTerm} = ${r * r} is a circle. What is the radius of the circle?`,
        answer: {
          value: fmt(r),
          explanation: `The equation (x − h)² + (y − k)² = r² describes a circle with radius r. Here r² = ${r * r}, so r = √${r * r} = ${r}.`,
        },
        distractors: [
          { value: fmt(r * r), why: `${r * r} is r², the right-hand side of the equation — the radius is its square root.` },
          { value: fmt(Math.round((r * r) / 2)), why: `Halving r² is not the same as taking its square root.` },
          { value: fmt(2 * r), why: `${2 * r} is the diameter of the circle, not the radius.` },
        ],
      };
    },
  },
  {
    id: 'geo-trig-cofunction',
    chapterId: 'math-geometry-trigonometry',
    topic: 'Right Triangles and Trigonometry',
    band: 'hard',
    generate: (rng) => {
      const triple = rng.pick([
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ] as const);
      const [opp, adj, hyp] = triple;
      return {
        stem: `In right triangle ABC, angle C is the right angle, sin A = ${opp}/${hyp}, and the side lengths are ${opp}, ${adj}, and ${hyp}. What is the value of cos B?`,
        answer: {
          value: `${opp}/${hyp}`,
          explanation: `Angles A and B are complementary (A + B = 90°), and the cosine of an angle equals the sine of its complement. So cos B = sin A = ${opp}/${hyp}.`,
        },
        distractors: [
          { value: `${adj}/${hyp}`, why: `${adj}/${hyp} is cos A (and sin B), not cos B.` },
          { value: `${opp}/${adj}`, why: `${opp}/${adj} is tan A — a ratio of the two legs, not cos B.` },
          { value: `${hyp}/${opp}`, why: `This inverts the correct ratio; cosine is never greater than 1 for an acute angle.` },
        ],
      };
    },
  },
];

export const MATH_TEMPLATES: MathTemplate[] = [
  ...algebraTemplates,
  ...advancedTemplates,
  ...psdaTemplates,
  ...geometryTemplates,
];

const CHOICE_LABELS = ['A', 'B', 'C', 'D'] as const;

function resolveDomainName(chapterId: string): string {
  return MCAT_CHAPTERS.math.find((chapter) => chapter.id === chapterId)?.name ?? 'Math';
}

/**
 * Deterministically instantiate a template: same (templateId, seed) always
 * yields the same numbers, choices, ordering, and explanations.
 */
export function instantiateTemplate(template: MathTemplate, seed: number): MathTemplateQuestion {
  const rng = createRng(seed * 2654435761 + template.id.length);
  const output = template.generate(rng);

  // Deduplicate distractors against the answer and each other; nudge collisions.
  const seen = new Set<string>([output.answer.value]);
  const cleanDistractors: { value: string; why: string }[] = [];
  for (const distractor of output.distractors) {
    let { value } = distractor;
    let nudged = false;
    let attempts = 0;
    while (seen.has(value) && attempts < 5) {
      const numeric = parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(numeric)) {
        value = value.replace(/-?[0-9.]+/, fmt(numeric + cleanDistractors.length + attempts + 1));
        nudged = true;
      } else {
        break;
      }
      attempts += 1;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    cleanDistractors.push({
      value: value.trim(),
      // A nudged value no longer matches the original error pattern, so its
      // original explanation would cite the wrong number.
      why: nudged ? 'Substituting this value back into the problem does not satisfy the given conditions.' : distractor.why,
    });
    if (cleanDistractors.length === 3) break;
  }

  const options = rng.shuffle([
    { value: output.answer.value, correct: true, why: '' },
    ...cleanDistractors.map((d) => ({ value: d.value, correct: false, why: d.why })),
  ]);

  const choices = options.map((option, index) => ({ label: CHOICE_LABELS[index], text: option.value }));
  const correctIndex = options.findIndex((option) => option.correct);
  const distractorExplanations: Record<string, string> = {};
  options.forEach((option, index) => {
    if (!option.correct) distractorExplanations[CHOICE_LABELS[index]] = option.why;
  });

  const band = BAND_ELO[template.band];
  const difficulty = band.base + Math.round((rng.int(0, band.spread * 2) - band.spread) / 2);

  return {
    templateId: template.id,
    seed,
    subject: 'math',
    domain: resolveDomainName(template.chapterId),
    topic: template.topic,
    difficultyBand: template.band,
    difficulty,
    stem: output.stem,
    choices,
    correctAnswer: CHOICE_LABELS[correctIndex],
    explanation: output.answer.explanation,
    distractorExplanations,
    graphSpec: output.graphSpec,
  };
}

export interface MathTemplateFilter {
  chapterId?: string;
  domainName?: string;
  topic?: string;
  band?: DifficultyBand;
}

export function findTemplates(filter: MathTemplateFilter): MathTemplate[] {
  const domainName = filter.domainName?.toLowerCase();
  return MATH_TEMPLATES.filter((template) => {
    if (filter.chapterId && template.chapterId !== filter.chapterId) return false;
    if (domainName && resolveDomainName(template.chapterId).toLowerCase() !== domainName) return false;
    if (filter.topic && template.topic.toLowerCase() !== filter.topic.toLowerCase()) return false;
    if (filter.band && template.band !== filter.band) return false;
    return true;
  });
}

/**
 * Generate `count` math questions matching the filter. Seeds rotate through
 * templates so repeated calls with different seedBase values produce fresh
 * variants while staying reproducible.
 */
export function generateMathTemplateQuestions(
  filter: MathTemplateFilter,
  count: number,
  seedBase: number = Date.now() % 1_000_000
): MathTemplateQuestion[] {
  const templates = findTemplates(filter);
  if (templates.length === 0) return [];

  const questions: MathTemplateQuestion[] = [];
  for (let i = 0; i < count; i += 1) {
    const template = templates[i % templates.length];
    questions.push(instantiateTemplate(template, seedBase + i * 97));
  }
  return questions;
}
