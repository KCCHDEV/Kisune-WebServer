/**
 * เสียงของวิดีโอสอนใช้: เพลง lo-fi เบาๆ + เสียงคีย์บอร์ดตรงกับทุกตัวอักษรที่พิมพ์ + กระดิ่งตอนขึ้นบทใหม่
 * สังเคราะห์สดด้วย WebAudio ทั้งหมด (ไม่มีไฟล์เพลง) · ใช้ได้ทั้ง AudioContext และ OfflineAudioContext
 * 80 BPM → 1 ห้อง = 3 วินาที · คอร์ด Fmaj7 – Em7 – Dm7 – Cmaj7
 */
import { prng } from '../trailer/style'
import { CHAPTER_STARTS, DURATION, KEYSTROKES } from './script'

const BAR = 3
const BEAT = BAR / 4
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12)

const PROG = [
  { bass: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { bass: 40, notes: [52, 55, 59, 62] }, // Em7
  { bass: 38, notes: [50, 53, 57, 60] }, // Dm7
  { bass: 36, notes: [48, 52, 55, 59] }, // Cmaj7
]

export function scheduleMusic(ctx: BaseAudioContext, offset = 0, when = ctx.currentTime) {
  const rnd = prng(80)
  const at = (t: number) => when + (t - offset)
  const live = (t: number, len = 0) => t + len >= offset && t < DURATION

  /* ---------- สายสัญญาณ ---------- */
  const master = ctx.createGain()
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)
  // จางเข้า/ออกทั้งเพลง
  master.gain.setValueAtTime(0, at(Math.max(offset, 0)))
  master.gain.linearRampToValueAtTime(0.8, at(Math.max(offset, 1.2)))
  master.gain.setValueAtTime(0.8, at(Math.max(offset, DURATION - 3.5)))
  master.gain.linearRampToValueAtTime(0, at(DURATION))

  const music = ctx.createGain() // เพลงเบากว่าเสียงพิมพ์เล็กน้อย ให้ฟังสบาย
  music.gain.value = 0.75
  const warm = ctx.createBiquadFilter()
  warm.type = 'lowpass'
  warm.frequency.value = 5200
  music.connect(warm).connect(master)

  const reverb = ctx.createConvolver()
  const irLen = Math.floor(ctx.sampleRate * 2.4)
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < irLen; i++) d[i] = (rnd() * 2 - 1) * (1 - i / irLen) ** 3.2
  }
  reverb.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.32
  reverb.connect(wet).connect(music)

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1

  /* ---------- เครื่องดนตรี ---------- */
  const tone = (t: number, freq: number, len: number, gain: number, type: OscillatorType, attack: number, out: AudioNode, send = 0) => {
    if (!live(t, len)) return
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, at(t))
    g.gain.linearRampToValueAtTime(gain, at(t + attack))
    g.gain.exponentialRampToValueAtTime(0.0001, at(t + len))
    o.connect(g).connect(out)
    if (send) {
      const s = ctx.createGain()
      s.gain.value = send
      g.connect(s).connect(reverb)
    }
    o.start(at(Math.max(t, offset)))
    o.stop(at(t + len + 0.05))
  }

  const hit = (t: number, len: number, gain: number, filter: BiquadFilterType, freq: number, out: AudioNode = music) => {
    if (!live(t, len)) return
    const src = ctx.createBufferSource()
    src.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = filter
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, at(t))
    g.gain.exponentialRampToValueAtTime(0.0001, at(t + len))
    src.connect(f).connect(g).connect(out)
    src.start(at(t), rnd() * 0.5)
    src.stop(at(t + len + 0.02))
  }

  const kick = (t: number) => {
    if (!live(t, 0.4)) return
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(110, at(t))
    o.frequency.exponentialRampToValueAtTime(42, at(t + 0.18))
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.32, at(t))
    g.gain.exponentialRampToValueAtTime(0.0001, at(t + 0.38))
    o.connect(g).connect(music)
    o.start(at(t))
    o.stop(at(t + 0.4))
  }

  /* ---------- เพลง ---------- */
  const bars = Math.ceil(DURATION / BAR)
  for (let b = 0; b < bars; b++) {
    const t0 = b * BAR
    const chord = PROG[b % 4]!
    const groove = t0 >= 9 && t0 < DURATION - 9 // กลองเข้าหลังจบ intro ออกก่อนจบ

    // pad นุ่มๆ
    for (const n of chord.notes) {
      tone(t0, midi(n), BAR + 0.8, 0.022, 'triangle', 0.9, music, 0.6)
      tone(t0, midi(n) * 1.003, BAR + 0.8, 0.014, 'sine', 0.9, music, 0.6)
    }
    // เบส
    tone(t0, midi(chord.bass), BAR * 0.9, 0.11, 'sine', 0.02, music)
    tone(t0 + BEAT * 2.5, midi(chord.bass + 12), BEAT * 1.2, 0.05, 'sine', 0.02, music)
    // electric piano เดินคอร์ดเบาๆ
    const arp = [0, 2, 1, 3, 2, 1]
    arp.forEach((k, i) => {
      const r = rnd()
      if (r < 0.2) return // เว้นบางตัวให้ฟังเป็นธรรมชาติ
      tone(t0 + i * BEAT * 0.66, midi(chord.notes[k]! + 12), 1.2, 0.03, 'sine', 0.01, music, 0.5)
    })
    // กลอง lo-fi
    if (groove) {
      kick(t0)
      kick(t0 + BEAT * 2.5)
      hit(t0 + BEAT, 0.18, 0.09, 'bandpass', 1900)
      hit(t0 + BEAT * 3, 0.18, 0.09, 'bandpass', 1900)
      for (let i = 0; i < 8; i++) hit(t0 + i * (BEAT / 2) + (i % 2 ? 0.03 : 0), 0.05, i % 2 ? 0.02 : 0.03, 'highpass', 7500)
    }
  }

  /* ---------- กระดิ่งขึ้นบทใหม่ ---------- */
  for (const t of CHAPTER_STARTS) {
    tone(t, midi(88), 1.6, 0.05, 'sine', 0.005, master, 0.5)
    tone(t + 0.09, midi(95), 1.4, 0.035, 'sine', 0.005, master, 0.5)
  }

  /* ---------- เสียงพิมพ์ ---------- */
  const click = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.035), ctx.sampleRate)
  const cd = click.getChannelData(0)
  let prev = 0
  for (let i = 0; i < cd.length; i++) {
    const white = rnd() * 2 - 1
    const hp = white - prev // high-pass ง่ายๆ ให้เสียงแหลมแบบปุ่มกด
    prev = white
    cd[i] = hp * Math.exp(-i / (ctx.sampleRate * 0.006)) * 0.9
  }
  for (const k of KEYSTROKES) {
    const r = rnd()
    if (!live(k.t, 0.05)) continue
    const src = ctx.createBufferSource()
    src.buffer = click
    src.playbackRate.value = k.enter ? 0.6 : 0.8 + r * 0.4
    const g = ctx.createGain()
    g.gain.value = k.enter ? 0.32 : 0.16 + r * 0.06
    src.connect(g).connect(master)
    src.start(at(k.t))
  }
}
