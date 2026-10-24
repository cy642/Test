import { useEffect, useRef } from 'react'
import { getLanguageOption } from '../lib/language'
import { RULE_META } from '../lib/rules'
import type { CleanupProposal, LanguageId } from '../lib/types'
import {
  AlertIcon,
  ArrowRightIcon,
  CloseIcon,
  FileCodeIcon,
} from './Icons'

interface CleanupDialogProps {
  proposal: CleanupProposal
  language: LanguageId
  isStale: boolean
  onClose: () => void
  onConfirm: () => void
}

interface PreviewLinesProps {
  text: string
  startLine: number
  targetStart?: number
  targetEnd?: number
  tone: 'before' | 'after'
}

function PreviewLines({
  text,
  startLine,
  targetStart,
  targetEnd,
  tone,
}: PreviewLinesProps) {
  const lines = text.split('\n')
  return (
    <div className={`preview-lines preview-lines--${tone}`}>
      {lines.map((line, index) => {
        const lineNumber = startLine + index
        const isTarget =
          targetStart !== undefined &&
          targetEnd !== undefined &&
          lineNumber >= targetStart &&
          lineNumber <= targetEnd
        return (
          <div
            className={`preview-line ${isTarget ? 'is-target' : ''}`}
            key={`${tone}-${lineNumber}`}
          >
            <span className="preview-line-number">{lineNumber}</span>
            <code>{line.length > 0 ? line : ' '}</code>
          </div>
        )
      })}
    </div>
  )
}

export function CleanupDialog({
  proposal,
  language,
  isStale,
  onClose,
  onConfirm,
}: CleanupDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const meta = RULE_META[proposal.rule]

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="cleanup-dialog"
    >
      <div
        className="cleanup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleanup-dialog-title"
        aria-describedby="cleanup-dialog-desc"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="dialog-tape" aria-hidden="true" />
        <header className="cleanup-dialog-head">
          <div>
            <span className="dialog-kicker">CLEANUP PREVIEW / 清理预览</span>
            <div className="dialog-title-line">
              <span className={`rule-stamp swatch-${proposal.rule}`}>
                {meta.label}
              </span>
              <h2 id="cleanup-dialog-title">这次改动只会删除代码</h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="取消清理预览"
            ref={closeRef}
            data-testid="close-cleanup"
          >
            <CloseIcon className="icon" />
          </button>
        </header>

        <p className="cleanup-dialog-desc" id="cleanup-dialog-desc">
          {proposal.editLabel}。确认后会先写回代码并立即重新扫描，统计不靠按钮“标记”，只跟真实结果变化。
        </p>

        <div className="diff-head">
          <span className="diff-flag before">修改前</span>
          <span className="diff-arrow" aria-hidden="true">
            <ArrowRightIcon className="icon-sm" />
          </span>
          <span className="diff-flag after">修改后</span>
        </div>

        <div className="diff-grid">
          <section className="diff-pane diff-pane--before" aria-label="修改前代码">
            <header>
              <FileCodeIcon className="icon-sm" />
              <span>原始代码</span>
              <span className="diff-lang">
                {getLanguageOption(language).shortLabel}
              </span>
            </header>
            <PreviewLines
              text={proposal.beforeSnippet}
              startLine={proposal.beforeStartLine}
              targetStart={proposal.targetStartLine}
              targetEnd={proposal.targetEndLine}
              tone="before"
            />
          </section>

          <section
            className="diff-pane diff-pane--after"
            aria-label="修改后代码"
            data-testid="cleanup-after"
          >
            <header>
              <FileCodeIcon className="icon-sm" />
              <span>写回后的代码</span>
              <span className="diff-lang">重扫</span>
            </header>
            <PreviewLines
              text={proposal.afterSnippet}
              startLine={proposal.afterStartLine}
              tone="after"
            />
          </section>
        </div>

        <div className="cleanup-assurance">
          <strong>
            {proposal.removedWholeLine
              ? `将整行删除第 ${proposal.targetStartLine}${
                  proposal.targetEndLine > proposal.targetStartLine
                    ? `–${proposal.targetEndLine}`
                    : ''
                } 行，共 ${proposal.removedLineCount} 行。`
              : `将删除第 ${proposal.targetStartLine} 行中的对应语句。`}
          </strong>
          <span>
            其他代码保持不变；修改后会重新解析，若无法解析则取消写回。
          </span>
        </div>

        {isStale ? (
          <p className="dialog-warning" role="alert">
            <AlertIcon className="icon-sm" />
            源代码已变化，或语言模式已切换。这份旧提案不能应用，请关闭后重新扫描。
          </p>
        ) : null}

        <footer className="cleanup-dialog-actions">
          <button
            type="button"
            className="btn btn-paper"
            onClick={onClose}
            data-testid="cancel-cleanup"
          >
            先不改
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={isStale}
            title={isStale ? '旧提案已失效，请重新扫描' : undefined}
            data-testid="confirm-cleanup"
          >
            确认清理并重扫
            <ArrowRightIcon className="icon-sm" />
          </button>
        </footer>
      </div>
    </div>
  )
}
