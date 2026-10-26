// bun test — ยิง Request เข้า app.handle() ตรงๆ ไม่ต้องเปิดพอร์ต
import { describe, expect, it } from 'bun:test'
import { createApp } from '../core/app'

const { app } = await createApp()
const get = (path: string, init?: RequestInit) => app.handle(new Request(`http://localhost${path}`, init))

describe('แอพ', () => {
  it('หน้าแรก render ได้ และถูก cache', async () => {
    const first = await get('/')
    expect(first.status).toBe(200)
    expect(first.headers.get('content-type')).toContain('text/html')
    expect((await get('/')).headers.get('x-cache')).toBe('HIT')
  })

  it('GET /api/hello ตอบ JSON', async () => {
    const res = await get('/api/hello?name=Bun')
    expect(res.status).toBe(200)
    expect((await res.json()).message).toContain('Bun')
  })

  it('GET /api/health', async () => {
    expect((await (await get('/api/health')).json()).ok).toBe(true)
  })

  it('guard กัน /api/admin ถ้าไม่มี key', async () => {
    expect((await get('/api/admin/stats')).status).toBe(401)
  })

  it('ไม่พบ route ได้ 404', async () => {
    expect((await get('/api/nope')).status).toBe(404)
    expect((await get('/nope')).status).toBe(404)
  })

  it('ไฟล์ static เสิร์ฟได้', async () => {
    expect((await get('/public/style.css')).status).toBe(200)
  })
})
