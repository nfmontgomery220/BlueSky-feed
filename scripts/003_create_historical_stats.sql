-- Create table for historical stats tracking
CREATE TABLE IF NOT EXISTS bluesky_feed.feed_stats_history (
  id SERIAL PRIMARY KEY,
  total_posts_received BIGINT DEFAULT 0,
  total_posts_indexed BIGINT DEFAULT 0,
  posts_with_images BIGINT DEFAULT 0,
  posts_with_video BIGINT DEFAULT 0,
  posts_filtered_out BIGINT DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster time-based queries
CREATE INDEX IF NOT EXISTS idx_feed_stats_history_recorded_at 
ON bluesky_feed.feed_stats_history(recorded_at DESC);

-- Insert current stats as first historical record
INSERT INTO bluesky_feed.feed_stats_history 
  (total_posts_received, total_posts_indexed, posts_with_images, posts_with_video, posts_filtered_out)
SELECT 
  total_posts_received, 
  total_posts_indexed, 
  posts_with_images, 
  posts_with_video, 
  posts_filtered_out
FROM bluesky_feed.feed_stats
WHERE id = (SELECT MAX(id) FROM bluesky_feed.feed_stats);
