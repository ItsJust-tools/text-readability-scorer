import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_HARD_SENTENCE_FLESCH,
  DEFAULT_LONG_SENTENCE_THRESHOLD,
  DEFAULT_STATE,
  SAMPLE_SOURCE_NEWS,
  type ToolState,
} from './types';

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    text: state.text,
    longSentenceThreshold: state.longSentenceThreshold,
    hardSentenceFlesch: state.hardSentenceFlesch,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected readability scorer state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    text: typeof v.text === 'string' ? v.text : DEFAULT_STATE.text,
    longSentenceThreshold: clampNumber(
      v.longSentenceThreshold,
      DEFAULT_LONG_SENTENCE_THRESHOLD,
      5,
      100
    ),
    hardSentenceFlesch: clampNumber(v.hardSentenceFlesch, DEFAULT_HARD_SENTENCE_FLESCH, 0, 100),
  };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const textReadabilityScorerTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE, text: SAMPLE_SOURCE_NEWS },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
