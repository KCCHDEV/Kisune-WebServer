/**
 * จุดเริ่มต้นของแอพ —  bun index.tsx  (หรือ  bun dev  สำหรับ auto-reload)
 *
 *  src/api/**        → JSON API   (prefix /api)
 *  src/pages/**      → หน้าเว็บ JSX + htmx
 *  src/components/** → components (โหลดอัตโนมัติ → import { X } from '@components')
 *  public/**         → ไฟล์ static (/public/...)
 *
 * การตั้งค่าแอพ (plugin, error handler, route) อยู่ที่ core/app.ts
 * หน้าตา console (banner, ตาราง route, request log) อยู่ที่ core/logger.ts
 */
import { createApp } from './core/app'
import { printBanner, printRoutes, printLogHeader } from './core/logger'

const PORT = Number(process.env.PORT ?? 3000)
const isDev = process.env.NODE_ENV !== 'production'
// โหมด cluster (scripts/cluster.ts): หลาย process ใช้พอร์ตเดียวกัน · แสดง banner แค่ worker แรก
const workerId = Number(process.env.WORKER_ID ?? 0)

const { app, routes } = await createApp()

// dev: ดูไฟล์เพิ่ม/ลบ แล้วรีโหลดให้เอง
if (isDev) await (await import('./core/dev')).setupDev()

app.listen({ port: PORT, reusePort: process.env.REUSE_PORT === '1' })

if (workerId === 0) {
  const workers = Number(process.env.WORKERS ?? 1)
  const mode = (isDev ? 'dev' : 'production') + (workers > 1 ? ` × ${workers} workers` : '')
  printBanner({ name: '🦊 Kitsune', mode, port: app.server?.port, routes })
  printRoutes(routes)
  printLogHeader()
}

export type App = typeof app
