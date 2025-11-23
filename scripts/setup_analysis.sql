-- Create the post_analysis table and related functions

-- 1. Create the analysis table
CREATE TABLE IF NOT EXISTS bluesky_feed.post_analysis (
  id SERIAL PRIMARY KEY,
  post_uri TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  confidence NUMERIC,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_used TEXT,
  FOREIGN KEY (post_uri) REFERENCES bluesky_feed.posts(uri) ON DELETE CASCADE
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_post_analysis_category ON bluesky_feed.post_analysis(category);
CREATE INDEX IF NOT EXISTS idx_post_analysis_sentiment ON bluesky_feed.post_analysis(sentiment);

-- 3. Create a view for analysis stats
CREATE OR REPLACE VIEW bluesky_feed.analysis_stats AS
SELECT 
  category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage,
  COUNT(*) FILTER (WHERE sentiment = 'Positive') as positive_count,
  COUNT(*) FILTER (WHERE sentiment = 'Negative') as negative_count,
  COUNT(*) FILTER (WHERE sentiment = 'Neutral') as neutral_count
FROM bluesky_feed.post_analysis
GROUP BY category;
