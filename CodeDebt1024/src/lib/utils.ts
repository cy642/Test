import type { LanguageId } from './types'

export const MAX_SOURCE_BYTES = 100 * 1024

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function hashSource(code: string, language: LanguageId): string {
  const input = `${language}\u0000${code}`
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${(hash >>> 0).toString(16).padStart(8, '0')}-${input.length.toString(16)}`
}

export function offsetToLine(code: string, offset: number): number {
  const safeOffset = Math.max(0, Math.min(offset, code.length))
  let line = 1
  for (let index = 0; index < safeOffset; index += 1) {
    const char = code.charCodeAt(index)
    if (char === 10) {
      line += 1
    } else if (char === 13) {
      if (code.charCodeAt(index + 1) !== 10) {
        line += 1
      }
    }
  }
  return line
}

export function getLineCount(code: string): number {
  const normalized = code.replace(/\r\n/g, '\n')
  return normalized.split('\n').length
}

export function getLineText(code: string, targetLine: number): string {
  const lines = code.replace(/\r\n/g, '\n').split('\n')
  return lines[targetLine - 1] ?? ''
}

export function getLineWindow(
  code: string,
  startLine: number,
  endLine: number,
  context = 1,
): { startLine: number; text: string } {
  const lines = code.replace(/\r\n/g, '\n').split('\n')
  const from = Math.max(1, startLine - context)
  const to = Math.min(lines.length, endLine + context)
  return {
    startLine: from,
    text: lines.slice(from - 1, to).join('\n'),
  }
}

export function collapseSnippet(text: string, limit = 120): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= limit) {
    return singleLine
  }
  return `${singleLine.slice(0, limit - 1)}…`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(timestamp)
}

export function formatSigned(value: number): string {
  if (value > 0) {
    return `+${value}`
  }
  if (value < 0) {
    return `−${Math.abs(value)}`
  }
  return '0'
}
