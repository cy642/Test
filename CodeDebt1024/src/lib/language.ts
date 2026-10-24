import type { LanguageId } from './types'

export interface LanguageOption {
  id: LanguageId
  label: string
  shortLabel: string
  extension: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: 'javascript',
    label: 'JavaScript',
    shortLabel: 'JS',
    extension: 'js',
  },
  { id: 'jsx', label: 'JavaScript + JSX', shortLabel: 'JSX', extension: 'jsx' },
  { id: 'typescript', label: 'TypeScript', shortLabel: 'TS', extension: 'ts' },
  { id: 'tsx', label: 'TypeScript + JSX', shortLabel: 'TSX', extension: 'tsx' },
]

export function getLanguageOption(language: LanguageId): LanguageOption {
  return (
    LANGUAGE_OPTIONS.find((option) => option.id === language) ??
    LANGUAGE_OPTIONS[0]
  )
}

export function getScratchFileName(language: LanguageId): string {
  return `scratch.${getLanguageOption(language).extension}`
}
