// GET /trailer — วิดีโอ trailer ที่ render ด้วย WebGL ล้วนๆ (โค้ดอยู่ในโฟลเดอร์ trailer/)
//   ?autoplay=1  เล่นทันที (ไม่มีเสียงจนกว่าจะคลิก)   ?export=1  ใช้กับ scripts/trailer.ts
import { Html } from '@kitajs/html'

const safeStyle = `
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden; font-family: system-ui, sans-serif; }
  #stage { position: fixed; inset: 0; display: grid; place-items: center; }
  canvas { width: min(100vw, calc(100vh * 16 / 9)); height: auto; aspect-ratio: 16 / 9; display: block; background: #000; }
  .ui { position: fixed; left: 0; right: 0; bottom: 0; padding: 16px 20px; display: flex; gap: 12px; align-items: center;
        background: linear-gradient(transparent, rgb(0 0 0 / .75)); color: #e9e5f5; font-size: 14px; transition: opacity .3s; }
  body.playing .ui { opacity: 0; } body.playing:hover .ui { opacity: 1; }
  button { font: inherit; font-weight: 600; border: 0; border-radius: 10px; padding: 10px 18px; cursor: pointer;
           background: linear-gradient(120deg, #7c3aed, #a21caf 55%, #db2777); color: #fff; }
  button.ghost { background: rgb(255 255 255 / .1); }
  button:disabled { opacity: .5; cursor: wait; }
  .time { font-family: ui-monospace, Consolas, monospace; opacity: .8; min-width: 110px; }
  input[type=range] { flex: 1; accent-color: #c026d3; }
  a { color: #c4b5fd; }
  .status { opacity: .8; }
  body.export .ui { display: none; }
`

// ?export=1 ซ่อนแถบควบคุม (ใช้ตอน scripts/trailer.ts ถ่ายภาพ)
const safeExportFlag = `if (location.search.includes('export')) document.documentElement.classList.add('export'), document.addEventListener('DOMContentLoaded', () => document.body.classList.add('export'))`

export default function Trailer() {
  return (
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Kitsune — Trailer</title>
        <style>{safeStyle}</style>
      </head>
      <body>
        <div id="stage">
          <canvas id="c" width="1920" height="1080"></canvas>
        </div>
        <div class="ui">
          <button id="play">▶ เล่น (มีเสียง)</button>
          <span class="time" id="time">
            0:00 / 0:00
          </span>
          <input id="seek" type="range" min="0" max="1000" value="0" aria-label="เลื่อนเวลา" />
          <button id="export" class="ghost" title="render ทีละเฟรมแล้วดาวน์โหลดเป็น MP4 1080p">
            ⬇ ส่งออก MP4
          </button>
          <span class="status" id="status"></span>
          <a href="/">{Html.escapeHtml('← กลับเว็บ')}</a>
        </div>
        <script>{safeExportFlag}</script>
        <script type="module" src="/trailer/bundle"></script>
      </body>
    </html>
  )
}
