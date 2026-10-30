// รวมโค้ดวิดีโอ (trailer/, tutorial/) เป็นไฟล์ JS เดียวด้วย Bun.build (production: build ครั้งเดียว)
// รันจาก build (scripts/build.ts): ใช้ไฟล์ที่ build ไว้ล่วงหน้าใน .kitsune/bundles/ — ไม่ต้องมีซอร์สหรือ node_modules
import { join } from 'node:path'
import { build, projectFile } from '@core/files'

const isProd = process.env.NODE_ENV === 'production'

/** ชื่อไฟล์ที่ build ล่วงหน้า: 'trailer/main.ts' → .kitsune/bundles/trailer.js */
export const prebuiltName = (entry: string) => `.kitsune/bundles/${entry.split('/')[0]}.js`

/** สร้าง handler GET ที่ส่ง bundle ของไฟล์ entry (path จากรากโปรเจกต์) */
export const bundle = (entry: string) => {
  let built: string | null = null
  return async ({ set }: { set: { status?: number; headers: Record<string, string> } }) => {
    if (build && !built) built = await Bun.file(projectFile(prebuiltName(entry))).text()
    if (!built || (!isProd && !build)) {
      const result = await Bun.build({
        entrypoints: [join(process.cwd(), entry)],
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
}
