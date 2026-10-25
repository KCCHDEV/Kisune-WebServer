import type { PropsWithChildren } from '@kitajs/html'

type Props = PropsWithChildren<{
  /** ป้ายเล็กเหนือหัวข้อ */
  eyebrow?: string
  title: string
  lead?: string
  /** ลิงก์ย้อนกลับ */
  back?: { href: string; label: string }
}>

// แยก emoji หน้าหัวข้อออกมาเป็นไอคอน (ไม่งั้นข้อความ gradient จะทำให้ emoji กลายเป็นเงาสี)
const EMOJI = /^(\p{Extended_Pictographic}\uFE0F?)\s*/u

/** หัวหน้าของทุกหน้าย่อย: eyebrow → หัวข้อ gradient → คำอธิบาย */
export default function PageHeader({ eyebrow, title: rawTitle, lead, back, children }: Props) {
  const icon = EMOJI.exec(rawTitle)?.[1]
  const title = icon ? rawTitle.slice(EMOJI.exec(rawTitle)![0].length) : rawTitle

  return (
    <header class="page-header">
      {back ? (
        <a href={back.href} class="crumb" safe>
          {`← ${back.label}`}
        </a>
      ) : (
        ''
      )}
      {eyebrow ? (
        <p class="eyebrow" safe>
          {eyebrow}
        </p>
      ) : (
        ''
      )}
      <h1 class="page-title">
        {icon ? (
          <span class="title-icon" aria-hidden="true" safe>
            {icon}
          </span>
        ) : (
          ''
        )}
        <span class="gradient-text" safe>
          {title}
        </span>
      </h1>
      {lead ? (
        <p class="lead" safe>
          {lead}
        </p>
      ) : (
        ''
      )}
      {children}
    </header>
  )
}
