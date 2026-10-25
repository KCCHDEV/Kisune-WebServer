import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import { highlight } from '../lib/highlight'

const cache = new Map<string, string>()
const safeIcon = '&lt;/&gt;' // escape ไว้แล้ว

/**
 * แสดงซอร์สโค้ดจริงของไฟล์ (พร้อม highlight) — ส่ง import.meta.path มาได้เลย
 *   <Source file={import.meta.path} />
 */
export default function Source({ file, open }: { file: string; open?: boolean }) {
  let safeHtml = cache.get(file)
  if (safeHtml === undefined) {
    safeHtml = highlight(readFileSync(file, 'utf8'))
    if (process.env.NODE_ENV === 'production') cache.set(file, safeHtml)
  }
  const name = relative(process.cwd(), file).replaceAll('\\', '/')
  const lines = safeHtml.split('\n').length

  return (
    <details class="source" open={open}>
      <summary>
        <span class="source-icon" aria-hidden="true">
          {safeIcon}
        </span>
        <span class="source-name">
          <span class="muted">ดูโค้ด</span> <code safe>{name}</code>
        </span>
        <span class="source-meta" safe>{`${lines} บรรทัด`}</span>
      </summary>
      <pre>
        <code>{safeHtml}</code>
      </pre>
    </details>
  )
}
