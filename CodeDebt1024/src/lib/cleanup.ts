import { validateSyntax } from './analyzer'
import type {
  CleanupProposal,
  Issue,
  LanguageId,
} from './types'
import { getLineWindow, hashSource, offsetToLine } from './utils'

export type ProposalResult =
  | { ok: true; proposal: CleanupProposal }
  | { ok: false; message: string }

export type ApplyResult =
  | { ok: true; code: string; proposal: CleanupProposal }
  | { ok: false; message: string }

function getLineStarts(code: string): number[] {
  const starts = [0]
  for (let index = 0; index < code.length; index += 1) {
    const char = code.charCodeAt(index)
    if (char === 10) {
      starts.push(index + 1)
    } else if (char === 13 && code.charCodeAt(index + 1) !== 10) {
      starts.push(index + 1)
    }
  }
  return starts
}

function getLineContentEnd(code: string, line: number, starts: number[]): number {
  const nextStart = starts[line] ?? code.length
  let end = nextStart
  while (end > 0 && (code[end - 1] === '\n' || code[end - 1] === '\r')) {
    end -= 1
  }
  return end
}

interface DeletionRange {
  start: number
  end: number
  wholeLine: boolean
  lineCount: number
}

function getDeletionRange(
  code: string,
  start: number,
  end: number,
): DeletionRange {
  const starts = getLineStarts(code)
  const startLine = offsetToLine(code, start)
  const endLine = offsetToLine(code, Math.max(start, end - 1))
  const lineStart = starts[startLine - 1] ?? 0
  const lineContentEnd = getLineContentEnd(code, endLine, starts)
  const before = code.slice(lineStart, start)
  const after = code.slice(end, lineContentEnd)
  const occupiesWholeLine = /^\s*$/.test(before) && /^\s*$/.test(after)

  if (occupiesWholeLine) {
    return {
      start: lineStart,
      end: starts[endLine] ?? code.length,
      wholeLine: true,
      lineCount: endLine - startLine + 1,
    }
  }

  return {
    start,
    end,
    wholeLine: false,
    lineCount: 0,
  }
}

export function buildCleanupProposal(
  issue: Issue,
  currentCode: string,
  language: LanguageId,
): ProposalResult {
  if (!issue.cleanup.supported) {
    return {
      ok: false,
      message: issue.cleanup.reason,
    }
  }

  if (
    currentCode.slice(issue.start, issue.end) !== issue.codeText ||
    issue.cleanup.start < 0 ||
    issue.cleanup.end > currentCode.length ||
    issue.cleanup.start >= issue.cleanup.end
  ) {
    return {
      ok: false,
      message: '代码已经变化，这条清理提案不再对应原文，请重新扫描。',
    }
  }

  const deletion = getDeletionRange(
    currentCode,
    issue.cleanup.start,
    issue.cleanup.end,
  )
  const nextCode =
    currentCode.slice(0, deletion.start) + currentCode.slice(deletion.end)
  const startLine = offsetToLine(currentCode, issue.cleanup.start)
  const endLine = offsetToLine(
    currentCode,
    Math.max(issue.cleanup.start, issue.cleanup.end - 1),
  )
  const beforeWindow = getLineWindow(currentCode, startLine, endLine, 1)

  const afterPoint = Math.min(deletion.start, nextCode.length)
  const afterLine = offsetToLine(nextCode, afterPoint)
  const afterWindow = getLineWindow(nextCode, afterLine, afterLine, 1)

  return {
    ok: true,
    proposal: {
      issueId: issue.id,
      rule: issue.rule,
      language,
      sourceCode: currentCode,
      sourceHash: hashSource(currentCode, language),
      editStart: deletion.start,
      editEnd: deletion.end,
      replacement: '',
      editLabel: issue.cleanup.editLabel,
      removedWholeLine: deletion.wholeLine,
      removedLineCount: deletion.lineCount,
      beforeSnippet: beforeWindow.text,
      afterSnippet: afterWindow.text,
      beforeStartLine: beforeWindow.startLine,
      afterStartLine: afterWindow.startLine,
      targetStartLine: startLine,
      targetEndLine: endLine,
    },
  }
}

export function applyCleanupProposal(
  proposal: CleanupProposal,
  currentCode: string,
  currentLanguage: LanguageId,
): ApplyResult {
  if (currentLanguage !== proposal.language) {
    return {
      ok: false,
      message: '语言模式已经变化，请重新扫描后再预览清理。',
    }
  }

  if (
    currentCode !== proposal.sourceCode ||
    hashSource(currentCode, currentLanguage) !== proposal.sourceHash
  ) {
    return {
      ok: false,
      message: '源代码已经变化，旧提案不能应用，请重新扫描。',
    }
  }

  const nextCode =
    currentCode.slice(0, proposal.editStart) +
    proposal.replacement +
    currentCode.slice(proposal.editEnd)

  if (nextCode === currentCode) {
    return {
      ok: false,
      message: '没有可应用的代码变更，请重新扫描。',
    }
  }

  const validation = validateSyntax(nextCode, currentLanguage)
  if (validation.ok === false) {
    const location = validation.location
      ? `第 ${validation.location.line} 行第 ${validation.location.column} 列`
      : '未知位置'
    return {
      ok: false,
      message: `清理后的代码无法解析（${location}），已取消修改：${validation.parserMessage}`,
    }
  }

  return {
    ok: true,
    code: nextCode,
    proposal,
  }
}
