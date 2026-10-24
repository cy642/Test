export type LanguageId = 'javascript' | 'jsx' | 'typescript' | 'tsx'

export type RuleId =
  | 'debugger'
  | 'console-log'
  | 'empty-catch'
  | 'loose-equality'
  | 'todo-comment'

export type RuleCounts = Record<RuleId, number>

export interface CleanupSupported {
  supported: true
  kind: 'remove-statement'
  start: number
  end: number
  replacement: ''
  editLabel: string
}

export interface CleanupUnavailable {
  supported: false
  reason: string
}

export type CleanupAvailability = CleanupSupported | CleanupUnavailable

export interface Issue {
  id: string
  rule: RuleId
  line: number
  endLine: number
  start: number
  end: number
  codeText: string
  snippet: string
  explanation: string
  suggestion: string
  cleanup: CleanupAvailability
}

export interface ScanBase {
  codeSnapshot: string
  language: LanguageId
  sourceHash: string
  scannedAt: number
  inputBytes: number
}

export interface ScanLocation {
  line: number
  column: number
}

export interface ScanSuccess extends ScanBase {
  status: 'success'
  issues: Issue[]
  counts: RuleCounts
  total: number
}

export interface ScanFailure extends ScanBase {
  status: 'error'
  reason: 'syntax' | 'limit' | 'internal'
  message: string
  parserMessage?: string
  location?: ScanLocation
}

export type ScanResult = ScanSuccess | ScanFailure

export interface ScanSnapshot {
  total: number
  counts: RuleCounts
}

export interface CleanupProposal {
  issueId: string
  rule: RuleId
  language: LanguageId
  sourceCode: string
  sourceHash: string
  editStart: number
  editEnd: number
  replacement: ''
  editLabel: string
  removedWholeLine: boolean
  removedLineCount: number
  beforeSnippet: string
  afterSnippet: string
  beforeStartLine: number
  afterStartLine: number
  targetStartLine: number
  targetEndLine: number
}

export interface CleanupUndo {
  beforeCode: string
  afterCode: string
  language: LanguageId
  issueId: string
  label: string
  createdAt: number
}

export interface FocusRequest {
  issueId: string
  start: number
  end: number
  line: number
  token: number
}
