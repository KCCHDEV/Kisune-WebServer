// GET /api/admin/stats   (ถูกป้องกันด้วย ./_guard.ts)
import { users } from '../../lib/db'

export const GET = () => ({
  users: users.all().length,
  uptime: Math.round(process.uptime()),
  memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
})
