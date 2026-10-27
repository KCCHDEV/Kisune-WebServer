// GET /trailer — วิดีโอ trailer ที่ render ด้วย WebGL ล้วนๆ (โค้ดอยู่ในโฟลเดอร์ trailer/)
import { VideoPlayer } from './_player'

export default function Trailer() {
  return <VideoPlayer title="Kitsune — Trailer" bundle="/trailer/bundle" />
}
