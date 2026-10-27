/**
 * Kitsune trailer — WebGL ล้วน (three.js) + ดนตรีสังเคราะห์ (WebAudio)
 * เปิดที่ /trailer · ส่งออก MP4 ด้วยปุ่มในหน้า หรือ  bun run trailer  (scripts/trailer.ts)
 */
import { createStage, loadFonts } from './engine'
import { buildTrailer, type Shots, type TrailerData } from './scenes'
import { DURATION } from './timeline'
import { scheduleMusic } from './audio'
import { exportMp4 } from './export'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const canvas = $<HTMLCanvasElement>('c')
const playBtn = $<HTMLButtonElement>('play')
const exportBtn = $<HTMLButtonElement>('export')
const seek = $<HTMLInputElement>('seek')
const timeEl = $('time')
const statusEl = $('status')

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

async function loadImage(src: string) {
  return new Promise<HTMLImageElement | undefined>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(undefined)
    img.src = src
  })
}

async function boot() {
  statusEl.textContent = 'กำลังโหลด…'
  // ฟอนต์ต้องพร้อมก่อนวาดข้อความลง canvas (เสิร์ฟจากเซิร์ฟเวอร์เราเอง)
  await loadFonts()
  const data = (await (await fetch('/trailer/data')).json()) as TrailerData
  const shots: Shots = {}
  await Promise.all(
    (['landing', 'examples', 'benchmark', 'cache', 'm-landing', 'm-examples', 'm-cache'] as const).map(async (k) => {
      const img = await loadImage(`/public/trailer/${k}.jpg?v=${Date.now()}`)
      if (img) shots[k] = img
    }),
  )

  const stage = createStage(canvas)
  const update = buildTrailer(stage, data, shots)
  const renderFrame = (t: number) => {
    update(t)
    stage.render()
  }
  renderFrame(0)

  /* ---------- เล่น / หยุด / เลื่อน ---------- */
  let audio: AudioContext | null = null
  let playing = false
  let startedAt = 0 // performance.now() ตอนเวลา 0
  let pausedAt = 0
  let raf = 0

  const now = () => (playing ? (performance.now() - startedAt) / 1000 : pausedAt)

  function tick() {
    const t = now()
    if (t >= DURATION) return stop(DURATION)
    renderFrame(t)
    seek.value = String(Math.round((t / DURATION) * 1000))
    timeEl.textContent = `${clock(t)} / ${clock(DURATION)}`
    raf = requestAnimationFrame(tick)
  }

  async function play(from = pausedAt >= DURATION ? 0 : pausedAt) {
    await audio?.close()
    audio = new AudioContext({ sampleRate: 48000 })
    scheduleMusic(audio, from, audio.currentTime + 0.05)
    startedAt = performance.now() + 50 - from * 1000
    playing = true
    document.body.classList.add('playing')
    playBtn.textContent = '❚❚ หยุด'
    cancelAnimationFrame(raf)
    tick()
  }

  function stop(at = now()) {
    playing = false
    pausedAt = at
    cancelAnimationFrame(raf)
    audio?.close()
    audio = null
    document.body.classList.remove('playing')
    playBtn.textContent = '▶ เล่น (มีเสียง)'
    renderFrame(Math.min(at, DURATION - 0.001))
  }

  playBtn.onclick = () => (playing ? stop() : play())
  seek.oninput = () => {
    const t = (Number(seek.value) / 1000) * DURATION
    if (playing) play(t)
    else stop(t)
    timeEl.textContent = `${clock(t)} / ${clock(DURATION)}`
  }
  timeEl.textContent = `0:00 / ${clock(DURATION)}`

  /* ---------- ส่งออก MP4 ---------- */
  async function doExport() {
    stop(0)
    exportBtn.disabled = playBtn.disabled = true
    const blob = await exportMp4({
      canvas,
      renderFrame,
      onProgress: (p, label) => {
        statusEl.textContent = `${label} (${Math.round(p * 100)}%)`
        ;(window as any).__exportProgress = p
      },
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kitsune-trailer.mp4'
    a.click()
    statusEl.textContent = `ส่งออกแล้ว ${(blob.size / 1024 / 1024).toFixed(1)} MB`
    exportBtn.disabled = playBtn.disabled = false
    return blob.size
  }
  exportBtn.onclick = () => void doExport()

  // ให้ scripts/trailer.ts สั่งงานผ่าน puppeteer ได้
  ;(window as any).video = (window as any).trailer = { duration: DURATION, renderFrame, export: doExport, data }
  statusEl.textContent = ''
  if (new URLSearchParams(location.search).has('autoplay')) play(0)
}

boot().catch((e) => {
  console.error(e)
  statusEl.textContent = 'โหลดไม่สำเร็จ: ' + (e?.message ?? e)
})
