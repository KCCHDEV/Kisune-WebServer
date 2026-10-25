// bun test — ยิง Request เข้า app.handle() ตรงๆ ไม่ต้องเปิดพอร์ต
import { describe, expect, it } from 'bun:test'
import { createApp } from '../core/app'

const { app } = await createApp()

const get = (path: string, init?: RequestInit) => app.handle(new Request(`http://localhost${path}`, init))
const post = (path: string, body: unknown) =>
  get(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('API', () => {
  it('GET /api/hello ตอบ JSON', async () => {
    const res = await get('/api/hello?name=Bun')
    expect(res.status).toBe(200)
    expect((await res.json()).message).toContain('Bun')
  })

  it('POST /api/users สร้างผู้ใช้ได้', async () => {
    const res = await post('/api/users', { name: 'Test', email: 'test@example.com' })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ name: 'Test', email: 'test@example.com' })
  })

  it('ข้อมูลผิดได้ 422 พร้อมรายการ error', async () => {
    const res = await post('/api/users', { name: '', email: 'x' })
    expect(res.status).toBe(422)
    expect((await res.json()).issues.length).toBeGreaterThan(0)
  })

  it('guard กัน /api/admin ถ้าไม่มี key', async () => {
    expect((await get('/api/admin/stats')).status).toBe(401)
    expect((await get('/api/admin/stats', { headers: { 'x-api-key': 'dev-secret' } })).status).toBe(200)
  })

  it('ไม่พบ route ได้ 404 JSON', async () => {
    const res = await get('/api/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not Found' })
  })
})

describe('หน้าเว็บ', () => {
  it.each(['/', '/examples', '/benchmark', '/examples/htmx', '/examples/validation'])('GET %s render ได้', async (path) => {
    const res = await get(path)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
  })

  it('dashboard ต้อง login ก่อน', async () => {
    const res = await get('/examples/auth/dashboard')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/examples/auth')
  })

  it('ค้นหาสินค้าได้', async () => {
    const html = await (await get('/examples/htmx/search?q=RGB')).text()
    expect(html).toContain('RGB')
  })
})

describe('ความเร็ว: cache + บีบอัด', () => {
  it('หน้าที่มี export const cache: ครั้งแรก MISS ครั้งต่อไป HIT', async () => {
    const first = await get('/about')
    expect(first.headers.get('x-cache')).toBe('MISS')
    const second = await get('/about')
    expect(second.headers.get('x-cache')).toBe('HIT')
    expect(await second.text()).toBe(await first.text())
    expect(second.headers.get('cache-control')).toContain('max-age')
  })

  it.each(['/', '/examples', '/benchmark/live'])('%s ถูก cache ทั้งหน้า', async (path) => {
    await get(path)
    expect((await get(path)).headers.get('x-cache')).toBe('HIT')
  })

  it('ETag ตรงกัน = 304 ไม่ส่ง body', async () => {
    const etag = (await get('/about')).headers.get('etag')!
    const res = await get('/about', { headers: { 'if-none-match': etag } })
    expect(res.status).toBe(304)
  })

  it('บีบอัด brotli / gzip ตาม Accept-Encoding', async () => {
    const br = await get('/about', { headers: { 'accept-encoding': 'br, gzip' } })
    expect(br.headers.get('content-encoding')).toBe('br')
    const gz = await get('/about', { headers: { 'accept-encoding': 'gzip' } })
    expect(gz.headers.get('content-encoding')).toBe('gzip')
  })

  it('หน้าที่ขึ้นกับผู้ใช้ไม่ถูก cache', async () => {
    expect((await get('/examples/auth')).headers.get('x-cache')).toBeNull()
  })

  it('ไฟล์ static + vendor เสิร์ฟได้ และ ?v= ได้ cache 1 ปี', async () => {
    const css = await get('/public/style.css?v=1')
    expect(css.status).toBe(200)
    expect(css.headers.get('cache-control')).toContain('immutable')
    expect((await get('/vendor/htmx.js')).status).toBe(200)
    expect((await get('/vendor/nope.js')).status).toBe(404)
  })

  it('กัน path traversal ออกนอกโฟลเดอร์ public', async () => {
    expect((await get('/public/..%2Fpackage.json')).status).toBe(404)
  })
})
