import { useEffect, useMemo, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { getLanguageOption, LANGUAGE_OPTIONS } from '../lib/language'
import { RULE_META } from '../lib/rules'
import type {
  FocusRequest,
  Issue,
  LanguageId,
  ScanResult,
} from '../lib/types'
import {
  MAX_SOURCE_BYTES,
  byteLength,
  formatBytes,
  formatTime,
  getLineCount,
} from '../lib/utils'
import { AlertIcon, FileCodeIcon, LockIcon, RefreshIcon } from './Icons'

const LINE_HEIGHT = 22
const PADDING_TOP = 16

interface CodeEditorProps {
  code: string
  language: LanguageId
  issues: Issue[]
  activeIssue: Issue | null
  focusRequest: FocusRequest | null
  isStale: boolean
  scan: ScanResult
  onChange: (code: string) => void
  onLanguageChange: (language: LanguageId) => void
  onScan: () => void
}

export function CodeEditor({
  code,
  language,
  issues,
  activeIssue,
  focusRequest,
  isStale,
  scan,
  onChange,
  onLanguageChange,
  onScan,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterInnerRef = useRef<HTMLDivElement>(null)
  const glowLayerRef = useRef<HTMLDivElement>(null)
  const lineCount = useMemo(() => Math.max(getLineCount(code), 1), [code])
  const inputBytes = useMemo(() => byteLength(code), [code])
  const languageOption = getLanguageOption(language)

  const markersByLine = useMemo(() => {
    const map = new Map<number, Issue[]>()
    for (const issue of issues) {
      const list = map.get(issue.line) ?? []
      list.push(issue)
      map.set(issue.line, list)
    }
    return map
  }, [issues])

  const activeLines = useMemo(() => {
    if (!activeIssue) {
      return []
    }
    const lines: number[] = []
    for (let line = activeIssue.line; line <= activeIssue.endLine; line += 1) {
      lines.push(line)
    }
    return lines
  }, [activeIssue])

  const syncScroll = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    const transform = `translateY(-${textarea.scrollTop}px)`
    if (gutterInnerRef.current) {
      gutterInnerRef.current.style.transform = transform
    }
    if (glowLayerRef.current) {
      glowLayerRef.current.style.transform = transform
    }
  }

  useEffect(() => {
    if (!focusRequest) {
      return
    }
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const nextTop = Math.max(
      0,
      (focusRequest.line - 4) * LINE_HEIGHT + PADDING_TOP,
    )
    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(focusRequest.start, focusRequest.end)
    textarea.scrollTop = nextTop
    syncScroll()
  }, [focusRequest])

  const handleScroll = () => {
    syncScroll()
  }

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onScan()
    }
  }

  const status =
    isStale
      ? {
          tone: 'stale',
          label:
            scan.language !== language
              ? '语言模式已切换 · 待重扫'
              : '代码已修改 · 待重扫',
        }
      : scan.status === 'error'
        ? {
            tone: 'error',
            label: scan.location
              ? `语法错误 · 第 ${scan.location.line} 行`
              : '扫描未完成',
          }
        : {
            tone: 'ok',
            label: `已同步 · ${scan.total} 项`,
          }

  return (
    <section className="code-panel" aria-label="代码编辑与本地扫描">
      <header className="code-panel-head">
        <div className="code-file">
          <FileCodeIcon className="icon" />
          <div>
            <strong>{`scratch.${languageOption.extension}`}</strong>
            <span className="code-file-sub">本地草稿</span>
          </div>
        </div>

        <div className="code-panel-tools">
          <span className="local-flag">
            <LockIcon className="icon-sm" />
            不执行 · 不上传
          </span>
          <label className="language-picker">
            <span>语法模式</span>
            <select
              value={language}
              onChange={(event) =>
                onLanguageChange(event.target.value as LanguageId)
              }
              aria-label="选择代码语法模式"
              data-testid="language-select"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option value={option.id} key={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="editor-shell">
        <div className="editor-titlebar">
          <div className="traffic-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="editor-label">PASTE ZONE / 语法树待扫描</span>
          <span className={`editor-sync editor-sync--${status.tone}`}>
            <span className="status-dot" />
            {status.label}
          </span>
        </div>

        <div className="editor-body">
          <div className="line-gutter" aria-hidden="true">
            <div className="gutter-inner" ref={gutterInnerRef}>
              {Array.from({ length: lineCount }, (_, index) => {
                const line = index + 1
                const markers = markersByLine.get(line) ?? []
                return (
                  <div className="gutter-line" key={line}>
                    <span className="gutter-number">{line}</span>
                    <span className="gutter-markers">
                      {markers.slice(0, 3).map((issue) => (
                        <span
                          key={issue.id}
                          className={`gutter-dot swatch-${issue.rule}`}
                          title={`${RULE_META[issue.rule].label} · 第 ${issue.line} 行`}
                        />
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="code-stage">
            <div className="line-glow-layer" ref={glowLayerRef} aria-hidden="true">
              {activeLines.map((line) => (
                <div
                  className="code-line-glow"
                  key={line}
                  style={{ top: PADDING_TOP + (line - 1) * LINE_HEIGHT }}
                />
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="code-textarea"
              value={code}
              onChange={(event) => onChange(event.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleEditorKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              aria-label="可编辑代码区"
              aria-describedby="editor-help"
              data-testid="code-editor"
            />
          </div>
        </div>

        <div className="editor-footer" id="editor-help">
          <div className="editor-metrics">
            <span>
              {formatBytes(inputBytes)} / {formatBytes(MAX_SOURCE_BYTES)}
            </span>
            <span>{lineCount} 行</span>
            <span>{languageOption.shortLabel}</span>
            {!isStale && scan.status === 'success' ? (
              <span className="editor-time">{formatTime(scan.scannedAt)}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="scan-inline"
            onClick={onScan}
            data-testid="scan-inline"
          >
            <RefreshIcon className="icon-sm" />
            重新扫描
            <kbd>⌘↵</kbd>
          </button>
        </div>
      </div>

      <div className="code-panel-note">
        {isStale ? (
          <>
            <AlertIcon className="icon-sm" />
            结果是上一次扫描的，重新扫描后才会恢复清理入口。
          </>
        ) : activeIssue ? (
          <>
            <span className={`inline-swatch swatch-${activeIssue.rule}`} />
            已定位第 {activeIssue.line} 行，代码区中金色选区即为命中范围。
          </>
        ) : (
          <>
            <span className="note-arrow" aria-hidden="true">
              ↙
            </span>
            点击右侧便签，左侧代码会滚动并选中对应范围。
          </>
        )}
      </div>
    </section>
  )
}
