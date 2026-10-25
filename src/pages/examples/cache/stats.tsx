// GET /examples/cache/stats — ชิ้น HTML สถิติ ให้ htmx ดึงทุก 2 วินาที
import { cache } from '@core/cache'
import { CacheStats } from '@components'

export default function Stats() {
  return <CacheStats stats={cache.stats()} />
}
