import { Html, type PropsWithChildren } from '@kitajs/html'
import Nav from './Nav'
import Footer from './Footer'
import { asset } from '../lib/asset'

type Props = PropsWithChildren<{
  title?: string
  /** path ปัจจุบัน ใช้ไฮไลต์เมนู */
  path?: string
  /** หน้า landing ใช้ main แบบเต็มความกว้าง */
  wide?: boolean
}>

// ให้ htmx เอา response 422 (validation error) ไปแปะด้วย ไม่ใช่แค่ 2xx
const htmxConfig = JSON.stringify({
  responseHandling: [
    { code: '204', swap: false },
    { code: '[23]..', swap: true },
    { code: '422', swap: true },
    { code: '[45]..', swap: false, error: true },
  ],
})

// ตั้งธีมก่อน render เพื่อไม่ให้จอกระพริบ + ฟังก์ชันสลับธีมให้ปุ่มใน Nav เรียก
const safeThemeScript = `
(function () {
  var root = document.documentElement
  try { var saved = localStorage.getItem('theme'); if (saved) root.dataset.theme = saved } catch (e) {}
  window.toggleTheme = function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    root.dataset.theme = dark ? 'light' : 'dark'
    try { localStorage.setItem('theme', root.dataset.theme) } catch (e) {}
  }
})()
`

const FONTS =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'

export default function Layout({ title, path = '/', wide, children }: Props) {
  return (
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{Html.escapeHtml(title ? `${title} · Kitsune` : 'Kitsune — ว่องไว แสนกล ครบในตัวเดียว')}</title>
        <meta name="description" content="Kitsune — ว่องไว แสนกล ครบในตัวเดียว · full-stack Bun + Elysia + htmx เร็ว เบา type-safe" />
        <meta name="author" content="Yurachi Studio" />
        <meta property="og:title" content={title ? `${title} · Kitsune` : 'Kitsune — ว่องไว แสนกล ครบในตัวเดียว'} />
        <meta property="og:description" content="Full-stack starter บน Bun + Elysia + htmx · เร็ว เบา type-safe · โดย Yurachi Studio" />
        <meta property="og:image" content="/public/og.jpg" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="htmx-config" content={htmxConfig} />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦊</text></svg>"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        {/* ฟอนต์โหลดแบบไม่บล็อกการแสดงผล: ระหว่างรอใช้ฟอนต์ระบบไปก่อน */}
        <link rel="stylesheet" href={FONTS} media="print" onload="this.media='all'" />
        <noscript>
          <link rel="stylesheet" href={FONTS} />
        </noscript>
        <link rel="stylesheet" href={asset('/public/style.css')} />
        <script>{safeThemeScript}</script>
        {/* htmx เสิร์ฟจากเซิร์ฟเวอร์เราเอง (core/static.ts) — ไม่ต้องรอ CDN ภายนอก + cache ได้ 1 ปี */}
        <script src={asset('/vendor/htmx.js')} defer></script>
        <script src={asset('/vendor/htmx-sse.js')} defer></script>
        <script src={asset('/vendor/htmx-ws.js')} defer></script>
        <script src={asset('/vendor/htmx-preload.js')} defer></script>
      </head>
      {/* preload: กดเมาส์ลงบนลิงก์ที่มี attribute preload ก็เริ่มโหลดหน้าเลย ก่อนปล่อยนิ้ว */}
      <body hx-boost="true" hx-ext="preload">
        <Nav path={path} />
        <main class={wide ? '' : 'container page'}>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
