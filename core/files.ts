/**
 * หาไฟล์ของโปรเจกต์ให้ถูกที่ ไม่ว่าจะรันแบบไหน
 *
 *   bun dev / bun start          → ไฟล์จริงในโฟลเดอร์โปรเจกต์
 *   bun dist/standalone/server.js → ไฟล์ที่ build คัดลอกไว้ข้างๆ server.js
 *   ไฟล์ executable (--compile)   → ไฟล์ที่ฝังอยู่ในตัวโปรแกรม
 *
 * scripts/build.ts ตั้งค่า globalThis.__KITSUNE_BUILD__ ก่อนโหลดแอพ (ดู .kitsune/entry.ts ที่มันสร้าง)
 */
import { join } from 'node:path'

export type BuildInfo = {
  /** เวลา build — ใช้เป็น ?v= ของไฟล์ static แทนเวลาแก้ไขไฟล์ */
  id: string
  /** โฟลเดอร์ของ server.js (standalone) */
  root: string
  /** module ของทุก route + _guard ที่ import ไว้ล่วงหน้า (แทนการสแกนโฟลเดอร์) */
  modules: Record<string, Record<string, unknown>>
  /** path ในโปรเจกต์ → path ของไฟล์ที่ฝังไว้ (เฉพาะ --compile) */
  files: Record<string, string>
}

export const build = (globalThis as { __KITSUNE_BUILD__?: BuildInfo }).__KITSUNE_BUILD__

const clean = (rel: string) => rel.replaceAll('\\', '/').replace(/^\.?\//, '')

/** path จริงของไฟล์ (rel = path จากรากโปรเจกต์ เช่น 'public/style.css') */
export function projectFile(rel: string) {
  rel = clean(rel)
  return build?.files[rel] ?? join(build?.root ?? process.cwd(), rel)
}

/** ไฟล์นี้ฝังอยู่ในตัวโปรแกรมไหม (ใช้กับไฟล์ที่ path มาจากผู้ใช้ เช่น /public/* — ไม่ต้องเช็ก path traversal) */
export const embedded = (rel: string): string | undefined => build?.files[clean(rel)]
export const isEmbeddedBuild = () => !!build && Object.keys(build.files).length > 0
