import type { BenchResult } from '../lib/bench'

const fmt = (n: number) => n.toLocaleString('en-US')

/** กราฟแท่งแนวนอน req/s ของการวัดแบบ in-process + ตารางตัวเลข */
export default function BenchBars({ results }: { results: BenchResult[] }) {
  const max = Math.max(...results.map((r) => r.opsPerSec))

  return (
    <div class="bench-bars">
      <p class="chart-title">
        req/s ต่อ route <span class="muted" safe>{`(ยิ่งยาวยิ่งเร็ว · ${fmt(results[0]?.n ?? 0)} request ต่อรายการ)`}</span>
      </p>
      <ul class="hbars" role="list">
        {results.map((r) => (
          <li class="hbar" title={`${r.route}: ${fmt(r.opsPerSec)} req/s · ${fmt(r.nsPerOp)} ns ต่อ request`}>
            <span class="hbar-label">
              <span safe>{r.label}</span>
              <code safe>{r.route}</code>
            </span>
            <span class="hbar-track">
              <span class="hbar-fill" style={`width:${((r.opsPerSec / max) * 100).toFixed(1)}%`}></span>
            </span>
            <span class="hbar-value" safe>{fmt(r.opsPerSec)}</span>
          </li>
        ))}
      </ul>
      <table class="table">
        <thead>
          <tr>
            <th>รายการ</th>
            <th class="num">req/s</th>
            <th class="num">เวลาต่อ request</th>
            <th class="num">เวลารวม</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr>
              <td safe>{r.route}</td>
              <td class="num" safe>{fmt(r.opsPerSec)}</td>
              <td class="num" safe>{`${(r.nsPerOp / 1000).toFixed(2)} µs`}</td>
              <td class="num" safe>{`${fmt(r.ms)} ms`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
