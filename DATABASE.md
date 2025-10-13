# Database Schema Documentation

## Overview

The feed generator uses Neon PostgreSQL with three main tables in the `bluesky_feed` schema.

## Schema: `bluesky_feed`

### Table: `posts`

Stores all collected posts with analysis data.

\`\`\`sql
CREATE TABLE bluesky_feed.posts (
  -- Identity
  id SERIAL PRIMARY KEY,
  uri TEXT NOT NULL UNIQUE,
  cid TEXT NOT NULL,
  author_did TEXT NOT NULL,
  
  -- Content
  text TEXT NOT NULL,
  reply_parent TEXT,
  reply_root TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Media flags
  has_images BOOLEAN DEFAULT FALSE,
  has_video BOOLEAN DEFAULT FALSE,
  has_external_link BOOLEAN DEFAULT FALSE,
  
  -- Engagement
  reply_count INTEGER DEFAULT 0,
  repost_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  
  -- Metadata
  langs TEXT[] DEFAULT ARRAY['en'],
  relevance_score DECIMAL(5,2) DEFAULT 0.00,
  
  -- AI Analysis Fields
  status TEXT DEFAULT 'pending_analysis',
    -- Values: 'pending_analysis', 'needs_review', 'approved', 'rejected'
  
  topic TEXT,
    -- Values: 'voter_registration', 'election_integrity', 'voting_rights',
    --         'civic_education', 'campaign_info', 'ballot_measures', 'other'
  
  sentiment_score DECIMAL(3,2),
    -- Range: -1.00 to 1.00 (negative to positive)
  
  sentiment_label TEXT,
    -- Values: 'encouraging', 'concerned', 'neutral', 'critical'
  
  quality_score DECIMAL(3,2),
    -- Range: 0.00 to 1.00 (low to high quality)
  
  themes TEXT[],
    -- Array of theme tags: ['accessibility', 'youth_engagement', etc.]
  
  is_actionable BOOLEAN DEFAULT FALSE,
    -- True if post contains call-to-action
  
  time_sensitivity TEXT,
    -- Values: 'urgent', 'time_bound', 'evergreen'
  
  analyzed_at TIMESTAMPTZ,
    -- When AI analysis was performed
  
  reviewed_by TEXT,
    -- Admin username who reviewed (if manually reviewed)
  
  review_notes TEXT
    -- Admin notes from manual review
);

-- Indexes for performance
CREATE INDEX idx_posts_status ON bluesky_feed.posts(status);
CREATE INDEX idx_posts_indexed_at ON bluesky_feed.posts(indexed_at DESC);
CREATE INDEX idx_posts_quality_score ON bluesky_feed.posts(quality_score DESC);
CREATE INDEX idx_posts_topic ON bluesky_feed.posts(topic);
CREATE INDEX idx_posts_author ON bluesky_feed.posts(author_did);
\`\`\`

**Row Count**: Grows continuously (144,000+ posts/day at 100 posts/minute)

**Storage**: ~500-2000 bytes per row

**Retention**: Configurable via database management tools (default: 30 days)

### Table: `feed_stats`

Aggregate statistics (single row, constantly updated).

\`\`\`sql
CREATE TABLE bluesky_feed.feed_stats (
  id SERIAL PRIMARY KEY,
  total_posts_received BIGINT DEFAULT 0,
  total_posts_indexed BIGINT DEFAULT 0,
  posts_filtered_out BIGINT DEFAULT 0,
  posts_with_images BIGINT DEFAULT 0,
  posts_with_video BIGINT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Row Count**: 1 (singleton)

**Updates**: Every minute by cron job

**Purpose**: Powers dashboard summary cards

### Table: `historical_stats`

Time-series data for charts.

\`\`\`sql
CREATE TABLE bluesky_feed.historical_stats (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posts_received INTEGER DEFAULT 0,
  posts_indexed INTEGER DEFAULT 0,
  posts_filtered INTEGER DEFAULT 0,
  posts_with_images INTEGER DEFAULT 0,
  posts_with_video INTEGER DEFAULT 0,
  filter_rate DECIMAL(5,2) DEFAULT 0.00,
  index_rate DECIMAL(5,2) DEFAULT 0.00
);

CREATE INDEX idx_historical_stats_timestamp 
  ON bluesky_feed.historical_stats(timestamp DESC);
\`\`\`

**Row Count**: ~1,440 rows/day (one per minute)

**Storage**: ~100 bytes per row

**Retention**: Configurable (default: 7 days)

**Purpose**: Powers dashboard charts

## Data Lifecycle

### 1. Collection
\`\`\`sql
INSERT INTO posts (
  uri, cid, author_did, text, created_at,
  has_images, has_video, has_external_link, langs,
  status
) VALUES (
  'at://...', 'bafyrei...', 'did:plc:...', 'Post text...',
  '2025-01-15 10:30:00', true, false, false, ARRAY['en'],
  'pending_analysis'
);
\`\`\`

### 2. Analysis
\`\`\`sql
UPDATE posts SET
  topic = 'voter_registration',
  sentiment_score = 0.75,
  sentiment_label = 'encouraging',
  quality_score = 0.82,
  themes = ARRAY['accessibility', 'deadlines'],
  is_actionable = true,
  time_sensitivity = 'time_bound',
  analyzed_at = NOW(),
  status = 'approved'  -- or 'needs_review' or 'rejected'
WHERE id = 12345;
\`\`\`

### 3. Manual Review
\`\`\`sql
UPDATE posts SET
  status = 'approved',
  reviewed_by = 'admin',
  review_notes = 'High quality, relevant content'
WHERE id = 12345;
\`\`\`

### 4. Serving
\`\`\`sql
SELECT uri, relevance_score, indexed_at
FROM posts
WHERE status = 'approved'
ORDER BY relevance_score DESC, indexed_at DESC
LIMIT 50;
\`\`\`

### 5. Cleanup
\`\`\`sql
-- Delete old posts
DELETE FROM posts
WHERE indexed_at < NOW() - INTERVAL '30 days';

-- Delete old historical stats
DELETE FROM historical_stats
WHERE timestamp < NOW() - INTERVAL '7 days';

-- Reclaim space
VACUUM ANALYZE posts;
VACUUM ANALYZE historical_stats;
\`\`\`

## Query Patterns

### Common Queries

**Get pending posts for analysis**
\`\`\`sql
SELECT id, uri, text, author_did
FROM posts
WHERE status = 'pending_analysis'
ORDER BY indexed_at ASC
LIMIT 100;
\`\`\`

**Get posts needing review**
\`\`\`sql
SELECT id, uri, text, topic, quality_score, sentiment_label
FROM posts
WHERE status = 'needs_review'
ORDER BY indexed_at DESC;
\`\`\`

**Get approved feed posts**
\`\`\`sql
SELECT uri
FROM posts
WHERE status = 'approved'
ORDER BY relevance_score DESC, indexed_at DESC
LIMIT 50;
\`\`\`

**Get stats for dashboard**
\`\`\`sql
SELECT 
  total_posts_received,
  total_posts_indexed,
  posts_filtered_out,
  ROUND(100.0 * posts_filtered_out / NULLIF(total_posts_received, 0), 2) as filter_rate
FROM feed_stats;
\`\`\`

**Get historical data for charts**
\`\`\`sql
SELECT 
  timestamp,
  posts_received,
  posts_indexed,
  filter_rate
FROM historical_stats
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp ASC;
\`\`\`

## Storage Management

### Current Usage Query
\`\`\`sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'bluesky_feed'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
\`\`\`

### Row Counts
\`\`\`sql
SELECT 
  'posts' as table_name,
  COUNT(*) as row_count,
  COUNT(*) FILTER (WHERE status = 'pending_analysis') as pending,
  COUNT(*) FILTER (WHERE status = 'needs_review') as needs_review,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM posts
UNION ALL
SELECT 
  'historical_stats',
  COUNT(*),
  NULL, NULL, NULL, NULL
FROM historical_stats;
\`\`\`

### Cleanup Recommendations

**Daily**: Delete posts older than retention period
**Weekly**: Delete old historical stats
**Monthly**: Run VACUUM ANALYZE to reclaim space

## Backup & Recovery

### Neon Automatic Backups
- Point-in-time recovery (7 days)
- Managed by Neon platform
- No manual backup needed

### Manual Export (if needed)
\`\`\`bash
# Export posts table
pg_dump $DATABASE_URL -t bluesky_feed.posts > posts_backup.sql

# Export all tables
pg_dump $DATABASE_URL -n bluesky_feed > full_backup.sql
\`\`\`

## Performance Optimization

### Indexes
- All frequently queried columns are indexed
- Composite indexes for common query patterns
- Regular ANALYZE to update statistics

### Query Optimization
- Use LIMIT for large result sets
- Filter by indexed columns (status, indexed_at)
- Avoid SELECT * in production queries

### Connection Pooling
- Neon provides automatic connection pooling
- Use `DATABASE_URL` (pooled) for API routes
- Use `DATABASE_URL_UNPOOLED` for migrations
