import { neon } from "@neondatabase/serverless"

let _sql: ReturnType<typeof neon> | null = null

export function getDb() {
  if (!_sql) {
    if (!process.env.bfc_DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    _sql = neon(process.env.bfc_DATABASE_URL)
  }
  return _sql
}

export const sql = new Proxy((() => {}) as unknown as ReturnType<typeof neon>, {
  get(target, prop) {
    const db = getDb()
    const value = (db as any)[prop]
    return typeof value === "function" ? value.bind(db) : value
  },
  apply(target, thisArg, args) {
    const db = getDb()
    return db(...args)
  },
})
