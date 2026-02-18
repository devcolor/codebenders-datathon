import { Pool } from "pg"

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      throw new Error(
        "Missing required database environment variables: DB_HOST, DB_USER, DB_PASSWORD"
      )
    }
    pool = new Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number.parseInt(process.env.DB_PORT || "54332"),
      database: process.env.DB_NAME || "postgres",
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 10,
    })
    pool.on("error", (err) => {
      console.error("Unexpected pg pool error:", err)
    })
  }
  return pool
}
