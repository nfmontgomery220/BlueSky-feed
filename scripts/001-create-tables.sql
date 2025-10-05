-- Create posts table
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
);

-- Create feed_stats table
CREATE TABLE IF NOT EXISTS bluesky_feed_stats (
  id SERIAL PRIMARY KEY,
  total_posts_received BIGINT DEFAULT 0,
  total_posts_indexed BIGINT DEFAULT 0,
  posts_with_images BIGINT DEFAULT 0,
  posts_with_video BIGINT DEFAULT 0,
  posts_filtered_out BIGINT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize stats
INSERT INTO bluesky_feed_stats (id, total_posts_received, total_posts_indexed)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON bluesky_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_relevance_score ON bluesky_posts(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_did ON bluesky_posts(author_did);
CREATE INDEX IF NOT EXISTS idx_posts_has_images ON bluesky_posts(has_images) WHERE has_images = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_has_video ON bluesky_posts(has_video) WHERE has_video = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_text_search ON bluesky_posts USING gin(to_tsvector('english', text));
