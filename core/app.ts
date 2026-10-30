/**
 * สร้างแอพ Elysia พร้อม plugin, error handler และ route จากไฟล์ทั้งหมด
 * แยกออกจาก index.tsx เพื่อให้ test (bun test) เรียกใช้ app.handle() ได้โดยไม่ต้องเปิดพอร์ต
 */
import { Elysia } from 'elysia'
import { html, Html } from '@elysiajs/html'
import { openapi } from '@elysiajs/openapi'
import { generateComponents } from './components'
import { loadRoutes } from './router'
import { staticFiles } from './static'
import { build } from './files'
import { c, logEvent, requestLogger } from './logger'

export const COOKIE_SECRET = process.env.COOKIE_SECRET ?? 'dev-cookie-secret'

/** log ทุก request (ปิดตอนเทส หรือ LOG=0) */
const logRequests = process.env.NODE_ENV !== 'test' && process.env.LOG !== '0'

export async function createApp() {
  // สร้าง src/components/index.ts ก่อน เพราะ pages จะ import จาก '@components' (build รวมไว้ให้แล้ว ไม่ต้องทำ)
  if (!build) await generateComponents('src/components')

  const app = new Elysia({
    // cookie ชื่อ session จะถูกเซ็น (กันแก้ค่าเองจากฝั่ง browser) — ดู src/pages/examples/auth
    cookie: { secrets: COOKIE_SECRET, sign: ['session'] },
  })
    .use(logRequests ? requestLogger({ secret: COOKIE_SECRET }) : new Elysia())
    .use(html())
    // /public/* และ /vendor/* เสิร์ฟจากหน่วยความจำ บีบอัดไว้แล้ว (core/static.ts)
    .use(staticFiles)
    // เอกสาร API อัตโนมัติจาก schema ของแต่ละ route → /openapi (เฉพาะ /api/*)
    .use(
      openapi({
        documentation: { info: { title: 'Kitsune API', version: '1.0.0' } },
        exclude: { paths: [/^(?!\/api)/] },
      }),
    )

    // Server-Timing: เวลาที่เซิร์ฟเวอร์ใช้จริง (browser อ่านได้ หน้า /benchmark ใช้แยกเวลา network ออก)
    .derive({ as: 'global' }, () => ({ startedAt: Bun.nanoseconds() }))
    .onAfterHandle({ as: 'global' }, ({ set, startedAt }) => {
      set.headers['server-timing'] = `app;dur=${((Bun.nanoseconds() - startedAt) / 1e6).toFixed(3)}`
    })

    // จัดการ error รวม: /api ตอบ JSON, หน้าเว็บตอบ HTML
    .onError(async ({ code, error, path, set }) => {
      const isApi = path.startsWith('/api')

      if (code === 'NOT_FOUND') {
        set.status = 404
        if (isApi) return Response.json({ error: 'Not Found' }, { status: 404 })
        const { default: NotFound } = await import('../src/pages/_404')
        set.headers['content-type'] = 'text/html; charset=utf8'
        return '<!doctype html>' + (await NotFound())
      }

      if (code === 'VALIDATION') {
        set.status = 422
        const issues = error.all.map((e) => ({
          field: 'path' in e ? e.path.replace(/^\//, '') : '',
          // ข้อความจาก t.String({ error: '...' }) ถ้ามี ไม่งั้นใช้ข้อความมาตรฐาน
          message: 'schema' in e && typeof e.schema.error === 'string' ? e.schema.error : (e.summary ?? e.message),
        }))
        if (isApi) return { error: 'ข้อมูลไม่ถูกต้อง', issues }
        // หน้าเว็บ: ส่งชิ้น HTML ให้ htmx แปะ (Layout ตั้งค่าให้ htmx swap สถานะ 422 ได้)
        set.headers['content-type'] = 'text/html; charset=utf8'
        return (
          '<div class="alert alert-error"><strong>ข้อมูลไม่ถูกต้อง</strong><ul>' +
          issues
            .map((i) => `<li>${i.field ? `<code>${Html.escapeHtml(i.field)}</code> ` : ''}${Html.escapeHtml(i.message)}</li>`)
            .join('') +
          '</ul></div>'
        )
      }

      // cookie ถูกแก้ไข (ลายเซ็นไม่ตรง) → ลบทิ้ง แล้วให้เข้า path เดิมใหม่แบบไม่มี cookie
      if (code === 'INVALID_COOKIE_SIGNATURE') {
        set.headers['set-cookie'] = `${error.key}=; Max-Age=0; Path=/`
        if (isApi) return Response.json({ error: 'cookie ไม่ถูกต้อง' }, { status: 401 })
        set.status = 302
        set.headers.location = path
        return ''
      }

      if (code === 'PARSE') return

      logEvent(c.red('✖'), `${c.red('500')} ${c.white(path)} ${c.gray('— error ในเซิร์ฟเวอร์:')}`)
      console.error(error)
      set.status = 500
      return isApi ? { error: 'Internal Server Error' } : 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์'
    })

  // โหลด route จากไฟล์อัตโนมัติ
  const routes = [
    ...(await loadRoutes(app, { dir: 'src/api', prefix: '/api', kind: 'api' })),
    ...(await loadRoutes(app, { dir: 'src/pages', kind: 'page' })),
  ]

  // คอมไพล์ handler ใหม่หลังเพิ่ม route ทั้งหมด (listen() ทำให้เอง แต่ app.handle() ในเทสไม่ได้ทำ)
  app.compile()

  return { app, routes }
}
