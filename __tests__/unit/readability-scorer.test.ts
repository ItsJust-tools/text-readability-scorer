import { describe, it, expect } from 'vitest';
import {
  splitSentences,
  splitWords,
  countSyllables,
  countPolysyllables,
  countSyllablesInWords,
  fleschReadingEase,
  fleschKincaidGrade,
  gunningFog,
  smog,
  colemanLiau,
  aari,
  fleschBand,
  gradeSummary,
  analyzeText,
  buildMarkdownReport,
  buildTextReport,
  SAMPLE_PRESETS,
  SAMPLE_SOURCE_NEWS,
  DEFAULT_STATE,
  type ToolState,
} from '@/tool/types';
import { deserializeState, serializeState, roundTrips } from '@/tool/tool-definition';
import { textReadabilityScorerTool } from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('syllable counting', () => {
  it('counts reference words correctly', () => {
    expect(countSyllables('queue')).toBe(1);
    expect(countSyllables('rhythm')).toBe(2);
    expect(countSyllables('hello')).toBe(2);
    expect(countSyllables('education')).toBe(4);
    expect(countSyllables('cat')).toBe(1);
  });

  it('handles common edge words', () => {
    expect(countSyllables('')).toBe(0);
    expect(countSyllables('table')).toBe(2);
    expect(countSyllables('candle')).toBe(2);
    expect(countSyllables('simple')).toBe(2);
    expect(countSyllables('apple')).toBe(2);
    expect(countSyllables('make')).toBe(1);
    expect(countSyllables('beautiful')).toBe(3);
    expect(countSyllables('a')).toBe(1);
    expect(countSyllables('123')).toBe(0);
  });

  it('counts polysyllables in plain and hyphenated words', () => {
    expect(countPolysyllables(['cat', 'hello', 'education'])).toBe(1);
    // well-known sums to 2 syllables across the compound — not polysyllabic.
    expect(countPolysyllables(['well-known'])).toBe(0);
    // Hyphenated compounds sum their parts: mother(2)+in+law(1) = polysyllabic.
    expect(countPolysyllables(['mother-in-law'])).toBe(1);
    expect(countPolysyllables(['cat'])).toBe(0);
  });

  it('sums syllables across hyphenated compounds', () => {
    expect(countSyllablesInWords(['well-known'])).toBe(2);
    expect(countSyllablesInWords(['hello', 'cat'])).toBe(3);
  });
});

describe('word and sentence splitting', () => {
  it('splits words including hyphenated and apostrophe tokens', () => {
    expect(splitWords("Hello don't well-known world")).toEqual([
      'Hello',
      "don't",
      'well-known',
      'world',
    ]);
    expect(splitWords('')).toEqual([]);
    expect(splitWords('123 456')).toEqual(['123', '456']);
  });

  it('splits sentences on ., !, ? and newlines', () => {
    expect(splitSentences('One. Two! Three? Four')).toHaveLength(4);
    expect(splitSentences('First line.\nSecond line.')).toHaveLength(2);
    expect(splitSentences('No terminator here')).toEqual(['No terminator here']);
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('Dr. Smith went home.')).toEqual(['Dr. Smith went home']);
    expect(splitSentences('Value rose 3.5 percent.')).toEqual(['Value rose 3.5 percent']);
  });
});

describe('readability formulas', () => {
  it('matches a known Flesch Reading Ease reference', () => {
    // Classic example: "The quick brown fox jumps over the lazy dog."
    // 9 words, 1 sentence, 9 syllables -> RE = 206.835 - 1.015*9 - 84.6*1
    const score = fleschReadingEase(9, 1, 9);
    expect(score).not.toBeNull();
    expect(score as number).toBeCloseTo(206.835 - 1.015 * 9 - 84.6, 2);
  });

  it('matches known Flesch-Kincaid grade for a reference text', () => {
    const grade = fleschKincaidGrade(9, 1, 9);
    expect(grade).not.toBeNull();
    expect(grade as number).toBeCloseTo(0.39 * 9 + 11.8 * 1 - 15.59, 2);
  });

  it('returns null on empty inputs', () => {
    expect(fleschReadingEase(0, 0, 0)).toBeNull();
    expect(fleschKincaidGrade(0, 1, 5)).toBeNull();
    expect(gunningFog(1, 0, 1)).toBeNull();
    expect(smog(0, 0)).toBeNull();
    expect(colemanLiau(0, 0, 0)).toBeNull();
    expect(aari(0, 1, 3)).toBeNull();
  });

  it('computes Gunning Fog, SMOG, Coleman-Liau and AARI without crashing', () => {
    expect(gunningFog(20, 2, 4)).not.toBeNull();
    expect(smog(10, 6)).not.toBeNull();
    expect(colemanLiau(20, 2, 80)).not.toBeNull();
    expect(aari(20, 2, 80)).not.toBeNull();
  });

  it('matches the standard SMOG formula for >= 3 sentences', () => {
    const value = smog(12, 6);
    const expected = 1.043 * Math.sqrt(12 * (30 / 6)) + 3.1291;
    expect(value).toBeCloseTo(expected, 2);
  });

  it('bands Flesch scores in ascending difficulty', () => {
    expect(fleschBand(95)).toBe('very easy');
    expect(fleschBand(85)).toBe('easy');
    expect(fleschBand(75)).toBe('fairly easy');
    expect(fleschBand(65)).toBe('plain English');
    expect(fleschBand(55)).toBe('fairly difficult');
    expect(fleschBand(40)).toBe('difficult');
    expect(fleschBand(10)).toBe('very difficult');
  });

  it('summarizes grade levels', () => {
    expect(gradeSummary(null)).toBeTruthy();
    expect(gradeSummary(3)).toContain('Accessible');
    expect(gradeSummary(20)).toBeTruthy();
  });
});

describe('analyzeText', () => {
  it('matches the documented Flesch ease for the kid-story preset', () => {
    const preset = SAMPLE_PRESETS.find((p) => p.id === 'kid-story');
    expect(preset).toBeDefined();
    const analysis = analyzeText(preset?.text ?? '', 22, 60);
    // Simple sentences with common words must score as very easy (> 80).
    expect(analysis.scores.fleschReadingEase).not.toBeNull();
    expect(analysis.scores.fleschReadingEase as number).toBeGreaterThan(80);
  });

  it('ranks legal text much harder than the kid story', () => {
    const kid = SAMPLE_PRESETS.find((p) => p.id === 'kid-story');
    const legal = SAMPLE_PRESETS.find((p) => p.id === 'legal');
    const kidScore = analyzeText(kid?.text ?? '', 22, 60).scores.fleschReadingEase as number;
    const legalScore = analyzeText(legal?.text ?? '', 22, 60).scores.fleschReadingEase as number;
    expect(legalScore).toBeLessThan(kidScore);
  });

  it('produces counts for known input', () => {
    const analysis = analyzeText('Hello world. This is fine.', 22, 60);
    expect(analysis.counts.words).toBe(5);
    expect(analysis.counts.sentences).toBe(2);
    expect(analysis.counts.characters).toBe('Hello world. This is fine.'.length);
    expect(analysis.summary).toBeTruthy();
  });

  it('flags long and hard sentences in the breakdown table', () => {
    const longRun = Array.from({ length: 30 }, (_, i) => `word${i + 1}`).join(' ');
    const analysis = analyzeText(`${longRun}. Short one.`, 22, 60);
    expect(analysis.sentences).toHaveLength(2);
    expect(analysis.sentences[0]?.flagged).toBe(true);
    expect(analysis.sentences[0]?.reason).toBe('long');
    expect(analysis.sentences[1]?.flagged).toBe(false);
    expect(analysis.sentences[0]?.grade).toBeGreaterThan(0);
  });

  it('provides improvement hints for hard text', () => {
    const legal = SAMPLE_PRESETS.find((p) => p.id === 'legal');
    const analysis = analyzeText(legal?.text ?? '', 22, 60);
    expect(analysis.hints.length).toBeGreaterThan(0);
    const easy = analyzeText('The cat sat. The dog ran.', 22, 60);
    expect(easy.hints.join(' ')).toContain('good');
  });

  it('produces every score for the news sample', () => {
    const analysis = analyzeText(SAMPLE_SOURCE_NEWS, 22, 60);
    expect(analysis.scores.fleschReadingEase).not.toBeNull();
    expect(analysis.scores.fleschKincaidGrade).not.toBeNull();
    expect(analysis.scores.gunningFog).not.toBeNull();
    expect(analysis.scores.smog).not.toBeNull();
    expect(analysis.scores.colemanLiau).not.toBeNull();
    expect(analysis.scores.aariGrade).not.toBeNull();
  });
});

describe('edge cases', () => {
  it('handles empty input without crashing', () => {
    const analysis = analyzeText('', 22, 60);
    expect(analysis.counts.words).toBe(0);
    expect(analysis.counts.sentences).toBe(0);
    expect(analysis.scores.fleschReadingEase).toBeNull();
    expect(analysis.summary).toContain('No text');
  });

  it('handles a single word', () => {
    const analysis = analyzeText('hello', 22, 60);
    expect(analysis.counts.words).toBe(1);
    expect(analysis.counts.sentences).toBe(1);
    expect(analysis.scores.fleschReadingEase).not.toBeNull();
    expect(analysis.sentences[0]?.wordCount).toBe(1);
  });

  it('handles text without periods', () => {
    const analysis = analyzeText('just some words with no punctuation at all', 22, 60);
    expect(analysis.counts.sentences).toBe(1);
    expect(analysis.scores.fleschReadingEase).not.toBeNull();
  });

  it('handles numbers and abbreviations without crashing', () => {
    const analysis = analyzeText(
      'In 2024, Dr. Lee reported 3.5 mm growth. It was 50% faster!',
      22,
      60
    );
    expect(analysis.counts.words).toBeGreaterThan(0);
    expect(analysis.scores.fleschReadingEase).not.toBeNull();
  });

  it('treats whitespace-only input as empty', () => {
    const analysis = analyzeText('   \n\t  ', 22, 60);
    expect(analysis.counts.words).toBe(0);
    expect(analysis.scores.fleschReadingEase).toBeNull();
  });
});

describe('sample presets', () => {
  it('exposes all four presets with distinct texts', () => {
    expect(SAMPLE_PRESETS).toHaveLength(4);
    const ids = new Set(SAMPLE_PRESETS.map((p) => p.id));
    expect(ids).toEqual(new Set(['kid-story', 'news', 'legal', 'academic']));
  });

  it('orders presets by readability difficulty', () => {
    const score = (id: string) => {
      const preset = SAMPLE_PRESETS.find((p) => p.id === id);
      return analyzeText(preset?.text ?? '', 22, 60).scores.fleschReadingEase as number;
    };
    expect(score('kid-story')).toBeGreaterThan(score('news'));
    expect(score('news')).toBeGreaterThan(score('legal'));
    expect(score('legal')).toBeGreaterThan(score('academic'));
  });
});

describe('serialize/deserialize', () => {
  it('round-trips the exact text and thresholds', () => {
    const s = state({
      text: 'Round trip test text. With two sentences!',
      longSentenceThreshold: 15,
      hardSentenceFlesch: 55,
    });
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(s);
    }
    expect(roundTrips(s)).toBe(true);
  });

  it('restores exact text through the Tool object', () => {
    const s = state({ text: 'Shared via URL body text.' });
    const serialized = textReadabilityScorerTool.serialize(s);
    const restored = textReadabilityScorerTool.deserialize(JSON.parse(serialized));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.text).toBe(s.text);
      const recomputed = analyzeText(
        restored.data.text,
        restored.data.longSentenceThreshold,
        restored.data.hardSentenceFlesch
      );
      const original = analyzeText(s.text, s.longSentenceThreshold, s.hardSentenceFlesch);
      expect(recomputed.scores.fleschReadingEase).toBe(original.scores.fleschReadingEase);
    }
  });

  it('rejects malformed payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('string').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(undefined).success).toBe(false);
  });

  it('falls back to defaults and clamps thresholds', () => {
    const restored = deserializeState({});
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.text).toBe(DEFAULT_STATE.text);
      expect(restored.data.longSentenceThreshold).toBe(DEFAULT_STATE.longSentenceThreshold);
    }
    const clamped = deserializeState({ longSentenceThreshold: 1000, hardSentenceFlesch: -10 });
    expect(clamped.success).toBe(true);
    if (clamped.success) {
      expect(clamped.data.longSentenceThreshold).toBe(100);
      expect(clamped.data.hardSentenceFlesch).toBe(0);
    }
  });
});

describe('reports', () => {
  it('builds a Markdown report containing scores and hints', () => {
    const analysis = analyzeText(DEFAULT_STATE.text, 22, 60);
    const report = buildMarkdownReport(analysis, DEFAULT_STATE.text);
    expect(report).toContain('# Readability Report');
    expect(report).toContain('Flesch Reading Ease');
    expect(report).toContain('## Improvement hints');
    expect(report).toContain(DEFAULT_STATE.text);
    expect(buildTextReport(analysis, DEFAULT_STATE.text)).toBe(report);
  });
});
