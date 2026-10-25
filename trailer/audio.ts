/**
 * ดนตรีประกอบ trailer: สังเคราะห์สดด้วย WebAudio ทั้งหมด (ไม่มีไฟล์เพลง ไม่มีปัญหาลิขสิทธิ์)
 * 120 BPM (1 ห้อง = 2 วินาที ตรงกับรอยต่อฉากใน timeline.ts) · คอร์ด Am – F – C – G
 * ใช้ได้ทั้งตอนเล่นสด (AudioContext) และตอน export (OfflineAudioContext)
 */
import { prng } from './engine'
import { DURATION, IMPACTS } from './timeline'

const BEAT = 0.5
const BAR = 2
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12)

const PROG = [
  { bass: 33, pad: [57, 60, 64, 69] }, // Am
  { bass: 29, pad: [53, 57, 60, 65] }, // F
  { bass: 36, pad: [55, 60, 64, 67] }, // C
  { bass: 31, pad: [55, 59, 62, 67] }, // G
]
const chordAt = (t: number) => PROG[Math.floor(t / BAR) % 4]!

/** ช่วงของเพลง → ระดับความหนัก */
function section(t: number) {
  if (t < 6) return 'intro' // prologue
  if (t < 22) return t < 14 ? 'build1' : 'build2' // title · graph
  if (t < 32) return 'drop' // speed
  if (t < 42) return 'chill' // code
  if (t < 58) return 'full' // screens · devices
  if (t < 68) return 'filter' // terminal (กวาด filter ขึ้น)
  if (t < 73.5) return 'final'
  if (t < 74) return 'break'
  return 'outro' // โลโก้ค้าง
}

export function scheduleMusic(ctx: BaseAudioContext, offset = 0, when = ctx.currentTime) {
  const rnd = prng(2026)
  const at = (t: number) => when + (t - offset)
  const live = (t: number, len = 0) => t + len >= offset && t < DURATION

  /* ---------- สายสัญญาณ ---------- */
  const master = ctx.createGain()
  master.gain.value = 0.85
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 4
  comp.attack.value = 0.004
  comp.release.value = 0.18
  const tone = ctx.createBiquadFilter() // ใช้กวาด filter ช่วง 58–68 (ฉาก terminal)
  tone.type = 'lowpass'
  tone.frequency.value = 20000
  master.connect(tone).connect(comp).connect(ctx.destination)

  // reverb จาก impulse response ที่สร้างเอง
  const reverb = ctx.createConvolver()
  const irLen = Math.floor(ctx.sampleRate * 2.6)
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < irLen; i++) d[i] = (rnd() * 2 - 1) * (1 - i / irLen) ** 3
  }
  reverb.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.32
  reverb.connect(wet).connect(master)

  // delay สำหรับ arp (dotted 8th)
  const delay = ctx.createDelay(2)
  delay.delayTime.value = BEAT * 0.75
  const fb = ctx.createGain()
  fb.gain.value = 0.32
  const delayOut = ctx.createGain()
  delayOut.gain.value = 0.35
  delay.connect(fb).connect(delay)
  delay.connect(delayOut).connect(master)

  // noise buffer ใช้ร่วมกัน
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1

  // pad ผ่าน gain ที่ "ยุบ" ทุกครั้งที่ kick ดัง (sidechain)
  const padBus = ctx.createGain()
  padBus.gain.value = 1
  padBus.connect(master)
  padBus.connect(reverb)

  const filterEnv = (param: AudioParam, t: number, from: number, to: number, dur: number) => {
    param.setValueAtTime(from, at(t))
    param.exponentialRampToValueAtTime(Math.max(1, to), at(t + dur))
  }
  const env = (g: GainNode, t: number, peak: number, attack: number, decay: number) => {
    g.gain.setValueAtTime(0.0001, at(t))
    g.gain.exponentialRampToValueAtTime(peak, at(t + attack))
    g.gain.exponentialRampToValueAtTime(0.0001, at(t + attack + decay))
  }
  const noiseSrc = (t: number, dur: number) => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    s.loop = true
    s.start(at(t), rnd() * 1.5)
    s.stop(at(t + dur + 0.05))
    return s
  }

  /* ---------- เครื่องดนตรี ---------- */
  function kick(t: number, vol = 0.95) {
    if (!live(t, 0.5)) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(160, at(t))
    o.frequency.exponentialRampToValueAtTime(42, at(t + 0.13))
    env(g, t, vol, 0.003, 0.4)
    o.connect(g).connect(master)
    o.start(at(t))
    o.stop(at(t + 0.5))
    // ยุบ pad ให้ kick เด่น
    padBus.gain.setValueAtTime(0.35, at(t))
    padBus.gain.linearRampToValueAtTime(1, at(t + 0.35))
  }
  function clap(t: number, vol = 0.32) {
    if (!live(t, 0.3)) return
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 1700
    f.Q.value = 0.9
    const g = ctx.createGain()
    env(g, t, vol, 0.002, 0.2)
    noiseSrc(t, 0.25).connect(f).connect(g)
    g.connect(master)
    g.connect(reverb)
  }
  function hat(t: number, open = false, vol = 0.07) {
    if (!live(t, 0.3)) return
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 7500
    const g = ctx.createGain()
    env(g, t, vol, 0.001, open ? 0.22 : 0.045)
    noiseSrc(t, open ? 0.3 : 0.08).connect(f).connect(g).connect(master)
  }
  function bass(t: number, note: number, dur: number, vol = 0.22) {
    if (!live(t, dur)) return
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.Q.value = 6
    filterEnv(f.frequency, t, 900, 140, dur * 0.9)
    const g = ctx.createGain()
    env(g, t, vol, 0.005, dur)
    for (const [type, detune, mul] of [['sawtooth', -6, 1], ['sawtooth', 6, 1], ['sine', 0, 0.5]] as const) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = midi(note) * mul
      o.detune.value = detune
      o.connect(f)
      o.start(at(t))
      o.stop(at(t + dur + 0.05))
    }
    f.connect(g).connect(master)
  }
  function pad(t: number, notes: number[], dur: number, vol = 0.045) {
    if (!live(t, dur + 1)) return
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 1400
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, at(t))
    g.gain.linearRampToValueAtTime(vol, at(t + 0.5))
    g.gain.setValueAtTime(vol, at(t + dur))
    g.gain.linearRampToValueAtTime(0.0001, at(t + dur + 0.9))
    for (const n of notes)
      for (const d of [-9, 0, 9]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = midi(n)
        o.detune.value = d
        o.connect(f)
        o.start(at(t))
        o.stop(at(t + dur + 1))
      }
    f.connect(g).connect(padBus)
  }
  function pluck(t: number, note: number, vol = 0.1) {
    if (!live(t, 0.6)) return
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    filterEnv(f.frequency, t, 5000, 600, 0.3)
    const g = ctx.createGain()
    env(g, t, vol, 0.003, 0.32)
    for (const type of ['triangle', 'sawtooth'] as const) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = midi(note)
      o.connect(f)
      o.start(at(t))
      o.stop(at(t + 0.45))
    }
    f.connect(g)
    g.connect(master)
    g.connect(delay)
  }
  function riser(t: number, dur: number, vol = 0.22) {
    if (!live(t, dur)) return
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 3
    filterEnv(f.frequency, t, 300, 7000, dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, at(t))
    g.gain.exponentialRampToValueAtTime(vol, at(t + dur))
    g.gain.linearRampToValueAtTime(0.0001, at(t + dur + 0.05))
    noiseSrc(t, dur).connect(f).connect(g)
    g.connect(master)
    g.connect(reverb)
  }
  function impact(t: number, vol = 0.8) {
    if (!live(t, 2)) return
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(90, at(t))
    o.frequency.exponentialRampToValueAtTime(32, at(t + 1.2))
    const g = ctx.createGain()
    env(g, t, vol, 0.004, 1.6)
    o.connect(g)
    g.connect(master)
    o.start(at(t))
    o.stop(at(t + 1.8))
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    filterEnv(f.frequency, t, 8000, 200, 0.8)
    const ng = ctx.createGain()
    env(ng, t, vol * 0.5, 0.002, 0.9)
    noiseSrc(t, 1).connect(f).connect(ng)
    ng.connect(master)
    ng.connect(reverb)
  }
  function roll(t: number, dur: number) {
    const steps = 16
    for (let i = 0; i < steps; i++) {
      const p = i / steps
      clap(t + dur * (1 - (1 - p) ** 1.6), 0.08 + p * 0.25)
    }
  }

  /* ---------- เรียบเรียง ---------- */
  // pad ทุกห้อง
  for (let t = 0; t < 74; t += BAR) {
    const s = section(t)
    if (s === 'break') continue
    pad(t, chordAt(t).pad, BAR, s === 'intro' ? 0.035 : s === 'chill' ? 0.05 : 0.04)
  }

  for (let i = 0; i < DURATION / (BEAT / 4); i++) {
    const t = i * (BEAT / 4) // 16th note
    const s = section(t)
    const sixteenth = i % 4
    const beat = Math.floor(i / 4)
    const onBeat = sixteenth === 0
    const chord = chordAt(t)

    if (s === 'intro' || s === 'break') continue
    if (s === 'outro') {
      if (t < 77 && onBeat && beat % 2 === 0) pluck(t, chord.pad[(beat / 2) % 4]! + 12, 0.08)
      continue
    }

    // kick
    if (onBeat && (s !== 'chill' || beat % 2 === 0)) kick(t, s === 'chill' ? 0.75 : 0.95)
    // clap บนจังหวะ 2 และ 4
    if (onBeat && beat % 2 === 1 && ['build2', 'drop', 'full', 'final'].includes(s)) clap(t)
    // hi-hat
    const hats16 = s === 'drop' || s === 'full' || s === 'final'
    if (hats16 ? true : sixteenth === 2) hat(t, s === 'full' && sixteenth === 2 && beat % 2 === 1, sixteenth === 2 ? 0.085 : 0.045)
    // bass
    if (s === 'chill') {
      if (t % BAR === 0) bass(t, chord.bass, BAR * 0.95, 0.2)
    } else if (s === 'drop' || s === 'full' || s === 'final') {
      if (sixteenth !== 0) bass(t, chord.bass + (sixteenth === 3 ? 12 : 0), BEAT / 4, 0.17)
    } else if (sixteenth === 2) bass(t, chord.bass, BEAT / 2, 0.2)
    // arp
    if (s === 'drop') pluck(t, chord.pad[i % 4]! + 12, 0.07)
    if (s === 'chill' && sixteenth % 2 === 0) pluck(t, chord.pad[(i / 2) % 4]! + (beat % 4 === 3 ? 19 : 12), 0.09)
    if (s === 'full' && sixteenth % 2 === 0) pluck(t, chord.pad[(i / 2) % 4]! + 12, 0.06)
  }

  // สายฟ้า (impact) + riser ก่อนเปลี่ยนฉาก
  for (const t of IMPACTS) impact(t, t === 22 || t === 68 || t === 74 ? 0.95 : 0.55)
  riser(2.5, 3.5)
  riser(12.0, 2.0)
  riser(20.0, 2.0)
  roll(21.0, 1.0)
  riser(40.0, 2.0)
  roll(41.0, 1.0)
  riser(56.0, 2.0)
  riser(64.0, 4.0, 0.26)
  roll(67.0, 1.0)
  riser(72.6, 1.4, 0.3)
  pad(74, [45, 57, 60, 64, 71], 4.5, 0.06) // Am(add9) ปิดท้าย

  // กวาด filter ช่วง 58–68 (เสียงอู้ → เปิดเต็มตอนจบ)
  if (offset < 68) {
    const start = Math.max(58, offset) // เริ่มเล่นกลางช่วง → เริ่มกวาดจากความถี่ที่ควรเป็น ณ ตอนนั้น
    tone.frequency.setValueAtTime(500 * 36 ** ((start - 58) / 9.9), at(start))
    tone.frequency.exponentialRampToValueAtTime(18000, at(67.9))
    tone.frequency.setValueAtTime(20000, at(68))
  }

  // fade ตอนจบ
  master.gain.setValueAtTime(0.85, at(Math.max(offset, 78)))
  master.gain.linearRampToValueAtTime(0.0001, at(DURATION))

  return master
}
