import { describe, expect, it } from 'vitest'
import { scanCode } from './analyzer'
import { applyCleanupProposal, buildCleanupProposal } from './cleanup'
import { DEMO_CODE } from './demo'
import type { Issue, ScanSuccess } from './types'

function getSuccess(code: string): ScanSuccess {
  const result = scanCode(code, 'javascript')
  if (result.status !== 'success') {
    throw new Error('Expected a successful scan')
  }
  return result
}

function byRule(result: ScanSuccess, rule: Issue['rule']): Issue {
  const issue = result.issues.find((candidate) => candidate.rule === rule)
  if (!issue) {
    throw new Error(`Missing ${rule}`)
  }
  return issue
}

describe('cleanup proposals', () => {
  it('previews and applies standalone debugger removal, then rescans', () => {
    const scan = getSuccess(DEMO_CODE)
    const issue = byRule(scan, 'debugger')
    const built = buildCleanupProposal(issue, DEMO_CODE, 'javascript')
    expect(built.ok).toBe(true)
    if (!built.ok) {
      return
    }

    expect(built.proposal.beforeSnippet).toContain('debugger;')
    expect(built.proposal.afterSnippet).not.toContain('debugger;')

    const applied = applyCleanupProposal(built.proposal, DEMO_CODE, 'javascript')
    expect(applied.ok).toBe(true)
    if (!applied.ok) {
      return
    }
    expect(applied.code).not.toContain('\ndebugger;')

    const rescanned = getSuccess(applied.code)
    expect(rescanned.total).toBe(5)
    expect(rescanned.counts.debugger).toBe(0)
    expect(rescanned.issues.some((candidate) => candidate.rule === 'debugger')).toBe(false)
  })

  it('does not offer automatic cleanup for side-effectful console.log arguments', () => {
    const scan = getSuccess('console.log(fetchPrice());')
    const issue = byRule(scan, 'console-log')
    expect(issue.cleanup.supported).toBe(false)
    const built = buildCleanupProposal(issue, 'console.log(fetchPrice());', 'javascript')
    expect(built.ok).toBe(false)
  })

  it('refuses to apply a proposal after the source code changed', () => {
    const scan = getSuccess(DEMO_CODE)
    const issue = byRule(scan, 'console-log')
    const built = buildCleanupProposal(issue, DEMO_CODE, 'javascript')
    expect(built.ok).toBe(true)
    if (!built.ok) {
      return
    }

    const changed = DEMO_CODE.replace('结算页已加载', '结算页已重新加载')
    const applied = applyCleanupProposal(built.proposal, changed, 'javascript')
    expect(applied.ok).toBe(false)
    if (!applied.ok) {
      expect(applied.message).toContain('重新扫描')
    }
  })

  it('refuses to apply a proposal in a different language mode', () => {
    const scan = getSuccess(DEMO_CODE)
    const issue = byRule(scan, 'debugger')
    const built = buildCleanupProposal(issue, DEMO_CODE, 'javascript')
    expect(built.ok).toBe(true)
    if (!built.ok) {
      return
    }

    const applied = applyCleanupProposal(built.proposal, DEMO_CODE, 'tsx')
    expect(applied.ok).toBe(false)
  })

  it('does not build cleanup for TODO comments, loose equality or empty catches', () => {
    const scan = getSuccess(DEMO_CODE)
    const manualRules: Issue['rule'][] = [
      'todo-comment',
      'loose-equality',
      'empty-catch',
    ]
    for (const rule of manualRules) {
      const issue = byRule(scan, rule)
      const built = buildCleanupProposal(issue, DEMO_CODE, 'javascript')
      expect(built.ok).toBe(false)
    }
  })

  it('keeps before and after line context for the preview', () => {
    const scan = getSuccess(DEMO_CODE)
    const issue = byRule(scan, 'console-log')
    const built = buildCleanupProposal(issue, DEMO_CODE, 'javascript')
    expect(built.ok).toBe(true)
    if (!built.ok) {
      return
    }
    expect(built.proposal.beforeSnippet).toContain('console.log')
    expect(built.proposal.afterSnippet.length).toBeGreaterThan(0)
    expect(built.proposal.removedWholeLine).toBe(true)
    expect(built.proposal.removedLineCount).toBe(1)
  })

  it('supports sequential cleanups with a fresh proposal each time', () => {
    const firstScan = getSuccess(DEMO_CODE)
    const firstBuilt = buildCleanupProposal(
      byRule(firstScan, 'debugger'),
      DEMO_CODE,
      'javascript',
    )
    if (!firstBuilt.ok) {
      throw new Error(firstBuilt.message)
    }
    const firstApplied = applyCleanupProposal(
      firstBuilt.proposal,
      DEMO_CODE,
      'javascript',
    )
    if (!firstApplied.ok) {
      throw new Error(firstApplied.message)
    }

    const secondScan = getSuccess(firstApplied.code)
    const secondBuilt = buildCleanupProposal(
      byRule(secondScan, 'console-log'),
      firstApplied.code,
      'javascript',
    )
    if (!secondBuilt.ok) {
      throw new Error(secondBuilt.message)
    }
    const secondApplied = applyCleanupProposal(
      secondBuilt.proposal,
      firstApplied.code,
      'javascript',
    )
    expect(secondApplied.ok).toBe(true)
    if (!secondApplied.ok) {
      return
    }
    expect(getSuccess(secondApplied.code).total).toBe(4)
  })
})
