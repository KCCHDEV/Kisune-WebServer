// DELETE /api/admin/cache — ล้าง cache ทั้งหมด (ต้องมี x-api-key ดู ./_guard.ts)
import { cache } from '@core/cache'

export const DELETE = () => {
  const removed = cache.stats().items
  cache.flush()
  return { ok: true, removed }
}
