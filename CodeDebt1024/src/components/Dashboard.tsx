import { RULE_META, RULE_ORDER } from '../lib/rules'
import type { Issue, ScanResult, ScanSnapshot } from '../lib/types'
import { formatSigned } from '../lib/utils'

interface DashboardProps {
  scan: ScanResult
  baseline: ScanSnapshot | null
  isStale: boolean
}

function getCleanupCounts(issues: Issue[]): { cleanable: number; manual: number } {
  let cleanable = 0
  for (const issue of issues) {
    if (issue.cleanup.supported) {
      cleanable += 1
    }
  }
  return { cleanable, manual: issues.length - cleanable }
}

export function Dashboard({ scan, baseline, isStale }: DashboardProps) {
  const success = scan.status === 'success' ? scan : null
  const { cleanable, manual } = success
    ? getCleanupCounts(success.issues)
    : { cleanable: 0, manual: 0 }
  const currentTotal = success?.total ?? null
  const net =
    success && baseline ? baseline.total - success.total : null
  const maxCount = success
    ? Math.max(1, ...RULE_ORDER.map((rule) => success.counts[rule]))
    : 1

  const scanCaption = success
    ? isStale
      ? '上次扫描结果，待重扫'
      : '来自当前语法树'
    : '扫描未完成，暂无有效计数'

  const netCaption = (() => {
    if (currentTotal === null || !baseline) {
      return '等待首次有效扫描'
    }
    if (net === null) {
      return '暂不可计算'
    }
    if (net > 0) {
      return `基线 ${baseline.total} → 当前 ${currentTotal} 条`
    }
    if (net < 0) {
      return `基线 ${baseline.total} → 当前 ${currentTotal} · 增加 ${Math.abs(net)} 条`
    }
    return `基线 ${baseline.total} · 与基线持平`
  })()

  const netValue = net === null ? '—' : formatSigned(net)
  const netClass =
    net === null || net === 0 ? '' : net > 0 ? 'is-positive' : 'is-negative'

  const statValues = [
    {
      id: 'total',
      label: '当前关注项',
      value: currentTotal === null ? '—' : String(currentTotal),
      suffix: currentTotal === null ? '' : '项',
      caption: scanCaption,
      tone: 'coral',
    },
    {
      id: 'cleanable',
      label: '可预览清理',
      value: currentTotal === null ? '—' : String(cleanable),
      suffix: currentTotal === null ? '' : '项',
      caption: currentTotal === null ? '扫描失败，入口关闭' : '均有代码级清理提案',
      tone: 'gold',
    },
    {
      id: 'manual',
      label: '需人工处理 / 复核',
      value: currentTotal === null ? '—' : String(manual),
      suffix: currentTotal === null ? '' : '项',
      caption: currentTotal === null ? '未把失败伪装成 0' : '不作自动改写',
      tone: 'blue',
    },
    {
      id: 'net',
      label: '相对本轮基线净减少',
      value: netValue,
      suffix: '',
      caption: netCaption,
      tone: 'plum',
    },
  ]

  const chartLabel = success
    ? RULE_ORDER.map(
        (rule) => `${RULE_META[rule].label} ${success.counts[rule]} 项`,
      ).join('，')
    : '扫描未完成，暂无分类计数'

  return (
    <section className="dashboard" aria-label="本轮扫描台账">
      <div className="dashboard-stats">
        {statValues.map((stat) => (
          <article
            className={`stat-card stat-card--${stat.tone} ${
              stat.id === 'net' ? netClass : ''
            }`}
            key={stat.id}
            data-testid={`stat-${stat.id}`}
          >
            <span className="stat-fastener" aria-hidden="true" />
            <p className="stat-label">{stat.label}</p>
            <div className="stat-value-row">
              <strong
                className="stat-value"
                data-testid={`stat-${stat.id}-value`}
              >
                {stat.value}
              </strong>
              {stat.suffix ? (
                <span className="stat-suffix">{stat.suffix}</span>
              ) : null}
            </div>
            <p className="stat-caption">{stat.caption}</p>
          </article>
        ))}
      </div>

      <article className="chart-card" aria-label="关注项分类条形图">
        <header className="chart-head">
          <div>
            <span className="chart-kicker">分类分布</span>
            <h2>五条规则台账</h2>
          </div>
          <span className="chart-total">
            {success ? `${success.total} 项` : '未完成'}
          </span>
        </header>

        <div className="chart-rows" role="img" aria-label={chartLabel}>
          {RULE_ORDER.map((rule) => {
            const count = success ? success.counts[rule] : null
            const width =
              count === null || count === 0
                ? 0
                : Math.max(8, (count / maxCount) * 100)
            return (
              <div
                className={`chart-row ${count === null ? 'is-empty' : ''}`}
                key={rule}
                data-testid={`chart-${rule}`}
              >
                <span className="chart-label">{RULE_META[rule].filterLabel}</span>
                <span className="chart-track" aria-hidden="true">
                  <span
                    className={`chart-fill swatch-${rule}`}
                    style={{ width: `${width}%` }}
                  />
                </span>
                <span
                  className="chart-count"
                  data-testid={`chart-${rule}-count`}
                >
                  {count === null ? '—' : count}
                </span>
              </div>
            )
          })}
        </div>
      </article>
    </section>
  )
}
