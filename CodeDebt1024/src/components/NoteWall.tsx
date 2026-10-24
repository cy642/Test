import type { CSSProperties, KeyboardEvent } from 'react'
import { RULE_META, RULE_ORDER } from '../lib/rules'
import type { Issue, RuleId, ScanResult } from '../lib/types'
import { AlertIcon, ArrowRightIcon } from './Icons'

export type WallFilter = 'all' | RuleId

interface NoteWallProps {
  scan: ScanResult
  isStale: boolean
  filter: WallFilter
  onFilterChange: (filter: WallFilter) => void
  activeIssueId: string | null
  ghostIssue: Issue | null
  onSelectIssue: (issue: Issue) => void
  onScan: () => void
}

const TILTS = [-0.65, 0.5, 0.3, -0.4, 0.6, -0.25, 0.35, -0.55]

interface NoteCardProps {
  issue: Issue
  index: number
  active: boolean
  stale: boolean
  ghost: boolean
  onSelect: (issue: Issue) => void
}

function NoteCard({
  issue,
  index,
  active,
  stale,
  ghost,
  onSelect,
}: NoteCardProps) {
  const meta = RULE_META[issue.rule]
  const cleanable = issue.cleanup.supported
  const lineLabel =
    issue.endLine > issue.line
      ? `L${issue.line}–${issue.endLine}`
      : `L${issue.line}`
  const tautLine = TILTS[index % TILTS.length]
  const style = {
    '--tilt': `${tautLine}deg`,
    animationDelay: ghost ? undefined : `${Math.min(index, 8) * 45}ms`,
  } as CSSProperties

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(issue)
    }
  }

  return (
    <article
      className={[
        'note-card',
        meta.noteClass,
        active ? 'is-active' : '',
        stale ? 'is-stale' : '',
        ghost ? 'is-ghost is-leaving' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onClick={() => {
        if (!ghost) {
          onSelect(issue)
        }
      }}
      onKeyDown={ghost ? undefined : handleKeyDown}
      role={ghost ? undefined : 'button'}
      tabIndex={ghost ? undefined : 0}
      aria-hidden={ghost || undefined}
      aria-label={
        ghost
          ? undefined
          : `${meta.label}，第 ${issue.line} 行。${issue.explanation} 打开详情`
      }
      aria-pressed={ghost ? undefined : active}
      data-testid={`note-${issue.rule}`}
      data-issue-id={issue.id}
      data-rule={issue.rule}
    >
      <span
        className={`note-fastener ${index % 3 === 0 ? 'is-tape' : 'is-pin'}`}
        aria-hidden="true"
      />
      <header className="note-head">
        <span className="note-category">{meta.label}</span>
        <span className="note-line">{lineLabel}</span>
      </header>

      <p className="note-copy">{issue.explanation}</p>
      <pre className="note-code">
        <code>{issue.snippet}</code>
      </pre>

      <footer className="note-foot">
        <span
          className={`note-state ${cleanable ? 'is-cleanable' : 'is-manual'}`}
        >
          <span className="state-dot" aria-hidden="true" />
          {cleanable
            ? stale
              ? '重扫后可清理'
              : '可预览清理'
            : '需人工复核'}
        </span>
        <span className="note-open">
          打开便签
          <ArrowRightIcon className="icon-xs" />
        </span>
      </footer>

      <span className="note-fold" aria-hidden="true" />
    </article>
  )
}

function ScanErrorPanel({ scan, isStale }: { scan: ScanResult & { status: 'error' }; isStale: boolean }) {
  return (
    <div className="wall-message wall-message--error" role="alert">
      <span className="message-tape" aria-hidden="true" />
      <div className="message-kicker">
        <AlertIcon className="icon-sm" />
        扫描未完成
      </div>
      <h3>这段代码目前无法解析</h3>
      <p>
        {scan.reason === 'limit'
          ? scan.message
          : scan.reason === 'syntax'
            ? '语法树没有建立，因此不会把结果伪装成“0 个问题”。'
            : scan.message}
      </p>
      {scan.location ? (
        <p className="error-location">
          位置：第 {scan.location.line} 行，第 {scan.location.column} 列附近
        </p>
      ) : null}
      {scan.parserMessage ? (
        <pre className="parser-message">{scan.parserMessage}</pre>
      ) : null}
      <p className="message-footnote">
        {isStale
          ? '代码已再次修改，修正后请重新扫描。'
          : '请修正左侧代码后重新扫描；看板会继续保持“—”而不是 0。'}
      </p>
    </div>
  )
}

export function NoteWall({
  scan,
  isStale,
  filter,
  onFilterChange,
  activeIssueId,
  ghostIssue,
  onSelectIssue,
  onScan,
}: NoteWallProps) {
  const success = scan.status === 'success' ? scan : null
  const total = success?.total ?? null
  const visibleIssues =
    success?.issues.filter((issue) => filter === 'all' || issue.rule === filter) ??
    []
  const ghostVisible =
    ghostIssue && (filter === 'all' || ghostIssue.rule === filter)
      ? ghostIssue
      : null

  const combined = [
    ...visibleIssues,
    ...(ghostVisible ? [ghostVisible] : []),
  ].sort((left, right) => left.start - right.start)

  const totalsByRule = success?.counts
  const isFilteredEmpty =
    success !== null && success.total > 0 && visibleIssues.length === 0 && !ghostVisible
  const isCleanEmpty = success !== null && success.total === 0

  const filterCount = (nextFilter: WallFilter) => {
    if (!success) {
      return '—'
    }
    return nextFilter === 'all' ? success.total : totalsByRule?.[nextFilter] ?? 0
  }

  return (
    <section className="wall-panel" aria-label="关注项便签墙">
      <header className="wall-head">
        <div className="wall-title-wrap">
          <span className="wall-kicker">FOCUS WALL / 本轮关注项</span>
          <div className="wall-title-line">
            <h2>关注项便签墙</h2>
            <span className="wall-count">
              {total === null ? '—' : `${total} 张`}
            </span>
          </div>
        </div>
        <p className="wall-subtitle">
          只是静态提示，不是“确定错误”；每张便签都来自语法树。
        </p>
      </header>

      <div className="wall-body">
        <div className="filter-bar">
          <span className="filter-caption">筛选</span>
          <div className="filter-chips" role="group" aria-label="按类别筛选便签">
            <button
              type="button"
              className={`filter-chip ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => onFilterChange('all')}
              aria-pressed={filter === 'all'}
              disabled={!success}
              data-testid="filter-all"
            >
              全部
              <span className="filter-count">{filterCount('all')}</span>
            </button>
            {RULE_ORDER.map((rule) => (
              <button
                type="button"
                className={`filter-chip ${filter === rule ? 'is-active' : ''}`}
                onClick={() => onFilterChange(rule)}
                aria-pressed={filter === rule}
                disabled={!success}
                key={rule}
                data-testid={`filter-${rule}`}
              >
                <span className={`filter-swatch swatch-${rule}`} />
                {RULE_META[rule].filterLabel}
                <span className="filter-count">{filterCount(rule)}</span>
              </button>
            ))}
          </div>
          {isStale ? <span className="wall-old-tag">旧结果</span> : null}
        </div>

        <div className="wall-scroll">
          {scan.status === 'error' ? (
            <ScanErrorPanel scan={scan} isStale={isStale} />
          ) : isCleanEmpty ? (
            <div className="wall-message wall-message--empty">
              <span className="message-tape" aria-hidden="true" />
              <div className="empty-stamp">0 项</div>
              <h3>本次规则未发现关注项</h3>
              <p>
                五条本地规则扫描完成。这不代表代码绝对安全，也不等同于一次完整代码审计。
              </p>
              <button type="button" className="text-button" onClick={onScan}>
                再扫一次
                <ArrowRightIcon className="icon-xs" />
              </button>
            </div>
          ) : isFilteredEmpty ? (
            <div className="wall-message wall-message--empty is-small">
              <div className="empty-stamp">空分类</div>
              <h3>这个筛选下没有便签</h3>
              <p>分类筛选只影响便签展示，不影响全局统计口径。</p>
              <button
                type="button"
                className="text-button"
                onClick={() => onFilterChange('all')}
              >
                查看全部便签
                <ArrowRightIcon className="icon-xs" />
              </button>
            </div>
          ) : (
            <div className={`note-grid ${combined.length <= 1 ? 'is-sparse' : ''}`}>
              {combined.map((issue, index) => (
                <NoteCard
                  key={`${scan.sourceHash}-${issue.id}`}
                  issue={issue}
                  index={index}
                  active={issue.id === activeIssueId}
                  stale={isStale}
                  ghost={ghostVisible?.id === issue.id}
                  onSelect={onSelectIssue}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="wall-foot">
          <span>本地静态规则 · 不上传 · 不执行用户代码</span>
          <span>
            {success
              ? `${success.issues.filter((issue) => issue.cleanup.supported).length} 项可预览清理`
              : '等待有效扫描'}
          </span>
        </footer>
      </div>
    </section>
  )
}
