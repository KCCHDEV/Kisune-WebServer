import type { PropsWithChildren } from '@kitajs/html'

type Props = PropsWithChildren<
  JSX.HtmlButtonTag & {
    variant?: 'primary' | 'ghost' | 'danger'
  }
>

/** ปุ่มใช้ซ้ำได้ — ส่ง attribute อะไรก็ได้ของ <button> รวมถึง hx-* */
export default function Button({ variant = 'primary', class: cls, children, ...rest }: Props) {
  return (
    <button class={['btn', `btn-${variant}`, cls].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  )
}
