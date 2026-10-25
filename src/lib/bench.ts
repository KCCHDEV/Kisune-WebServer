/**
 * วัดความเร็ว Elysia แบบ in-process: ยิง Request เข้า app.handle() ตรงๆ ไม่ผ่าน network
 * ตัวเลขนี้ = ต้นทุนของ router + validation + handler + สร้าง Response จริงๆ ของ Elysia
 * (เครื่องเดียวกันถ้ายิงผ่าน HTTP จะได้น้อยกว่านี้ เพราะมีต้นทุน TCP/HTTP parsing เพิ่ม)
 */
import { Elysia, t } from 'elysia'
import { cpus, platform, arch } from 'node:os'

const mini = new Elysia()
  .get('/text', () => 'Hello, Elysia!')
  .get('/json', () => ({ message: 'Hello, Elysia!', ok: true }))
  .get('/users/:id', ({ params }) => ({ id: params.id }), { params: t.Object({ id: t.Numeric() }) })
  .post('/validate', ({ body }) => ({ hello: body.name }), {
    body: t.Object({ name: t.String({ minLength: 1 }), age: t.Number({ minimum: 0 }) }),
  })

const body = JSON.stringify({ name: 'Bun', age: 3 })

export const CASES = [
  { id: 'text', label: 'ข้อความล้วน', route: 'GET /text', make: () => new Request('http://bench/text') },
  { id: 'json', label: 'ตอบ JSON', route: 'GET /json', make: () => new Request('http://bench/json') },
  {
    id: 'params',
    label: 'Path param + validate',
    route: 'GET /users/:id',
    make: () => new Request('http://bench/users/42'),
  },
  {
    id: 'body',
    label: 'Parse + validate body',
    route: 'POST /validate',
    make: () => new Request('http://bench/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body }),
  },
] as const

export type BenchResult = { id: string; label: string; route: string; n: number; ms: number; opsPerSec: number; nsPerOp: number }

export async function runInProcess(n = 50_000): Promise<BenchResult[]> {
  const results: BenchResult[] = []

  for (const c of CASES) {
    // กันวัดผิด: ทุกรายการต้องตอบ 200 จริง ไม่ใช่ 404/422
    const check = await mini.handle(c.make())
    if (check.status !== 200) throw new Error(`bench ${c.route} ตอบ ${check.status}`)

    // warm up ให้ JIT ทำงานก่อนจับเวลา
    for (let i = 0; i < 2_000; i++) await mini.handle(c.make())

    const start = Bun.nanoseconds()
    for (let i = 0; i < n; i++) await mini.handle(c.make())
    const ns = Bun.nanoseconds() - start

    results.push({
      id: c.id,
      label: c.label,
      route: c.route,
      n,
      ms: Math.round(ns / 1e4) / 100,
      opsPerSec: Math.round((n / ns) * 1e9),
      nsPerOp: Math.round(ns / n),
    })
  }
  return results
}

/** ข้อมูลเครื่อง/runtime ที่ใช้ทดสอบ */
export function serverInfo() {
  return {
    bun: Bun.version,
    elysia: (require('elysia/package.json') as { version: string }).version,
    platform: `${platform()} ${arch()}`,
    cpu: cpus()[0]?.model.trim() ?? 'unknown',
    cores: cpus().length,
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    uptime: Math.round(process.uptime()),
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'dev',
  }
}
