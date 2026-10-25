import type { CacheStats as Stats } from '@core/cache'

const mb = (b: number) => (b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 2 : 1)

/** การ์ดสถิติ cache — ใช้ทั้งตอน render หน้าและตอน htmx ดึงใหม่ทุก 2 วินาที */
export default function CacheStats({ stats }: { stats: Stats }) {
  const used = Math.min(100, (stats.bytes / stats.maxBytes) * 100)
  return (
    <div id="cache-stats" hx-get="/examples/cache/stats" hx-trigger="every 2s" hx-swap="outerHTML">
      <div class="stat-row">
        <div class="stat">
          <span class="stat-value" safe>{stats.items.toLocaleString('en-US')}</span>
          <span class="stat-label">key ใน cache</span>
        </div>
        <div class="stat">
          <span class="stat-value" safe>{`${(stats.hitRate * 100).toFixed(1)}%`}</span>
          <span class="stat-label">hit rate</span>
          <span class="stat-sub" safe>{`hit ${stats.hits.toLocaleString('en-US')} · miss ${stats.misses.toLocaleString('en-US')}`}</span>
        </div>
        <div class="stat">
          <span class="stat-value" safe>{`${mb(stats.bytes)} MB`}</span>
          <span class="stat-label" safe>{`ใช้ไป จาก ${mb(stats.maxBytes)} MB`}</span>
          <span class="meter" aria-hidden="true">
            <span style={`width:${used.toFixed(2)}%`}></span>
          </span>
        </div>
        <div class="stat">
          <span class="stat-value" safe>{stats.evictions.toLocaleString('en-US')}</span>
          <span class="stat-label">ถูกไล่ออก (LRU)</span>
          <span class="stat-sub" safe>{`หมดอายุ ${stats.expired.toLocaleString('en-US')}`}</span>
        </div>
      </div>
    </div>
  )
}
