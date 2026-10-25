// GET /benchmark/live — ชิ้น HTML ให้หน้าแรกดึงไปแสดง (hx-trigger="load")
import { runInProcess } from '../../lib/bench'

export const cache = 30 // cache ทั้งหน้า 30 วินาที (วัดจริงใช้ CPU ~0.5 วินาที — จำผลไว้ 30 วินาที)

export default async function LiveStats() {
  const results = await runInProcess(20_000)

  return (
    <div id="live-stats">
      <div class="stat-row">
        {results.map((r) => (
          <div class="stat">
            <span class="stat-value" safe>{r.opsPerSec.toLocaleString('en-US')}</span>
            <span class="stat-label">
              req/s · <span safe>{r.label}</span>
            </span>
            <span class="stat-sub" safe>{`${(r.nsPerOp / 1000).toFixed(2)} µs ต่อ request`}</span>
          </div>
        ))}
      </div>
      <p class="muted small">
        วัดจาก 20,000 request ต่อรายการ บน CPU 1 core · อัปเดตทุก 30 วินาที ·{' '}
        <a href="/benchmark">วัดแบบละเอียด →</a>
      </p>
    </div>
  )
}
