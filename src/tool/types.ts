export type SamplePresetId = 'kid-story' | 'news' | 'legal' | 'academic';

export interface ToolState {
  /** The text under analysis. */
  text: string;
  /** Sentences longer than this many words are flagged (default 22). */
  longSentenceThreshold: number;
  /** Sentences below this Flesch Reading Ease are flagged as hard (default 60). */
  hardSentenceFlesch: number;
}

export const DEFAULT_LONG_SENTENCE_THRESHOLD = 22;
export const DEFAULT_HARD_SENTENCE_FLESCH = 60;
export const MAX_HISTORY_NOTE = 10;

export const SAMPLE_SOURCE_NEWS = `Scientists announced a new plan to clean plastic from rivers. Small floating robots will collect waste before it reaches the sea. The team hopes to start work next spring in three towns.

Local leaders welcomed the idea. "This is a simple step that everyone can support," said one council member.

Engineers say each device can gather up to fifty kilograms of trash per day.`;

export const DEFAULT_STATE: ToolState = {
  text: SAMPLE_SOURCE_NEWS,
  longSentenceThreshold: DEFAULT_LONG_SENTENCE_THRESHOLD,
  hardSentenceFlesch: DEFAULT_HARD_SENTENCE_FLESCH,
};

export const SAMPLE_PRESETS: { id: SamplePresetId; label: string; text: string }[] = [
  {
    id: 'kid-story',
    label: 'Kid story',
    text: `Sam has a red hat. The hat is big. Sam runs to the park with the hat on his head.

At the park, Sam sees a dog. The dog is brown and very friendly. Sam gives the dog a treat.

The dog wags its tail. Sam laughs. They play until the sun goes down.`,
  },
  { id: 'news', label: 'News article', text: SAMPLE_SOURCE_NEWS },
  {
    id: 'legal',
    label: 'Legal text',
    text: `Notwithstanding any provision herein to the contrary, the licensee shall be responsible for the indemnification of consequential damages attributable to the unauthorized dissemination of proprietary information.

In the event of a material breach, the licensor reserves the unilateral right to terminate this agreement upon written notification, whereupon all rightsheretofore granted shall immediately revert to the licensor without prejudice.`,
  },
  {
    id: 'academic',
    label: 'Academic abstract',
    text: `We investigate the epistemological ramifications of computational hermeneutics within contemporary interpretive frameworks, proposing a novel methodological apparatus for phenomenological quantification.

Our longitudinal analysis demonstrates statistically significant heterogeneity across diachronic corpora, thereby problematizing prevailing synchronic assumptions.`,
  },
];

/** Split text into sentence strings (numbers, abbreviations and hyphens tolerated). */
export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const parts = cleaned
    .split(/(?:[.!?]+(?:\s+|$)|\n+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [cleaned];
}

export interface SentenceInfo {
  index: number;
  text: string;
  wordCount: number;
  syllableCount: number;
  fleschEase: number;
  grade: number;
  flagged: boolean;
  reason: 'long' | 'hard' | 'long+hard' | null;
}

export interface Counts {
  words: number;
  sentences: number;
  syllables: number;
  polysyllables: number;
  characters: number;
  charactersNoSpaces: number;
}

export interface Scores {
  fleschReadingEase: number | null;
  fleschKincaidGrade: number | null;
  gunningFog: number | null;
  smog: number | null;
  colemanLiau: number | null;
  aariGrade: number | null;
}

export interface Analysis {
  counts: Counts;
  scores: Scores;
  sentences: SentenceInfo[];
  hardestSentenceIndex: number | null;
  summary: string;
  hints: string[];
}

/** Regular expression used by {@link splitWords}. */
const WORD_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

/** Split text into lowercase word tokens; numbers count as words. */
export function splitWords(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

function coreSyllables(lower: string): number {
  const groups = lower.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 0;
  // Special geminate rules: -le after a consonant is a counted syllable peak (ta-ble).
  if (count === 0) count = 1;
  return count;
}

/**
 * Count syllables in an English word.
 * Silent e, diphthongs and special suffixes are accounted for.
 */
export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 0;
  const trimmed = cleaned.replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, '').replace(/^y/, '');

  let count = 0;
  let prevWasVowel = false;
  for (const ch of trimmed) {
    const isVowel = 'aeiouy'.includes(ch);
    if (isVowel && !prevWasVowel) count += 1;
    prevWasVowel = isVowel;
  }
  if (count === 0) return 1;

  // -le endings following a consonant form their own syllable (candle → 2).
  if (/(?:[^aeiouy]le)$/.test(cleaned) && cleaned.length > 2) count += 0; // already counted via 'le' vowel group
  return count;
}

/** Count words with three or more syllables, tolerating hyphenated compounds. */
export function countPolysyllables(words: string[]): number {
  return words.filter((w) => {
    if (w.includes('-')) {
      const parts = w.split('-').filter(Boolean);
      return parts.reduce((sum, p) => sum + countSyllables(p), 0) >= 3;
    }
    return countSyllables(w) >= 3;
  }).length;
}

export function countSyllablesInWords(words: string[]): number {
  return words.reduce((sum, w) => {
    if (w.includes('-')) {
      const parts = w.split('-').filter(Boolean);
      return (
        sum +
        Math.max(
          1,
          parts.reduce((s, p) => s + countSyllables(p), 0)
        )
      );
    }
    return sum + countSyllables(w);
  }, 0);
}

/** Flesch Reading Ease: 206.835 − 1.015 × (words/sentences) − 84.6 × (syllables/words). */
export function fleschReadingEase(words: number, sentences: number, syllables: number): number | null {
  if (sentences <= 0 || words <= 0) return null;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

/** Flesch-Kincaid Grade Level. */
export function fleschKincaidGrade(words: number, sentences: number, syllables: number): number | null {
  if (sentences <= 0 || words <= 0) return null;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

/** Gunning Fog index (uses polysyllable count). */
export function gunningFog(words: number, sentences: number, polysyllables: number): number | null {
  if (sentences <= 0 || words <= 0) return null;
  return 0.4 * ((words / sentences) + 100 * (polysyllables / words));
}

/** SMOG index (needs at least 3 sentences; falls back gracefully below that). */
export function smog(polysyllables: number, sentences: number): number | null {
  if (sentences <= 0) return null;
  const effective = Math.min(polysyllables * (30 / sentences), 0);
  void effective;
  const capped = sentences >= 3 ? polysyllables * (30 / sentences) : polysyllables;
  const sqrtTerm = sentences >= 3 ? Math.sqrt(capped) : Math.sqrt(Math.max(polysyllables, 0));
  const base = 1.0430 * sqrtTerm + 3.1291;
  return sentences >= 30 ? base + 3.1291 : base;
}

/** Coleman-Liau index from character counts. */
export function colemanLiau(words: number, sentences: number, letters: number): number | null {
  if (sentences <= 0 || words <= 0) return null;
  const L = (letters / words) * 100;
  const S = (sentences / words) * 100;
  return 0.0588 * L - 0.296 * S - 15.8;
}

/** Automated Readability Index. */
export function aari(words: number, sentences: number, letters: number): number | null {
  if (sentences <= 0 || words <= 0) return null;
  const L = (letters / words) * 100;
  const S = (sentences / words) * 100;
  return 4.71 * L + 0.5 * S - 21.43;
}

export function fleschBand(score: number): string {
  if (score >= 90) return 'very easy';
  if (score >= 80) return 'easy';
  if (score >= 70) return 'fairly easy';
  if (score >= 60) return 'plain English';
  if (score >= 50) return 'fairly difficult';
  if (score >= 30) return 'difficult';
  return 'very difficult';
}

const gradeLabel = (grade: number | null): string => (grade === null ? '—' : grade.toFixed(1));

/** Human readable interpretation of a grade-level style score. */
export function gradeSummary(grade: number | null): string {
  if (grade === null) return 'Not enough text to compute a grade level.';
  if (grade < 6) return 'Accessible to most readers (elementary school level).';
  if (grade < 9) return 'Suitable for teenagers and general audiences.';
  if (grade < 13) return 'Best for high-school to early college readers.';
  if (grade < 16) return 'College-level reading required.';
  return 'Advanced academic or professional reading level.';
}

/** Full analysis of the current text state. */
export function analyzeText(text: string, longSentenceThreshold: number, hardSentenceFlesch: number): Analysis {
  const wordTokens = splitWords(text);
  const sentenceTokens = splitSentences(text);
  const letters = text.replace(/[^A-Za-z]/g, '').length;

  const counts: Counts = {
    words: wordTokens.length,
    sentences: sentenceTokens.length,
    syllables: countSyllablesInWords(wordTokens),
    polysyllables: countPolysyllables(wordTokens),
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
  };

  const sentences = sentenceTokens.map((sentence, index) => {
    const words = splitWords(sentence);
    const syllables = countSyllablesInWords(words);
    const info: SentenceInfo = {
      index,
      text: sentence,
      wordCount: words.length,
      syllableCount: syllables,
      fleschEase: fleschReadingEase(words.length, 1, syllables) ?? 0,
      grade: fleschKincaidGrade(words.length, 1, syllables) ?? 0,
      flagged: false,
      reason: null,
    };
    const long = words.length > longSentenceThreshold;
    const hard = sentenceTokens.length > 0 ? info.fleschEase < hardSentenceFlesch : false;
    info.flagged = long || hard;
    info.reason = long && hard ? 'long+hard' : long ? 'long' : hard ? 'hard' : null;
    return info;
  });

  const w = counts.words;
  const s = counts.sentences;
  const sy = counts.syllables;
  const poly = counts.polysyllables;

  const scores: Scores = {
    fleschReadingEase: fleschReadingEase(w, s, sy),
    fleschKincaidGrade: fleschKincaidGrade(w, s, sy),
    gunningFog: gunningFog(w, s, poly),
    smog: smog(poly, s),
    colemanLiau: colemanLiau(w, s, letters),
    aariGrade: aari(w, s, letters),
  };

  const hardestSentenceIndex =
    sentences.reduce<number | null>((best, cur) => {
      if (cur.wordCount === 0) return best;
      if (best === null) return cur.index;
      const bestSentence = sentences[best];
      if (!bestSentence) return cur.index;
      return cur.fleschEase < bestSentence.fleschEase ? cur.index : best;
    }, null) ?? null;

  const hints: string[] = [];
  const flagged = sentences.filter((sent) => sent.flagged);
  if (w === 0) {
    hints.push('Add some text to analyze.');
  } else {
    if (scores.fleschReadingEase !== null && scores.fleschReadingEase < 60) {
      hints.push('Flesch Reading Ease is below 60 — aim for shorter, more common words.');
    }
    if (sentences.some((sent) => sent.reason === 'long' || sent.reason === 'long+hard')) {
      hints.push(
        `Some sentences exceed ${longSentenceThreshold} words — split them into shorter sentences.`
      );
    }
    if (counts.polysyllables / Math.max(w, 1) > 0.15) {
      hints.push('Over 15% of words have three or more syllables — prefer simpler synonyms.');
    }
    if (scores.fleschKincaidGrade !== null && scores.fleschKincaidGrade > 12) {
      hints.push('Grade level is above 12 — consider a plain-language rewrite.');
    }
    if (hints.length === 0) {
      hints.push('Readability looks good — keep sentences short and vocabulary simple.');
    }
  }

  const summary = buildSummary(scores, counts, fleschBand, gradeLabel);

  return { counts, scores, sentences, hardestSentenceIndex, summary, hints, flaggedCount: flagged.length } as Analysis & { flaggedCount: number };
}

function buildSummary(
  scores: Scores,
  counts: Counts,
  band: (score: number) => string,
  label: (grade: number | null) => string
): string {
  if (counts.words === 0) {
    return 'No text to analyze yet — paste or type something to see readability scores.';
  }
  const ease = scores.fleschReadingEase;
  const easeText = ease === null ? 'unknown' : `${ease.toFixed(1)} (${band(ease)})`;
  return `This text scores ${easeText} on Flesch Reading Ease with an average grade level of ${label(
    scores.fleschKincaidGrade
  )} across ${counts.words} words in ${counts.sentences} sentences.`;
}

/** Build the full Markdown report string for copy/download. */
export function buildMarkdownReport(analysis: Analysis, text: string): string {
  const { counts, scores, sentences, hints, summary } = analysis;
  const lines: string[] = [
    `# Readability Report`,
    ``,
    summary,
    ``,
    `## Counts`,
    ``,
    `- Words: ${counts.words}`,
    `- Sentences: ${counts.sentences}`,
    `- Syllables: ${counts.syllables}`,
    `- Polysyllables: ${counts.polysyllables}`,
    `- Characters: ${counts.characters} (${counts.charactersNoSpaces} without spaces)`,
    ``,
    `## Scores`,
    ``,
    `- Flesch Reading Ease: ${fmt(scores.fleschReadingEase)}`,
    `- Flesch-Kincaid Grade Level: ${fmt(scores.fleschKincaidGrade)}`,
    `- Gunning Fog: ${fmt(scores.gunningFog)}`,
    `- SMOG: ${fmt(scores.smog)}`,
    `- Coleman-Liau: ${fmt(scores.colemanLiau)}`,
    `- AARI: ${fmt(scores.aariGrade)}`,
    ``,
    `## Hardest sentences`,
    ``,
    ...sentences
      .filter((s) => s.flagged)
      .slice(0, 10)
      .map(
        (s) =>
          `- [${s.reason}] (grade ${s.grade.toFixed(1)}, ${s.wordCount} words) "${truncate(s.text, 120)}"`
      ),
    ``,
    `## Improvement hints`,
    ``,
    ...hints.map((h) => `- ${h}`),
    ``,
    `## Text`,
    ``,
    text,
  ];
  return lines.filter((l) => l !== undefined).join('\n');
}

function fmt(value: number | null): string {
  return value === null ? '—' : value.toFixed(1);
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Full report as plain text for download. */
export function buildTextReport(analysis: Analysis, text: string): string {
  return buildMarkdownReport(analysis, text);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.text === 'string';
}
