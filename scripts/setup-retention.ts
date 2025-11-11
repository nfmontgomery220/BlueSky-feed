import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function setupRetention() {
  console.log("[v0] Starting retention tables setup...")

  try {
    // Create hourly aggregation table
    await sql`
      CREATE TABLE IF NOT EXISTS bluesky_feed.feed_stats_hourly (
        id SERIAL PRIMARY KEY,
        hour_start TIMESTAMP NOT NULL,
        posts_received INTEGER DEFAULT 0,
        posts_indexed INTEGER DEFAULT 0,
        posts_filtered INTEGER DEFAULT 0,
        unique_authors INTEGER DEFAULT 0,
        posts_with_media INTEGER DEFAULT 0,
        posts_with_links INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(hour_start)
      )
    `
    console.log("[v0] ✓ Created feed_stats_hourly table")

    // Create daily aggregation table
    await sql`
      CREATE TABLE IF NOT EXISTS bluesky_feed.feed_stats_daily (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        posts_received INTEGER DEFAULT 0,
        posts_indexed INTEGER DEFAULT 0,
        posts_filtered INTEGER DEFAULT 0,
        unique_authors INTEGER DEFAULT 0,
        posts_with_media INTEGER DEFAULT 0,
        posts_with_links INTEGER DEFAULT 0,
        avg_posts_per_hour DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date)
      )
    `
    console.log("[v0] ✓ Created feed_stats_daily table")

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_hourly_hour ON bluesky_feed.feed_stats_hourly(hour_start DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_date ON bluesky_feed.feed_stats_daily(date DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_indexed_at ON bluesky_feed.posts(indexed_at DESC)`
    console.log("[v0] ✓ Created indexes")

    // Create aggregate function
    await sql`
      CREATE OR REPLACE FUNCTION bluesky_feed.aggregate_to_hourly(cutoff_date TIMESTAMP)
      RETURNS TABLE(hours_aggregated INTEGER, posts_aggregated INTEGER) AS $$
      DECLARE
        hours_count INTEGER;
        posts_count INTEGER;
      BEGIN
        -- Aggregate posts to hourly stats
        INSERT INTO bluesky_feed.feed_stats_hourly (
          hour_start, posts_received, posts_indexed, posts_filtered,
          unique_authors, posts_with_media, posts_with_links
        )
        SELECT 
          DATE_TRUNC('hour', indexed_at) as hour_start,
          COUNT(*) as posts_received,
          COUNT(*) as posts_indexed,
          0 as posts_filtered,
          COUNT(DISTINCT author) as unique_authors,
          COUNT(*) FILTER (WHERE has_media = true) as posts_with_media,
          COUNT(*) FILTER (WHERE has_links = true) as posts_with_links
        FROM bluesky_feed.posts
        WHERE indexed_at < cutoff_date
        GROUP BY DATE_TRUNC('hour', indexed_at)
        ON CONFLICT (hour_start) DO UPDATE SET
          posts_received = bluesky_feed.feed_stats_hourly.posts_received + EXCLUDED.posts_received,
          posts_indexed = bluesky_feed.feed_stats_hourly.posts_indexed + EXCLUDED.posts_indexed,
          unique_authors = GREATEST(bluesky_feed.feed_stats_hourly.unique_authors, EXCLUDED.unique_authors),
          posts_with_media = bluesky_feed.feed_stats_hourly.posts_with_media + EXCLUDED.posts_with_media,
          posts_with_links = bluesky_feed.feed_stats_hourly.posts_with_links + EXCLUDED.posts_with_links;

        GET DIAGNOSTICS hours_count = ROW_COUNT;

        -- Count posts to be deleted
        SELECT COUNT(*) INTO posts_count
        FROM bluesky_feed.posts
        WHERE indexed_at < cutoff_date;

        -- Delete aggregated posts
        DELETE FROM bluesky_feed.posts WHERE indexed_at < cutoff_date;

        RETURN QUERY SELECT hours_count, posts_count;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("[v0] ✓ Created aggregate_to_hourly function")

    // Create daily aggregation function
    await sql`
      CREATE OR REPLACE FUNCTION bluesky_feed.aggregate_to_daily(cutoff_date TIMESTAMP)
      RETURNS TABLE(days_aggregated INTEGER) AS $$
      DECLARE
        days_count INTEGER;
      BEGIN
        -- Aggregate hourly stats to daily stats
        INSERT INTO bluesky_feed.feed_stats_daily (
          date, posts_received, posts_indexed, posts_filtered,
          unique_authors, posts_with_media, posts_with_links, avg_posts_per_hour
        )
        SELECT 
          DATE_TRUNC('day', hour_start)::DATE as date,
          SUM(posts_received) as posts_received,
          SUM(posts_indexed) as posts_indexed,
          SUM(posts_filtered) as posts_filtered,
          MAX(unique_authors) as unique_authors,
          SUM(posts_with_media) as posts_with_media,
          SUM(posts_with_links) as posts_with_links,
          AVG(posts_indexed)::DECIMAL(10,2) as avg_posts_per_hour
        FROM bluesky_feed.feed_stats_hourly
        WHERE hour_start < cutoff_date
        GROUP BY DATE_TRUNC('day', hour_start)
        ON CONFLICT (date) DO UPDATE SET
          posts_received = bluesky_feed.feed_stats_daily.posts_received + EXCLUDED.posts_received,
          posts_indexed = bluesky_feed.feed_stats_daily.posts_indexed + EXCLUDED.posts_indexed,
          posts_filtered = bluesky_feed.feed_stats_daily.posts_filtered + EXCLUDED.posts_filtered,
          unique_authors = GREATEST(bluesky_feed.feed_stats_daily.unique_authors, EXCLUDED.unique_authors),
          posts_with_media = bluesky_feed.feed_stats_daily.posts_with_media + EXCLUDED.posts_with_media,
          posts_with_links = bluesky_feed.feed_stats_daily.posts_with_links + EXCLUDED.posts_with_links;

        GET DIAGNOSTICS days_count = ROW_COUNT;

        -- Delete aggregated hourly stats
        DELETE FROM bluesky_feed.feed_stats_hourly WHERE hour_start < cutoff_date;

        RETURN QUERY SELECT days_count;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("[v0] ✓ Created aggregate_to_daily function")

    console.log("[v0] ✅ Retention system setup complete!")
    console.log("[v0] You can now use the retention page at /admin/retention")
  } catch (error) {
    console.error("[v0] ❌ Setup failed:", error)
    throw error
  }
}

setupRetention()
