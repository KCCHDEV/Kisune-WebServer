// GET /tutorial — วิดีโอสอนใช้ Kitsune ตั้งแต่ติดตั้งจนขึ้น production (โค้ดอยู่ในโฟลเดอร์ tutorial/)
import { VideoPlayer } from '../trailer/_player'

export default function Tutorial() {
  return <VideoPlayer title="Kitsune — สอนใช้งาน" bundle="/tutorial/bundle" />
}
