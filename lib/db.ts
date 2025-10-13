import { neon } from "@neondatabase/serverless"

let _sql: ReturnType<typeof neon> | null = null

export function getDb() {
  if (!_sql) {
    const dbUrl =
      process.env.DATABASE_URL ||
      process.env.bfc_DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.bfc_POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.bfc_POSTGRES_PRISMA_URL

    console.log("[v0] Available env vars:", {
      DATABASE_URL: !!process.env.DATABASE_URL,
      bfc_DATABASE_URL: !!process.env.bfc_DATABASE_URL,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      bfc_POSTGRES_URL: !!process.env.bfc_POSTGRES_URL,
    })

    if (!dbUrl) {
      throw new Error(
        "No database connection string found. Please add DATABASE_URL environment variable in your Vercel project settings.",
      )
    }

    console.log("[v0] Using database URL from:", dbUrl.substring(0, 20) + "...")
    _sql = neon(dbUrl)
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
