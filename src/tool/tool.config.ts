import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'text-readability-scorer',
  name: 'Text Readability Scorer',
  description:
    'Grades text readability with Flesch Reading Ease, Flesch-Kincaid grade level, Gunning Fog, SMOG and Coleman-Liau indices plus a plain-language summary.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    accentSubtle: 'rgba(124, 58, 237, 0.08)',
    brand: 'Readability Scorer',
    icon: '📊',
  },
  shortcuts: [
    {
      title: 'Text Readability Scorer',
      shortcuts: [
        {
          keys: 'Ctrl+Shift+C',
          label: 'Copy Markdown report',
          description: 'copy the full readability report as Markdown',
        },
        {
          keys: 'Ctrl+Shift+S',
          label: 'Download report',
          description: 'download the full report as a .txt file',
        },
        {
          keys: 'Ctrl+Shift+R',
          label: 'Reset text',
          description: 'clear the editor and restore the sample text',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
