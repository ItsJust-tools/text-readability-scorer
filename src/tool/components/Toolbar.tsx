'use client';

import React from 'react';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  const hasText = state.text.trim().length > 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="Readability tool controls">
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          disabled={!hasText}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear text
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...state, text: '' })}
          data-testid="btn-reset-text"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
          >
            Copy report
          </button>
        ) : null}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400" data-testid="toolbar-count">
        {state.text.length} characters
      </span>
    </div>
  );
};
