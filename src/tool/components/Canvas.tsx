'use client';

import React from 'react';
import {
  analyzeText,
  buildMarkdownReport,
  buildTextReport,
  SAMPLE_PRESETS,
  type Analysis,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

const DEBOUNCE_MS = 150;

function useDebouncedAnalysis(state: ToolState): Analysis {
  const [analysis, setAnalysis] = React.useState<Analysis>(() =>
    analyzeText(state.text, state.longSentenceThreshold, state.hardSentenceFlesch)
  );
  const { text, longSentenceThreshold, hardSentenceFlesch } = state;
  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setAnalysis(analyzeText(text, longSentenceThreshold, hardSentenceFlesch));
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [text, longSentenceThreshold, hardSentenceFlesch]);
  return analysis;
}

function ScoreCard({
  label,
  value,
  hint,
  testid,
}: {
  label: string;
  value: string;
  hint?: string;
  testid: string;
}) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
      data-testid={testid}
    >
      <span className="block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="block font-mono text-2xl font-bold" data-testid={`${testid}-value`}>
        {value}
      </span>
      {hint ? (
        <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">{hint}</span>
      ) : null}
    </div>
  );
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const analysis = useDebouncedAnalysis(state);
  const { counts, scores, sentences, summary, hints } = analysis;

  const ease =
    scores.fleschReadingEase === null
      ? '—'
      : `${scores.fleschReadingEase.toFixed(1)}`;
  const easeBand =
    scores.fleschReadingEase === null
      ? 'No text'
      : fleschBandLabel(scores.fleschReadingEase);

  const handleDownload = React.useCallback(() => {
    downloadText(
      'readability-report.txt',
      buildTextReport(analyzeText(state.text, state.longSentenceThreshold, state.hardSentenceFlesch), state.text)
    );
  }, [state.text, state.longSentenceThreshold, state.hardSentenceFlesch]);

  const handleCopyReport = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        buildMarkdownReport(
          analyzeText(state.text, state.longSentenceThreshold, state.hardSentenceFlesch),
          state.text
        )
      );
    } catch {
      // clipboard unavailable; ignore
    }
  }, [state.text, state.longSentenceThreshold, state.hardSentenceFlesch]);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="readability-canvas">
      <div>
        <label
          htmlFor="readability-text"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          Text to analyze
        </label>
        <textarea
          id="readability-text"
          value={state.text}
          onChange={(e) => update({ text: e.target.value })}
          data-testid="text-input"
          rows={8}
          className={inputClass}
          placeholder="Paste or type text to score its readability…"
        />
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Sample presets">
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              data-testid={`preset-${preset.id}`}
              onClick={() => update({ text: preset.text })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                state.text === preset.text
                  ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" data-testid="count-row">
        {[
          ['Words', counts.words, 'count-words'],
          ['Sentences', counts.sentences, 'count-sentences'],
          ['Syllables', counts.syllables, 'count-syllables'],
          ['Poly-\nsyllables', counts.polysyllables, 'count-polysyllables'],
          ['Characters', counts.characters, 'count-characters'],
          ['No spaces', counts.charactersNoSpaces, 'count-chars-nospaces'],
        ].map(([label, value, testid]) => (
          <div
            key={String(testid)}
            className="rounded-lg border border-gray-200 bg-white p-2 text-center dark:border-gray-800 dark:bg-gray-900"
            data-testid={String(testid)}
          >
            <span className="block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
              {String(label)}
            </span>
            <span className="block font-mono text-lg font-bold">{Number(value)}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ScoreCard
          label="Flesch Reading Ease"
          value={ease}
          hint={easeBand}
          testid="score-flesch"
        />
        <ScoreCard
          label="Flesch-Kincaid Grade"
          value={fmtGrade(scores.fleschKincaidGrade)}
          hint={gradeHint(scores.fleschKincaidGrade)}
          testid="score-flesch-kincaid"
        />
        <ScoreCard
          label="Gunning Fog"
          value={fmtGrade(scores.gunningFog)}
          testid="score-gunming-fog"
        />
        <ScoreCard label="SMOG" value={fmtGrade(scores.smog)} testid="score-smog" />
        <ScoreCard
          label="Coleman-Liau"
          value={fmtGrade(scores.colemanLiau)}
          testid="score-coleman-liau"
        />
        <ScoreCard label="AARI Grade" value={fmtGrade(scores.aariGrade)} testid="score-aari" />
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="summary-card"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Plain-language summary
        </span>
        <p className="text-sm text-gray-800 dark:text-gray-100" data-testid="summary-text">
          {summary}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300" data-testid="hints-list">
          {hints.map((hint, i) => (
            <li key={i}>• {hint}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Sentence breakdown
        </h3>
        {sentences.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="sentences-empty">
            No sentences detected yet.
          </p>
        ) : (
          <table className="w-full text-left text-xs" data-testid="sentence-table">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400">
                <th scope="col" className="py-1 pr-2">#</th>
                <th scope="col" className="py-1 pr-2">Sentence</th>
                <th scope="col" className="py-1 pr-2">Words</th>
                <th scope="col" className="py-1 pr-2">Grade</th>
                <th scope="col" className="py-1">Flag</th>
              </tr>
            </thead>
            <tbody>
              {sentences.map((s) => (
                <tr
                  key={s.index}
                  data-flagged={s.flagged ? 'true' : 'false'}
                  data-testid={`sentence-row-${s.index}`}
                  className={
                    s.flagged
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-transparent'
                  }
                >
                  <td className="py-1 pr-2 font-mono">{s.index + 1}</td>
                  <td className="py-1 pr-2 max-w-xs truncate">{s.text}</td>
                  <td className="py-1 pr-2 font-mono">{s.wordCount}</td>
                  <td className="py-1 pr-2 font-mono">{s.grade.toFixed(1)}</td>
                  <td className="py-1">
                    {s.flagged ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {s.reason}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap gap-2" data-testid="report-actions">
        <button
          type="button"
          onClick={handleCopyReport}
          data-testid="btn-copy-report"
          className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
        >
          Copy Markdown report
        </button>
        <button
          type="button"
          onClick={handleDownload}
          data-testid="btn-download-report"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Download .txt
        </button>
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All analysis runs locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};

function fmtGrade(value: number | null): string {
  return value === null ? '—' : value.toFixed(1);
}

function gradeHint(value: number | null): string {
  if (value === null) return 'Not enough text';
  if (value < 6) return 'Elementary level';
  if (value < 9) return 'Teen / general audience';
  if (value < 13) return 'High-school level';
  if (value < 16) return 'College level';
  return 'Advanced / professional';
}

function fleschBandLabel(score: number): string {
  if (score >= 90) return 'Very easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly easy';
  if (score >= 60) return 'Plain English';
  if (score >= 50) return 'Fairly difficult';
  if (score >= 30) return 'Difficult';
  return 'Very difficult';
}
