// เปิด type ของ attribute hx-* (htmx) ใน JSX ให้ editor auto-complete ได้
import '@kitajs/html/htmx'

declare global {
  namespace JSX {
    interface HtmlTag {
      /** htmx preload extension: โหลดลิงก์ล่วงหน้าตอนกดเมาส์ลง (ค่าเริ่มต้น) หรือตอน hover */
      preload?: boolean | 'mousedown' | 'mouseover' | 'init'
    }
    interface HtmlLinkTag {
      onload?: string
    }
  }
}
