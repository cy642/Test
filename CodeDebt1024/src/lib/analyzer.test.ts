import { describe, expect, it } from 'vitest'
import { scanCode } from './analyzer'
import { DEMO_CODE } from './demo'
import { MAX_SOURCE_BYTES, byteLength } from './utils'

describe('scanCode', () => {
  it('finds exactly six findings from the demo with matching category counts', () => {
    const result = scanCode(DEMO_CODE, 'javascript')
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      return
    }

    expect(result.total).toBe(6)
    expect(result.issues).toHaveLength(6)
    expect(result.counts).toEqual({
      debugger: 1,
      'console-log': 2,
      'empty-catch': 1,
      'loose-equality': 1,
      'todo-comment': 1,
    })
    expect(
      result.issues.filter((issue) => issue.cleanup.supported).map((issue) => issue.rule),
    ).toEqual(['console-log', 'console-log', 'debugger'])
    expect(new Set(result.issues.map((issue) => issue.id)).size).toBe(6)
  })

  it('does not treat TODO or debugger inside strings as findings', () => {
    const code = `
      const first = "debugger";
      const second = "TODO: 这只是字符串";
      const third = "// FIXME: 这也是字符串";
      const fourth = "console.log('not a call')";
      const pattern = /TODO/;
    `
    const result = scanCode(code, 'javascript')
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.total).toBe(0)
    }
  })

  it('reports only real comments and once per comment', () => {
    const code = `// TODO: 第一项
/* FIXME: 第二项，也带 TODO 字样 */
const text = "TODO"
`
    const result = scanCode(code, 'javascript')
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      return
    }
    expect(result.counts['todo-comment']).toBe(2)
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 2])
  })

  it('falls back to no automatic cleanup for console.log with side effects', () => {
    const result = scanCode(
      `console.log(buildMessage());
       console.log("prefix", getValue());
       console.log(...values);`,
      'javascript',
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      return
    }
    expect(result.total).toBe(3)
    expect(result.issues.every((issue) => !issue.cleanup.supported)).toBe(true)
  })

  it('supports independent literal console.log inside a block', () => {
    const result = scanCode(
      `function boot() {
  console.log("ready");
}`,
      'javascript',
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      return
    }
    expect(result.total).toBe(1)
    expect(result.issues[0].cleanup.supported).toBe(true)
  })

  it('only offers debugger cleanup for a real statement-list member', () => {
    const result = scanCode(
      `if (ready) debugger;
if (ready) {
  debugger;
}`,
      'javascript',
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      return
    }
    expect(result.counts.debugger).toBe(2)
    const support = result.issues
      .filter((issue) => issue.rule === 'debugger')
      .map((issue) => issue.cleanup.supported)
    expect(support).toEqual([false, true])
  })

  it('flags empty catches and loose equality without claiming automatic fixes', () => {
    const code = `try {
  run();
} catch (error) {
}

if (left == right) {}
if (left != right) {}
if (left === right) {}`
    const result = scanCode(code, 'javascript')
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      return
    }
    expect(result.counts['empty-catch']).toBe(1)
    expect(result.counts['loose-equality']).toBe(2)
    expect(result.total).toBe(3)
    expect(result.issues.every((issue) => issue.cleanup.supported === false)).toBe(true)
  })

  it('supports JSX and TypeScript parsing modes', () => {
    const code = `type Price = number;
const node = <section data-price={128}>价格</section>;
console.log("render done");
// TODO: 补类型测试`
    const result = scanCode(code, 'tsx')
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      return
    }
    expect(result.counts['console-log']).toBe(1)
    expect(result.counts['todo-comment']).toBe(1)
  })

  it('returns a scan failure with location instead of zero findings on syntax errors', () => {
    const result = scanCode('const price = ;\nconsole.log("never");', 'javascript')
    expect(result.status).toBe('error')
    if (result.status !== 'error') {
      return
    }
    expect(result.reason).toBe('syntax')
    expect(result.location?.line).toBe(1)
    expect(result.location?.column).toBeGreaterThan(0)
    expect('issues' in result).toBe(false)
  })

  it('rejects source over the 100 KB limit before parsing', () => {
    const code = `// ${'x'.repeat(MAX_SOURCE_BYTES)}`
    expect(byteLength(code)).toBeGreaterThan(MAX_SOURCE_BYTES)
    const result = scanCode(code, 'javascript')
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.reason).toBe('limit')
    }
  })

  it('reports accurate start lines for findings', () => {
    const result = scanCode('// TODO: first\n\nconsole.log("hello");\ndebugger;', 'javascript')
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      return
    }
    expect(result.issues.map((issue) => issue.line)).toEqual([1, 3, 4])
  })
})
