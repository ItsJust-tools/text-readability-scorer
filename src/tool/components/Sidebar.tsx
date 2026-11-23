'use client';

import React from 'react';
import { type ToolState } from '../types';
import { SAMPLE_PRESETS } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const words = state.text.trim()
    ? (state.text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0)
    : 0;
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="readability-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Sample presets</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {SAMPLE_PRESETS.map((preset) => (
            <li key={preset.id} className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...state, text: preset.text })}
                className="text-violet-600 hover:underline dark:text-violet-400"
              >
                {preset.label}
              </button>
              <span className="text-gray-500 dark:text-gray-400">{preset.id}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Current input</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-word-count">
          {words} word{words === 1 ? '' : 's'} loaded
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">How scoring works</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <strong>Flesch Reading Ease</strong> — higher is easier (100 = very easy).
          </li>
          <li>
            <strong>Flesch-Kincaid, Fog, SMOG, Coleman-Liau, AARI</strong> — grade-level estimates;
            lower is easier.
          </li>
          <li>Flagged rows in the sentence table are long or hard sentences to rewrite first.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>Ctrl+Shift+C</kbd> — Copy Markdown report
          </li>
          <li>
            <kbd>Ctrl+Shift+S</kbd> — Download report
          </li>
          <li>
            <kbd>Ctrl+Shift+R</kbd> — Reset text
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current text; opening it
          restores the exact text and recomputes the same scores.
        </p>
      </div>
    </div>
  );
};
