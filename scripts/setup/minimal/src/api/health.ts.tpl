// GET /api/health — ใช้กับ load balancer / uptime monitor
export const GET = () => ({
  ok: true,
  uptime: Math.round(process.uptime()),
  memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
})
