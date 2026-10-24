import type { Issue, RuleCounts, RuleId } from './types'

export interface RuleMeta {
  id: RuleId
  label: string
  filterLabel: string
  noteClass: string
  description: string
}

export const RULE_ORDER: RuleId[] = [
  'debugger',
  'console-log',
  'empty-catch',
  'loose-equality',
  'todo-comment',
]

export const RULE_META: Record<RuleId, RuleMeta> = {
  debugger: {
    id: 'debugger',
    label: '调试断点',
    filterLabel: '断点',
    noteClass: 'note-coral',
    description: '语法树中的 debugger 语句',
  },
  'console-log': {
    id: 'console-log',
    label: '调试日志',
    filterLabel: '日志',
    noteClass: 'note-yellow',
    description: 'console.log 调用',
  },
  'empty-catch': {
    id: 'empty-catch',
    label: '空 catch',
    filterLabel: '空 catch',
    noteClass: 'note-blue',
    description: '没有处理逻辑的异常捕获',
  },
  'loose-equality': {
    id: 'loose-equality',
    label: '宽松比较',
    filterLabel: '宽松比较',
    noteClass: 'note-lilac',
    description: '== 与 != 比较',
  },
  'todo-comment': {
    id: 'todo-comment',
    label: '待办注释',
    filterLabel: '待办',
    noteClass: 'note-mint',
    description: 'TODO / FIXME 注释',
  },
}

export function createEmptyCounts(): RuleCounts {
  return {
    debugger: 0,
    'console-log': 0,
    'empty-catch': 0,
    'loose-equality': 0,
    'todo-comment': 0,
  }
}

export function getRuleCounts(issues: Issue[]): RuleCounts {
  const counts = createEmptyCounts()
  for (const issue of issues) {
    counts[issue.rule] += 1
  }
  return counts
}
