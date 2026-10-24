import { parse } from '@babel/parser'
import type { ParserPlugin } from '@babel/parser'
import { getRuleCounts } from './rules'
import type {
  CleanupAvailability,
  Issue,
  LanguageId,
  RuleId,
  ScanFailure,
  ScanLocation,
  ScanResult,
  ScanSuccess,
} from './types'
import {
  MAX_SOURCE_BYTES,
  byteLength,
  collapseSnippet,
  hashSource,
  offsetToLine,
} from './utils'

interface AstNode {
  type: string
  start: number | null
  end: number | null
  loc?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  } | null
  [key: string]: unknown
}

interface AstComment {
  type: string
  value: string
  start: number
  end: number
  loc?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  } | null
}

interface NodeEntry {
  node: AstNode
  parent: AstNode | null
}

interface SyntaxValidation {
  ok: true
}

interface SyntaxValidationError {
  ok: false
  parserMessage: string
  location?: ScanLocation
}

export type SyntaxValidationResult = SyntaxValidation | SyntaxValidationError

const PARSER_PLUGINS: Record<LanguageId, ParserPlugin[]> = {
  javascript: [],
  jsx: ['jsx'],
  typescript: ['typescript'],
  tsx: ['typescript', 'jsx'],
}

const SKIPPED_NODE_KEYS = new Set([
  'loc',
  'extra',
  'tokens',
  'comments',
  'leadingComments',
  'trailingComments',
  'innerComments',
])

const STATEMENT_LIST_KEYS = new Set(['Program', 'BlockStatement', 'StaticBlock', 'TSModuleBlock'])

function isAstNode(value: unknown): value is AstNode {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.start === 'number' &&
    typeof candidate.end === 'number'
  )
}

function parseWithBabel(
  code: string,
  language: LanguageId,
): { ok: true; ast: AstNode; comments: AstComment[] } | SyntaxValidationError {
  try {
    const parsed = parse(code, {
      sourceType: 'unambiguous',
      plugins: PARSER_PLUGINS[language],
      allowReturnOutsideFunction: false,
      attachComment: true,
    })
    return {
      ok: true,
      ast: parsed as unknown as AstNode,
      comments: (parsed.comments ?? []) as AstComment[],
    }
  } catch (error) {
    const cause = error as {
      message?: unknown
      loc?: { line?: unknown; column?: unknown }
    }
    const rawMessage =
      typeof cause.message === 'string' ? cause.message : '解析器返回了未知错误'
    const line = typeof cause.loc?.line === 'number' ? cause.loc.line : undefined
    const column =
      typeof cause.loc?.column === 'number' ? cause.loc.column + 1 : undefined
    const parserMessage = rawMessage.replace(/\s*\(\d+:\d+\)\s*$/, '')
    return {
      ok: false,
      parserMessage,
      location:
        line !== undefined && column !== undefined ? { line, column } : undefined,
    }
  }
}

export function validateSyntax(
  code: string,
  language: LanguageId,
): SyntaxValidationResult {
  return parseWithBabel(code, language)
}

function walkAst(root: AstNode): {
  entries: NodeEntry[]
  statementMembers: Set<AstNode>
} {
  const entries: NodeEntry[] = []
  const statementMembers = new Set<AstNode>()

  const walk = (node: AstNode, parent: AstNode | null) => {
    entries.push({ node, parent })

    if (STATEMENT_LIST_KEYS.has(node.type)) {
      const body = node.body
      if (Array.isArray(body)) {
        for (const child of body) {
          if (isAstNode(child)) {
            statementMembers.add(child)
          }
        }
      }
    }

    if (node.type === 'SwitchCase' && Array.isArray(node.consequent)) {
      for (const child of node.consequent) {
        if (isAstNode(child)) {
          statementMembers.add(child)
        }
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (SKIPPED_NODE_KEYS.has(key)) {
        continue
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isAstNode(item)) {
            walk(item, node)
          }
        }
      } else if (isAstNode(value)) {
        walk(value, node)
      }
    }
  }

  walk(root, null)
  return { entries, statementMembers }
}

function getConsoleCall(node: AstNode): boolean {
  if (node.type !== 'CallExpression') {
    return false
  }
  const callee = node.callee
  if (!isAstNode(callee) || callee.type !== 'MemberExpression') {
    return false
  }
  const object = callee.object
  if (!isAstNode(object) || object.type !== 'Identifier' || object.name !== 'console') {
    return false
  }
  const property = callee.property
  if (!isAstNode(property)) {
    return false
  }
  if (callee.computed === true) {
    return property.type === 'StringLiteral' && property.value === 'log'
  }
  return property.type === 'Identifier' && property.name === 'log'
}

function isSideEffectFreeLiteral(value: unknown): boolean {
  if (!isAstNode(value)) {
    return false
  }
  switch (value.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'BigIntLiteral':
      return true
    case 'TemplateLiteral':
      return Array.isArray(value.expressions) && value.expressions.length === 0
    default:
      return false
  }
}

function getConsoleArguments(node: AstNode): AstNode[] {
  if (!Array.isArray(node.arguments)) {
    return []
  }
  return node.arguments.filter(isAstNode)
}

function hasOnlyLiteralArguments(args: AstNode[]): boolean {
  return args.length > 0 && args.every(isSideEffectFreeLiteral)
}

function getNodeLine(node: AstNode, fallbackOffset: number, code: string): number {
  return node.loc?.start.line ?? offsetToLine(code, fallbackOffset)
}

function getNodeEndLine(node: AstNode, fallbackOffset: number, code: string): number {
  return node.loc?.end.line ?? offsetToLine(code, fallbackOffset)
}

function makeIssue(
  code: string,
  node: AstNode,
  rule: RuleId,
  explanation: string,
  suggestion: string,
  cleanup: CleanupAvailability,
): Issue {
  const start = node.start ?? 0
  const end = node.end ?? start
  const codeText = code.slice(start, end)
  return {
    id: `${rule}:${start}:${end}`,
    rule,
    line: getNodeLine(node, start, code),
    endLine: getNodeEndLine(node, end, code),
    start,
    end,
    codeText,
    snippet: collapseSnippet(codeText),
    explanation,
    suggestion,
    cleanup,
  }
}

function findCommentIssues(code: string, comments: AstComment[]): Issue[] {
  const seen = new Set<string>()
  const issues: Issue[] = []

  for (const comment of comments) {
    const key = `${comment.start}:${comment.end}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    const marker = comment.value.match(/(TODO|FIXME)/i)
    if (!marker) {
      continue
    }

    const start = comment.start
    const end = comment.end
    const rawText = code.slice(start, end)
    const line = comment.loc?.start.line ?? offsetToLine(code, start)
    const endLine = comment.loc?.end.line ?? offsetToLine(code, end)

    issues.push({
      id: `${'todo-comment'}:${start}:${end}`,
      rule: 'todo-comment',
      line,
      endLine,
      start,
      end,
      codeText: rawText,
      snippet: collapseSnippet(rawText),
      explanation: '这里还有一项待办。',
      suggestion:
        '确认这件事是否仍需要处理；完成后自行删除注释或补齐实现。删除注释本身不等于完成待办。',
      cleanup: {
        supported: false,
        reason: '删掉注释不会完成待办；请先确认事项，再手动处理这条注释。',
      },
    })
  }

  return issues
}

export function scanCode(input: string, language: LanguageId): ScanResult {
  const code = input
  const inputBytes = byteLength(code)
  const base = {
    codeSnapshot: code,
    language,
    sourceHash: hashSource(code, language),
    scannedAt: Date.now(),
    inputBytes,
  }

  if (inputBytes > MAX_SOURCE_BYTES) {
    const failure: ScanFailure = {
      ...base,
      status: 'error',
      reason: 'limit',
      message: '扫描未完成：代码超过 100 KB 上限。',
    }
    return failure
  }

  const parsed = parseWithBabel(code, language)
  if (parsed.ok === false) {
    const failure: ScanFailure = {
      ...base,
      status: 'error',
      reason: 'syntax',
      message: '扫描未完成：这段代码存在无法解析的语法。',
      parserMessage: parsed.parserMessage,
      location: parsed.location,
    }
    return failure
  }

  const { ast, comments } = parsed
  const { entries, statementMembers } = walkAst(ast)
  const issues: Issue[] = []

  for (const { node, parent } of entries) {
    if (node.start === null || node.end === null) {
      continue
    }

    if (node.type === 'DebuggerStatement') {
      const standalone = statementMembers.has(node)
      issues.push(
        makeIssue(
          code,
          node,
          'debugger',
          '这里还留着调试断点。',
          standalone
            ? '如果调试已经结束，可以预览删除这条独立语句；确认前不会改动代码。'
            : '这条 debugger 嵌在控制流内部，无法安全地整行删除，请手动复核。',
          standalone
            ? {
                supported: true,
                kind: 'remove-statement',
                start: node.start,
                end: node.end,
                replacement: '',
                editLabel: '删除这条独立的 debugger 语句',
              }
            : {
                supported: false,
                reason: '这条 debugger 不在独立的语句列表中，不提供自动清理。',
              },
        ),
      )
      continue
    }

    if (node.type === 'CallExpression' && getConsoleCall(node)) {
      const expressionStatement =
        parent?.type === 'ExpressionStatement' &&
        parent.expression === node &&
        statementMembers.has(parent)
          ? parent
          : null
      const args = getConsoleArguments(node)
      const literalsOnly = hasOnlyLiteralArguments(args)
      let cleanup: CleanupAvailability

      if (!expressionStatement) {
        cleanup = {
          supported: false,
          reason: '这条日志不是独立语句，无法安全地整段删除，请手动复核。',
        }
      } else if (!literalsOnly) {
        cleanup = {
          supported: false,
          reason:
            '参数中含有调用、展开或其他表达式，可能有副作用，因此不提供自动清理。',
        }
      } else {
        cleanup = {
          supported: true,
          kind: 'remove-statement',
          start: expressionStatement.start ?? node.start,
          end: expressionStatement.end ?? node.end,
          replacement: '',
          editLabel: '删除这条仅含字面量参数的独立 console.log',
        }
      }

      issues.push(
        makeIssue(
          code,
          node,
          'console-log',
          '这条调试日志需要保留吗？',
          '先确认它只是开发期输出；若用于线上诊断，请保留。只有独立的字面量日志才可预览清理。',
          cleanup,
        ),
      )
      continue
    }

    if (node.type === 'CatchClause') {
      const body = node.body
      const empty =
        isAstNode(body) &&
        body.type === 'BlockStatement' &&
        Array.isArray(body.body) &&
        body.body.length === 0
      if (empty) {
        issues.push(
          makeIssue(
            code,
            node,
            'empty-catch',
            '异常被捕获，但这里没有处理逻辑，请复核是否有意如此。',
            '补充错误处理，或明确写下为何可以忽略；本工具不会自动向 catch 里塞代码。',
            {
              supported: false,
              reason: '自动补全 catch 可能改变业务语义，这里只做提醒，需人工复核。',
            },
          ),
        )
      }
      continue
    }

    if (
      node.type === 'BinaryExpression' &&
      (node.operator === '==' || node.operator === '!=')
    ) {
      issues.push(
        makeIssue(
          code,
          node,
          'loose-equality',
          '这里使用了宽松比较，请确认类型转换符合预期。',
          '确认两侧类型后，可以手动改成 === / !==；工具不会自动替换，以免改变行为。',
          {
            supported: false,
            reason: '宽松比较不一定是错误，是否替换需要结合类型语义人工判断。',
          },
        ),
      )
    }
  }

  issues.push(...findCommentIssues(code, comments))
  issues.sort((left, right) => left.start - right.start || left.end - right.end)

  const counts = getRuleCounts(issues)
  const success: ScanSuccess = {
    ...base,
    status: 'success',
    issues,
    counts,
    total: issues.length,
  }

  return success
}
