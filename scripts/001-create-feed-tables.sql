-- Create schema for Bluesky feed data
CREATE SCHEMA IF NOT EXISTS bluesky_feed;

-- Table to store indexed posts from the firehose
CREATE TABLE IF NOT EXISTS bluesky_feed.posts (
  id SERIAL PRIMARY KEY,
  uri TEXT NOT NULL UNIQUE,
  cid TEXT NOT NULL,
  author_did TEXT NOT NULL,
  author_handle TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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

-- Table to store feed statistics
CREATE TABLE IF NOT EXISTS bluesky_feed.feed_stats (
  id SERIAL PRIMARY KEY,
  total_posts_received BIGINT DEFAULT 0,
  total_posts_indexed BIGINT DEFAULT 0,
  posts_with_images BIGINT DEFAULT 0,
  posts_with_video BIGINT DEFAULT 0,
  posts_filtered_out BIGINT DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize stats row
INSERT INTO bluesky_feed.feed_stats (id, total_posts_received, total_posts_indexed)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON bluesky_feed.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_relevance_score ON bluesky_feed.posts(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_did ON bluesky_feed.posts(author_did);
CREATE INDEX IF NOT EXISTS idx_posts_has_images ON bluesky_feed.posts(has_images) WHERE has_images = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_has_video ON bluesky_feed.posts(has_video) WHERE has_video = TRUE;

-- Full text search index on post text
CREATE INDEX IF NOT EXISTS idx_posts_text_search ON bluesky_feed.posts USING gin(to_tsvector('english', text));
