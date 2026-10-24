import { useEffect, useRef, useState } from 'react'
import { CleanupDialog } from './components/CleanupDialog'
import { CodeEditor } from './components/CodeEditor'
import { Dashboard } from './components/Dashboard'
import { AlertIcon, RefreshIcon, ScanIcon, UndoIcon } from './components/Icons'
import { IssueInspector } from './components/IssueInspector'
import { NoteWall, type WallFilter } from './components/NoteWall'
import { applyCleanupProposal, buildCleanupProposal } from './lib/cleanup'
import { DEMO_CODE } from './lib/demo'
import { RULE_META } from './lib/rules'
import { scanCode } from './lib/analyzer'
import type {
  CleanupProposal,
  CleanupUndo,
  FocusRequest,
  Issue,
  LanguageId,
  ScanResult,
  ScanSnapshot,
  ScanSuccess,
} from './lib/types'
import { MAX_SOURCE_BYTES, byteLength, formatTime } from './lib/utils'

type ToastTone = 'success' | 'error' | 'stale' | 'info'

interface ToastMessage {
  id: number
  message: string
  tone: ToastTone
}

interface InitialState {
  scan: ScanResult
  baseline: ScanSnapshot | null
}

function toSnapshot(scan: ScanSuccess): ScanSnapshot {
  return {
    total: scan.total,
    counts: { ...scan.counts },
  }
}

function createInitialState(): InitialState {
  const scan = scanCode(DEMO_CODE, 'javascript')
  return {
    scan,
    baseline: scan.status === 'success' ? toSnapshot(scan) : null,
  }
}

export default function App() {
  const [initial] = useState<InitialState>(() => createInitialState())
  const [code, setCode] = useState(DEMO_CODE)
  const [language, setLanguage] = useState<LanguageId>('javascript')
  const [scan, setScan] = useState<ScanResult>(initial.scan)
  const [baseline, setBaseline] = useState<ScanSnapshot | null>(
    initial.baseline,
  )
  const [filter, setFilter] = useState<WallFilter>('all')
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const [proposal, setProposal] = useState<CleanupProposal | null>(null)
  const [undo, setUndo] = useState<CleanupUndo | null>(null)
  const [ghostIssue, setGhostIssue] = useState<Issue | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [announcement, setAnnouncement] = useState(
    '已载入演示代码并完成首次扫描。',
  )

  const focusTokenRef = useRef(0)
  const toastCounterRef = useRef(0)
  const ghostTimerRef = useRef<number | null>(null)

  const isStale =
    scan.codeSnapshot !== code || scan.language !== language
  const success = scan.status === 'success' ? scan : null
  const issues = success?.issues ?? []
  const activeIssue = activeIssueId
    ? issues.find((issue) => issue.id === activeIssueId) ?? null
    : null
  const undoReady =
    undo !== null &&
    !isStale &&
    language === undo.language &&
    code === undo.afterCode
  const staleLabel =
    scan.language !== language
      ? '语言模式已切换，请重新扫描'
      : '代码已修改，请重新扫描'
  const roundStatus = isStale
    ? { tone: 'stale', title: '结果已过期', detail: '便签与数字来自上次扫描' }
    : scan.status === 'error'
      ? {
          tone: 'error',
          title: '扫描未完成',
          detail: scan.location
            ? `第 ${scan.location.line} 行附近需要修正`
            : '请检查语法或被拒绝的输入',
        }
      : {
          tone: 'ok',
          title: '结果已同步',
          detail: `最近扫描 ${formatTime(scan.scannedAt)}`,
        }

  const clearGhostTimer = () => {
    if (ghostTimerRef.current !== null) {
      window.clearTimeout(ghostTimerRef.current)
      ghostTimerRef.current = null
    }
  }

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(null), 3400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    return () => clearGhostTimer()
  }, [])

  useEffect(() => {
    if (!activeIssueId || proposal) {
      return
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveIssueId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIssueId, proposal])

  function notify(message: string, tone: ToastTone = 'info') {
    toastCounterRef.current += 1
    setToast({ id: toastCounterRef.current, message, tone })
  }

  function focusIssue(issue: Issue) {
    focusTokenRef.current += 1
    setActiveIssueId(issue.id)
    setFocusRequest({
      issueId: issue.id,
      start: issue.start,
      end: issue.end,
      line: issue.line,
      token: focusTokenRef.current,
    })
  }

  function handleSelectIssue(issue: Issue) {
    focusIssue(issue)
  }

  function handleLocate() {
    if (activeIssue) {
      focusIssue(activeIssue)
    }
  }

  function handleCodeChange(nextCode: string) {
    if (byteLength(nextCode) > MAX_SOURCE_BYTES) {
      notify('输入超过 100 KB 上限，本次修改没有写入编辑器。', 'error')
      return
    }
    clearGhostTimer()
    setGhostIssue(null)
    setProposal(null)
    setCode(nextCode)
  }

  function handleLanguageChange(nextLanguage: LanguageId) {
    if (nextLanguage === language) {
      return
    }
    clearGhostTimer()
    setGhostIssue(null)
    setProposal(null)
    setLanguage(nextLanguage)
  }

  function handleScan() {
    const nextScan = scanCode(code, language)
    clearGhostTimer()
    setGhostIssue(null)
    setProposal(null)
    setScan(nextScan)

    if (nextScan.status === 'success') {
      const nextBaseline = baseline ?? toSnapshot(nextScan)
      if (!baseline) {
        setBaseline(nextBaseline)
      }
      if (
        activeIssueId &&
        !nextScan.issues.some((issue) => issue.id === activeIssueId)
      ) {
        setActiveIssueId(null)
      }
      setAnnouncement(
        `扫描完成。当前共有 ${nextScan.total} 个关注项，其中 ${nextScan.issues.filter((issue) => issue.cleanup.supported).length} 个可预览清理。`,
      )
      notify(
        baseline
          ? `扫描完成：${nextScan.total} 个关注项。基线保持 ${baseline.total} 项。`
          : `首次有效扫描：已建立 ${nextScan.total} 项基线。`,
        'info',
      )
      return
    }

    setActiveIssueId(null)
    setProposal(null)
    setAnnouncement('扫描未完成。请根据提示检查代码的语法位置。')
    notify('扫描未完成，请先修正左侧代码的语法位置。', 'error')
  }

  function handleLoadDemo() {
    const nextScan = scanCode(DEMO_CODE, 'javascript')
    const nextBaseline =
      nextScan.status === 'success' ? toSnapshot(nextScan) : null

    clearGhostTimer()
    setGhostIssue(null)
    setCode(DEMO_CODE)
    setLanguage('javascript')
    setScan(nextScan)
    setBaseline(nextBaseline)
    setFilter('all')
    setActiveIssueId(null)
    setFocusRequest(null)
    setProposal(null)
    setUndo(null)
    setAnnouncement(
      nextScan.status === 'success'
        ? `已重新载入演示，开始新一轮。基线为 ${nextScan.total} 个关注项。`
        : '已重新载入演示，但扫描未完成。',
    )
    notify(
      nextScan.status === 'success'
        ? `已重新载入演示：新一轮基线 ${nextScan.total} 项。`
        : '已重新载入演示，但扫描未完成。',
      'success',
    )
  }

  function handleRequestCleanup() {
    if (!activeIssue) {
      return
    }
    if (isStale) {
      notify('代码已变化，请重新扫描后再清理。', 'stale')
      return
    }
    const result = buildCleanupProposal(activeIssue, code, language)
    if (!result.ok) {
      notify(result.message, 'error')
      return
    }
    setProposal(result.proposal)
  }

  function handleConfirmCleanup() {
    if (!proposal) {
      return
    }
    if (isStale) {
      setProposal(null)
      notify('源代码已经变化，旧清理提案已失效，请重新扫描。', 'error')
      return
    }
    if (scan.status !== 'success') {
      setProposal(null)
      notify('当前没有有效的扫描结果，请重新扫描。', 'error')
      return
    }

    const target = scan.issues.find((issue) => issue.id === proposal.issueId)
    if (!target) {
      setProposal(null)
      notify('目标关注项已经不在本次扫描中，旧提案不能应用。', 'error')
      return
    }

    const applied = applyCleanupProposal(proposal, code, language)
    if (!applied.ok) {
      setProposal(null)
      notify(applied.message, 'error')
      return
    }

    const nextScan = scanCode(applied.code, language)
    if (nextScan.status !== 'success') {
      setProposal(null)
      notify(
        '清理后的代码无法解析，已保留原代码，没有写回任何修改。',
        'error',
      )
      return
    }

    const disappeared = !nextScan.issues.some(
      (issue) => issue.id === proposal.issueId,
    )
    const nextBaseline = baseline ?? toSnapshot(nextScan)

    clearGhostTimer()
    setUndo({
      beforeCode: code,
      afterCode: applied.code,
      language,
      issueId: proposal.issueId,
      label: RULE_META[proposal.rule].label,
      createdAt: Date.now(),
    })
    setCode(applied.code)
    setScan(nextScan)
    setBaseline(nextBaseline)
    setProposal(null)
    setActiveIssueId(null)
    setFocusRequest(null)
    if (disappeared) {
      setGhostIssue(target)
      ghostTimerRef.current = window.setTimeout(() => {
        setGhostIssue(null)
        ghostTimerRef.current = null
      }, 760)
    } else {
      setGhostIssue(null)
    }

    const beforeTotal = scan.total
    setAnnouncement(
      `清理已写回代码。关注项从 ${beforeTotal} 个变为 ${nextScan.total} 个。`,
    )
    notify(
      `已写回代码：${beforeTotal} → ${nextScan.total} 个关注项，统计同步更新。`,
      'success',
    )
  }

  function handleUndo() {
    if (!undo) {
      return
    }
    if (!undoReady) {
      notify('源代码在这个清理点之后又被修改，无法安全撤销。', 'error')
      return
    }

    const nextScan = scanCode(undo.beforeCode, undo.language)
    if (nextScan.status !== 'success') {
      notify('撤销前的代码无法通过解析，本次撤销已取消。', 'error')
      return
    }

    clearGhostTimer()
    setGhostIssue(null)
    setCode(undo.beforeCode)
    setLanguage(undo.language)
    setScan(nextScan)
    setUndo(null)
    setProposal(null)
    setActiveIssueId(null)
    setFocusRequest(null)
    setAnnouncement(
      `已撤销上次清理。关注项恢复到 ${nextScan.total} 个，代码与统计均已恢复。`,
    )
    notify(
      `已撤销上次清理，代码与统计恢复为 ${nextScan.total} 个关注项。`,
      'success',
    )
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="brand-cluster">
          <div className="event-ticket" aria-hidden="true">
            <span className="ticket-year">1024</span>
            <span className="ticket-label">TRAE</span>
            <span className="ticket-live">LIVE BUILD</span>
            <span className="ticket-punch" />
          </div>
          <div className="brand-copy">
            <p className="brand-kicker">CODE DEBT · LOCAL STATIC REVIEW</p>
            <h1>
              <span className="title-ink">码上清债</span>
              <span className="title-edition">现场版</span>
            </h1>
            <p className="tagline">
              代码一贴，问题上墙；改掉一处，数据跟着变。
            </p>
          </div>
        </div>

        <div className="header-side">
          <div
            className={`round-status is-${roundStatus.tone}`}
            role="status"
            data-testid="round-status"
          >
            <span className="round-dot" aria-hidden="true" />
            <div>
              <strong>{roundStatus.title}</strong>
              <span>{roundStatus.detail}</span>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="btn btn-paper"
              onClick={handleLoadDemo}
              data-testid="load-demo"
              title="重新载入演示代码，并建立新一轮基线"
            >
              <RefreshIcon className="icon-sm" />
              重新载入演示
              <span className="btn-sub">新一轮</span>
            </button>
            <button
              type="button"
              className="btn btn-paper"
              onClick={handleUndo}
              disabled={!undoReady}
              data-testid="undo-cleanup"
              title={
                undo
                  ? undoReady
                    ? '恢复上一次清理前的代码并重新扫描'
                    : '代码已被继续修改，撤销点已失效'
                  : '还没有可撤销的清理'
              }
            >
              <UndoIcon className="icon-sm" />
              撤销上次清理
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleScan}
              data-testid="scan-button"
            >
              <ScanIcon className="icon-sm" />
              扫描代码
            </button>
          </div>
        </div>
      </header>

      <Dashboard scan={scan} baseline={baseline} isStale={isStale} />

      {isStale ? (
        <div className="stale-banner" role="status" data-testid="stale-banner">
          <AlertIcon className="icon-sm" />
          <div>
            <strong>{staleLabel}</strong>
            <span>
              当前便签和台账仍来自上次扫描，基于旧代码的清理入口已暂停。
            </span>
          </div>
          <button
            type="button"
            className="stale-action"
            onClick={handleScan}
            data-testid="stale-scan"
          >
            立即重新扫描
          </button>
        </div>
      ) : null}

      <main className="workspace">
        <CodeEditor
          code={code}
          language={language}
          issues={issues}
          activeIssue={activeIssue}
          focusRequest={focusRequest}
          isStale={isStale}
          scan={scan}
          onChange={handleCodeChange}
          onLanguageChange={handleLanguageChange}
          onScan={handleScan}
        />

        <div className="wall-slot">
          <NoteWall
            scan={scan}
            isStale={isStale}
            filter={filter}
            onFilterChange={setFilter}
            activeIssueId={activeIssueId}
            ghostIssue={ghostIssue}
            onSelectIssue={handleSelectIssue}
            onScan={handleScan}
          />
          {activeIssue ? (
            <IssueInspector
              issue={activeIssue}
              language={language}
              isStale={isStale}
              onClose={() => setActiveIssueId(null)}
              onLocate={handleLocate}
              onPreviewCleanup={handleRequestCleanup}
            />
          ) : null}
        </div>
      </main>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {proposal ? (
        <CleanupDialog
          proposal={proposal}
          language={language}
          isStale={isStale}
          onClose={() => setProposal(null)}
          onConfirm={handleConfirmCleanup}
        />
      ) : null}

      {toast ? (
        <div
          className={`toast toast--${toast.tone}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          data-testid="toast"
        >
          <span className="toast-mark" aria-hidden="true" />
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}
