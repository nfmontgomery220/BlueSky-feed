import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.bfc_DATABASE_URL);

console.log('[v0] Starting migration 003: Create historical stats table...');

try {
  // Create the historical_stats table
  await sql`
    CREATE TABLE IF NOT EXISTS bluesky_feed.historical_stats (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      posts_received INTEGER NOT NULL DEFAULT 0,
      posts_indexed INTEGER NOT NULL DEFAULT 0,
      posts_filtered INTEGER NOT NULL DEFAULT 0,
      posts_with_images INTEGER NOT NULL DEFAULT 0,
      posts_with_video INTEGER NOT NULL DEFAULT 0,
      index_rate DECIMAL(5,2),
      filter_rate DECIMAL(5,2)
    )
  `;
  
  console.log('[v0] ✓ Created historical_stats table');

  // Create index on timestamp for faster queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_historical_stats_timestamp 
    ON bluesky_feed.historical_stats(timestamp DESC)
  `;
  
  console.log('[v0] ✓ Created index on timestamp');

  // Insert initial record if table is empty
  const result = await sql`
    INSERT INTO bluesky_feed.historical_stats 
    (posts_received, posts_indexed, posts_filtered, posts_with_images, posts_with_video, index_rate, filter_rate)
    SELECT 
      COALESCE(total_posts_received::INTEGER, 0),
      COALESCE(total_posts_indexed::INTEGER, 0),
      COALESCE(posts_filtered_out::INTEGER, 0),
      COALESCE(posts_with_images::INTEGER, 0),
      COALESCE(posts_with_video::INTEGER, 0),
      0.0,
      0.0
    FROM bluesky_feed.feed_stats
    ORDER BY id DESC
    LIMIT 1
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  
  if (result.length > 0) {
    console.log('[v0] ✓ Inserted initial historical record');
  } else {
    console.log('[v0] ✓ Historical stats table ready (already had data)');
  }

  console.log('[v0] Migration 003 completed successfully! ✓');
  
} catch (error) {
  console.error('[v0] Migration failed:', error.message);
  throw error;
}
