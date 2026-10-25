// GET /trailer/fonts/:file — ฟอนต์ที่ trailer ใช้ เสิร์ฟจาก node_modules/@fontsource (ไม่พึ่ง Google Fonts)
import { join } from 'node:path'

const ALLOWED = /^(ibm-plex-sans-thai|jetbrains-mono)-(thai|latin)-[1-9]00-normal\.woff2$/

export const GET = ({ params, set }: { params: { file: string }; set: { status?: number; headers: Record<string, string> } }) => {
  const m = ALLOWED.exec(params.file)
  if (!m) {
    set.status = 404
    return 'Not Found'
  }
  set.headers['cache-control'] = 'public, max-age=31536000, immutable'
  return Bun.file(join(process.cwd(), 'node_modules', '@fontsource', m[1]!, 'files', params.file))
}
