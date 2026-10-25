// GET /trailer/bundle — รวมโค้ด WebGL ใน trailer/ เป็นไฟล์ JS เดียวด้วย Bun.build (production: build ครั้งเดียว)
import { join } from 'node:path'

const isProd = process.env.NODE_ENV === 'production'
let built: string | null = null

export const GET = async ({ set }: { set: { status?: number; headers: Record<string, string> } }) => {
  if (!built || !isProd) {
    const result = await Bun.build({
      entrypoints: [join(process.cwd(), 'trailer/main.ts')],
      target: 'browser',
      minify: isProd,
      sourcemap: isProd ? 'none' : 'inline',
    })
    if (!result.success) {
      set.status = 500
      set.headers['content-type'] = 'text/plain; charset=utf-8'
      return result.logs.map(String).join('\n')
    }
    built = await result.outputs[0]!.text()
  }
  set.headers['content-type'] = 'text/javascript; charset=utf-8'
  set.headers['cache-control'] = 'no-cache'
  return built
}
