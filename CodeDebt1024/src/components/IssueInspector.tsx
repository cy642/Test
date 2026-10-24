import { useEffect, useRef } from 'react'
import { getLanguageOption } from '../lib/language'
import { RULE_META } from '../lib/rules'
import type { Issue, LanguageId } from '../lib/types'
import {
  AlertIcon,
  ArrowRightIcon,
  CloseIcon,
  LocateIcon,
} from './Icons'

interface IssueInspectorProps {
  issue: Issue
  language: LanguageId
  isStale: boolean
  onClose: () => void
  onLocate: () => void
  onPreviewCleanup: () => void
}

export function IssueInspector({
  issue,
  language,
  isStale,
  onClose,
  onLocate,
  onPreviewCleanup,
}: IssueInspectorProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const meta = RULE_META[issue.rule]
  const lineLabel =
    issue.endLine > issue.line
      ? `第 ${issue.line}–${issue.endLine} 行`
      : `第 ${issue.line} 行`

  useEffect(() => {
    closeRef.current?.focus()
  }, [issue.id])

  return (
    <>
      <button
        type="button"
        className="inspector-scrim"
        aria-label="关闭便签详情"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        className={`inspector ${meta.noteClass}`}
        ref={panelRef}
        aria-labelledby="inspector-title"
        data-testid="issue-inspector"
      >
        <span className="inspector-tape" aria-hidden="true" />
        <header className="inspector-head">
          <div>
            <span className="inspector-kicker">FOCUS NOTE / 便签详情</span>
            <div className="inspector-meta-line">
              <span className={`rule-stamp swatch-${issue.rule}`}>
                {meta.label}
              </span>
              <span className="inspector-line">{lineLabel}</span>
              <span className="inspector-lang">
                {getLanguageOption(language).shortLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭便签详情"
            onClick={onClose}
            ref={closeRef}
            data-testid="close-inspector"
          >
            <CloseIcon className="icon" />
          </button>
        </header>

        <div className="inspector-content">
          <h2 id="inspector-title">{issue.explanation}</h2>
          <p className="inspector-context">
            这条提示来自当前代码的语法树与注释，是一个需要你判断的关注项，而不是自动认定的 Bug。
          </p>

          <section className="inspector-section">
            <header className="inspector-section-head">
              <span>对应代码</span>
              <span className="mini-code-loc">{lineLabel}</span>
            </header>
            <pre className="inspector-code">
              <code>{issue.codeText}</code>
            </pre>
          </section>

          <section className="inspector-section">
            <header className="inspector-section-head">
              <span>处理建议</span>
            </header>
            <p className="inspector-suggestion">{issue.suggestion}</p>
          </section>

          <div
            className={`cleanup-readiness ${
              issue.cleanup.supported ? 'is-supported' : 'is-manual'
            }`}
          >
            <div className="readiness-icon" aria-hidden="true">
              {issue.cleanup.supported ? (
                <ArrowRightIcon className="icon" />
              ) : (
                <AlertIcon className="icon" />
              )}
            </div>
            <div>
              <strong>
                {issue.cleanup.supported ? '可预览代码级清理' : '需人工处理 / 复核'}
              </strong>
              <p>
                {issue.cleanup.supported
                  ? `${issue.cleanup.editLabel}。确认前只展示差异，不改源码。`
                  : issue.cleanup.reason}
              </p>
            </div>
          </div>

          {isStale ? (
            <p className="inspector-warning" role="status">
              <AlertIcon className="icon-sm" />
              代码已修改，这仍是上次扫描的便签。清理入口已暂停，请先重新扫描。
            </p>
          ) : null}
        </div>

        <footer className="inspector-actions">
          <button type="button" className="btn btn-paper" onClick={onLocate}>
            <LocateIcon className="icon-sm" />
            在代码中定位
          </button>
          {issue.cleanup.supported ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onPreviewCleanup}
              disabled={isStale}
              title={isStale ? '请重新扫描后再清理' : undefined}
              data-testid="preview-cleanup"
            >
              预览清理
              <ArrowRightIcon className="icon-sm" />
            </button>
          ) : (
            <span className="manual-note">不提供自动改写</span>
          )}
        </footer>
      </aside>
    </>
  )
}
