// GET /trailer/data — ตัวเลขจริงของโปรเจกต์ให้ trailer ใช้ (วัดสด ณ ตอนเปิด)
import { registry } from '@core/router'
import { cache } from '@core/cache'
import { runInProcess, serverInfo } from '../../lib/bench'
import { examples } from '../../lib/examples'

/** ขนาดหน้า /examples ก่อน/หลังบีบอัด brotli (ขอ byte ดิบโดยไม่ให้ fetch แตกไฟล์ให้) */
async function compression(origin: string) {
  const url = `${origin}/examples`
  const raw = await (await fetch(url, { headers: { 'accept-encoding': 'identity' } })).arrayBuffer()
  const br = await (await fetch(url, { headers: { 'accept-encoding': 'br' }, decompress: false })).arrayBuffer()
  return { raw: raw.byteLength, br: br.byteLength }
}

export const GET = async ({ request }: { request: Request }) => {
  const origin = new URL(request.url).origin
  const routes = registry.filter((r, i, all) => all.findIndex((x) => x.method === r.method && x.path === r.path) === i)
  return {
    inprocess: await runInProcess(30_000),
    info: serverInfo(),
    routes: {
      total: routes.length,
      pages: routes.filter((r) => r.kind === 'page' && r.method !== 'WS').length,
      api: routes.filter((r) => r.kind === 'api').length,
      cached: routes.filter((r) => r.cache).length,
      sample: routes.slice(0, 40).map((r) => ({ method: r.method, path: r.path, file: r.file, kind: r.kind, cache: r.cache })),
    },
    examples: examples.map(({ icon, title, desc, tags }) => ({ icon, title, desc, tags })),
    cacheMB: Math.round(cache.maxBytes / 1024 / 1024),
    compression: await compression(origin),
  }
}
