import { highlight, langOf, type Lang } from '../lib/highlight'

/** กล่องโค้ดแบบหน้าต่าง มีชื่อไฟล์และ syntax highlight — code เป็น string ธรรมดา (escape ให้อัตโนมัติ) */
export default function CodeBlock({ code, label, lang }: { code: string; label?: string; lang?: Lang }) {
  const safeHtml = highlight(code.trim(), lang ?? langOf(label))

  return (
    <figure class="codeblock">
      <figcaption>
        <span class="dots" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span safe>{label ?? ''}</span>
      </figcaption>
      <pre>
        <code>{safeHtml}</code>
      </pre>
    </figure>
  )
}
