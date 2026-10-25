/**
 * Helper สำหรับเขียนไฟล์ route ให้มี type ครบ
 *
 *   export const POST = defineRoute({
 *     body: t.Object({ name: t.String() }),
 *     handler: ({ body }) => body.name,   // body มี type อัตโนมัติ
 *   })
 *
 * หรือถ้าไม่ต้องการ validate ก็ export ฟังก์ชันตรงๆ ได้เลย
 *   export const GET = () => 'hello'
 */
import type { Context, TSchema, Static } from 'elysia'
import type { ElysiaWS } from 'elysia/ws'

export { t } from 'elysia'

export type Schemas = {
  body?: TSchema
  query?: TSchema
  params?: TSchema
  headers?: TSchema
}

type Infer<S, K extends keyof Schemas, Fallback> = S extends { [P in K]: infer X }
  ? X extends TSchema
    ? Static<X>
    : Fallback
  : Fallback

export type RouteContext<S extends Schemas = {}> = Omit<Context, 'body' | 'query' | 'params' | 'headers'> & {
  body: Infer<S, 'body', unknown>
  query: Infer<S, 'query', Record<string, string | undefined>>
  params: Infer<S, 'params', Record<string, string>>
  headers: Infer<S, 'headers', Record<string, string | undefined>>
  /** ค่าที่ _guard.ts ส่งต่อมา (ผ่าน derive) */
  [key: string]: any
}

export type Handler<S extends Schemas = {}> = (ctx: RouteContext<S>) => unknown

export type RouteDef<S extends Schemas = {}> = S & {
  handler: Handler<S>
  /** ข้อมูลสำหรับ OpenAPI/เอกสาร (ถ้าใช้) */
  detail?: Record<string, unknown>
  beforeHandle?: Handler | Handler[]
}

type Opt<K extends string, T> = [T] extends [never] ? {} : { [P in K]: T }

export function defineRoute<
  B extends TSchema = never,
  Q extends TSchema = never,
  P extends TSchema = never,
  H extends TSchema = never,
>(def: {
  body?: B
  query?: Q
  params?: P
  headers?: H
  handler: Handler<NoInfer<Opt<'body', B> & Opt<'query', Q> & Opt<'params', P> & Opt<'headers', H>>>
  /** ข้อมูลสำหรับ OpenAPI/เอกสาร (ถ้าใช้) */
  detail?: Record<string, unknown>
  beforeHandle?: Handler | Handler[]
}): RouteDef {
  return def as RouteDef
}

/** _guard.ts: ใช้กับทุก route ในโฟลเดอร์เดียวกันและโฟลเดอร์ลูก */
export type Guard = {
  /** return ค่าใดๆ = ตัดจบ request (เช่น 401) ; ไม่ return = ผ่าน */
  beforeHandle?: Handler
  /** เพิ่มค่าเข้า context เช่น user ที่ login อยู่ */
  derive?: (ctx: RouteContext) => Record<string, unknown> | Promise<Record<string, unknown>>
}

export function defineGuard(g: Guard): Guard {
  return g
}

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const
export type Method = (typeof METHODS)[number]

/** export const WS = defineSocket({...}) — WebSocket ที่ path ของไฟล์นั้น (ดู src/pages/examples/websocket) */
export type Socket = ElysiaWS<any, any>

export function defineSocket<B extends TSchema = never>(def: {
  /** validate ข้อความที่เข้ามา (ถ้าส่ง JSON มา Elysia parse ให้เอง) */
  body?: B
  open?: (ws: Socket) => unknown
  message?: (ws: Socket, message: [B] extends [never] ? unknown : Static<B>) => unknown
  close?: (ws: Socket, code: number, reason: string) => unknown
}) {
  return def
}
