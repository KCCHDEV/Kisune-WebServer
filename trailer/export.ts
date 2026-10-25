/**
 * Export เป็น MP4 ในเบราว์เซอร์: render ทีละเฟรม → WebCodecs (H.264 + AAC) → mp4-muxer
 * ไม่ต้องมี ffmpeg · ทุกเฟรมคมเท่ากัน ไม่มีเฟรมตก ไม่ว่าเครื่องจะช้าแค่ไหน
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { scheduleMusic } from './audio'
import { DURATION } from './timeline'

export type ExportOptions = {
  canvas: HTMLCanvasElement
  renderFrame: (t: number) => void
  fps?: number
  bitrate?: number
  onProgress?: (p: number, label: string) => void
}

const SAMPLE_RATE = 48000

export async function exportMp4({ canvas, renderFrame, fps = 30, bitrate = 10_000_000, onProgress }: ExportOptions) {
  const { width, height } = canvas
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height, frameRate: fps },
    audio: { codec: 'aac', sampleRate: SAMPLE_RATE, numberOfChannels: 2 },
    fastStart: 'in-memory',
  })

  /* ---------- เสียง: render ทั้งเพลงแบบ offline ---------- */
  onProgress?.(0, 'กำลังสร้างเสียง…')
  const offline = new OfflineAudioContext(2, SAMPLE_RATE * DURATION, SAMPLE_RATE)
  scheduleMusic(offline, 0, 0)
  const audio = await offline.startRendering()

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error(e),
  })
  audioEncoder.configure({ codec: 'mp4a.40.2', sampleRate: SAMPLE_RATE, numberOfChannels: 2, bitrate: 192_000 })
  const L = audio.getChannelData(0)
  const R = audio.getChannelData(1)
  const CHUNK = 1024 * 4
  for (let i = 0; i < audio.length; i += CHUNK) {
    const n = Math.min(CHUNK, audio.length - i)
    const planar = new Float32Array(n * 2)
    planar.set(L.subarray(i, i + n), 0)
    planar.set(R.subarray(i, i + n), n)
    const data = new AudioData({
      format: 'f32-planar',
      sampleRate: SAMPLE_RATE,
      numberOfFrames: n,
      numberOfChannels: 2,
      timestamp: Math.round((i / SAMPLE_RATE) * 1e6),
      data: planar,
    })
    audioEncoder.encode(data)
    data.close()
  }
  await audioEncoder.flush()

  /* ---------- ภาพ: render ทีละเฟรม ---------- */
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error(e),
  })
  videoEncoder.configure({ codec: 'avc1.640028', width, height, bitrate, framerate: fps, latencyMode: 'quality' })

  const frames = Math.round(DURATION * fps)
  for (let i = 0; i < frames; i++) {
    renderFrame(i / fps)
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) })
    videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 })
    frame.close()
    // อย่าให้คิวยาวเกิน (หน่วยความจำ)
    while (videoEncoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 1))
    if (i % 15 === 0) {
      onProgress?.(i / frames, `render เฟรม ${i + 1}/${frames}`)
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  await videoEncoder.flush()
  muxer.finalize()
  onProgress?.(1, 'เสร็จแล้ว')
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}
