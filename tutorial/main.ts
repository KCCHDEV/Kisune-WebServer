/**
 * วิดีโอสอนใช้ Kitsune — canvas 2D + เสียงสังเคราะห์ (WebAudio)
 * เปิดที่ /tutorial · ส่งออก MP4 ด้วยปุ่มในหน้า หรือ  bun run trailer -- --tutorial  (scripts/trailer.ts)
 */
import { loadFonts } from '../trailer/style'
import { exportMp4 } from '../trailer/export'
import { renderFrame as draw, type Images } from './draw'
import { scheduleMusic } from './audio'
import { DURATION } from './script'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const canvas = $<HTMLCanvasElement>('c')
const playBtn = $<HTMLButtonElement>('play')
const exportBtn = $<HTMLButtonElement>('export')
const seek = $<HTMLInputElement>('seek')
const timeEl = $('time')
const statusEl = $('status')

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** ภาพหน้าจอจริง: แอพตัวอย่างใน public/tutorial/ + หน้าแม่แบบ Full จาก public/trailer/ */
const IMAGES = {
  home: '/public/tutorial/home.jpg',
  about: '/public/tutorial/about.jpg',
  'todos-empty': '/public/tutorial/todos-empty.jpg',
  todos: '/public/tutorial/todos.jpg',
  openapi: '/public/tutorial/openapi.jpg',
  examples: '/public/trailer/examples.jpg',
  benchmark: '/public/trailer/benchmark.jpg',
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | undefined>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(undefined)
    img.src = src
  })
}

async function boot() {
  statusEl.textContent = 'กำลังโหลด…'
  await loadFonts()
  const imgs: Images = {}
  await Promise.all(Object.entries(IMAGES).map(async ([k, src]) => (imgs[k] = await loadImage(src))))

  const ctx = canvas.getContext('2d')!
  const renderFrame = (t: number) => draw(ctx, t, imgs)
  renderFrame(0)

  /* ---------- เล่น / หยุด / เลื่อน ---------- */
  let audio: AudioContext | null = null
  let playing = false
  let startedAt = 0
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
      duration: DURATION,
      music: scheduleMusic,
      // ภาพนิ่งเป็นส่วนใหญ่ (หน้าจอ/โค้ด) — bitrate ต่ำกว่า trailer ก็ยังคม
      bitrate: 6_000_000,
      onProgress: (p, label) => {
        statusEl.textContent = `${label} (${Math.round(p * 100)}%)`
        ;(window as any).__exportProgress = p
      },
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kitsune-tutorial.mp4'
    a.click()
    statusEl.textContent = `ส่งออกแล้ว ${(blob.size / 1024 / 1024).toFixed(1)} MB`
    exportBtn.disabled = playBtn.disabled = false
    return blob.size
  }
  exportBtn.onclick = () => void doExport()

  // ให้ scripts/trailer.ts สั่งงานผ่าน puppeteer ได้
  ;(window as any).video = { duration: DURATION, renderFrame, export: doExport }
  statusEl.textContent = ''
  if (new URLSearchParams(location.search).has('autoplay')) play(0)
}

boot().catch((e) => {
  console.error(e)
  statusEl.textContent = 'โหลดไม่สำเร็จ: ' + (e?.message ?? e)
})
