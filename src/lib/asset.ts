/**
 * ต่อท้าย ?v=<เวลาแก้ไขไฟล์> ให้ไฟล์ static — แก้ CSS/JS แล้ว browser โหลดใหม่ทันที
 * และเพราะ URL เปลี่ยนทุกครั้งที่ไฟล์เปลี่ยน server จึงสั่ง browser cache ได้ 1 ปีเต็ม (ดู core/static.ts)
 *   <link rel="stylesheet" href={asset('/public/style.css')} />
 *   <script src={asset('/vendor/htmx.js')} defer></script>
 *
 * รันจาก build: ใช้รหัส build แทน (ไฟล์ทุกตัวเปลี่ยนพร้อมกันตอน build ใหม่)
 */
import { statSync } from 'node:fs'
import { vendorPath } from '@core/static'
import { build, projectFile } from '@core/files'

const cache = new Map<string, string>()
const isProd = process.env.NODE_ENV === 'production'

const fileOf = (url: string) => (url.startsWith('/vendor/') ? vendorPath(url.slice('/vendor/'.length)) : projectFile(url))

export function asset(url: string): string {
  if (build) return `${url}?v=${build.id}`
  const hit = cache.get(url)
  if (hit) return hit
  let versioned = url
  try {
    versioned = `${url}?v=${statSync(fileOf(url)).mtimeMs.toFixed(0)}`
  } catch {}
  if (isProd) cache.set(url, versioned) // production: ไฟล์ไม่เปลี่ยน คำนวณครั้งเดียวพอ
  return versioned
}
