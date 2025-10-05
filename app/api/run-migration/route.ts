import { NextResponse } from "next/server"
import { sql, checkDatabaseConnection } from "@/lib/db"

export async function POST() {
  try {
    // Check database connection first
    const isConnected = await checkDatabaseConnection()
    if (!isConnected) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 })
    }

    console.log("[v0] Starting migration...")

    // Create posts table
    await sql`
      CREATE TABLE IF NOT EXISTS bluesky_posts (
        id SERIAL PRIMARY KEY,
        uri TEXT NOT NULL UNIQUE,
        cid TEXT NOT NULL,
        author_did TEXT NOT NULL,
        author_handle TEXT,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        indexed_at TIMESTAMPTZ DEFAULT NOW(),
        has_images BOOLEAN DEFAULT FALSE,
        has_video BOOLEAN DEFAULT FALSE,
        has_external_link BOOLEAN DEFAULT FALSE,
        external_domain TEXT,
        relevance_score NUMERIC(5,2) DEFAULT 0,
        embed_data JSONB,
        facets JSONB,
        labels JSONB,
        langs TEXT[]
      )
    `
    console.log("[v0] ✓ Posts table created")

    // Create feed_stats table
    await sql`
      CREATE TABLE IF NOT EXISTS bluesky_feed_stats (
        id SERIAL PRIMARY KEY,
        total_posts_received BIGINT DEFAULT 0,
        total_posts_indexed BIGINT DEFAULT 0,
        posts_with_images BIGINT DEFAULT 0,
        posts_with_video BIGINT DEFAULT 0,
        posts_filtered_out BIGINT DEFAULT 0,
        last_updated TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log("[v0] ✓ Feed stats table created")

    // Initialize stats
    await sql`
      INSERT INTO bluesky_feed_stats (id, total_posts_received, total_posts_indexed)
      VALUES (1, 0, 0)
      ON CONFLICT (id) DO NOTHING
    `
    console.log("[v0] ✓ Stats initialized")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON bluesky_posts(created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_relevance_score ON bluesky_posts(relevance_score DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_author_did ON bluesky_posts(author_did)`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_has_images ON bluesky_posts(has_images) WHERE has_images = TRUE`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_has_video ON bluesky_posts(has_video) WHERE has_video = TRUE`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_text_search ON bluesky_posts USING gin(to_tsvector('english', text))`
    console.log("[v0] ✓ Indexes created")

    console.log("[v0] Migration completed successfully!")

    return NextResponse.json({
      success: true,
      message: "Database tables created successfully",
    })
  } catch (error: any) {
    console.error("[v0] Migration failed:", error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
