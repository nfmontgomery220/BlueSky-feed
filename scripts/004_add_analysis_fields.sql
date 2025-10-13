-- Add analysis and filtering fields to posts table
ALTER TABLE bluesky_feed.posts
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_analysis',
ADD COLUMN IF NOT EXISTS topic VARCHAR(100),
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS sentiment_label VARCHAR(50),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS themes TEXT[],
ADD COLUMN IF NOT EXISTS is_actionable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS time_sensitivity VARCHAR(50),
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Create index on status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_posts_status ON bluesky_feed.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_quality_score ON bluesky_feed.posts(quality_score);
CREATE INDEX IF NOT EXISTS idx_posts_analyzed_at ON bluesky_feed.posts(analyzed_at);

-- Add stats for analysis tracking
ALTER TABLE bluesky_feed.feed_stats
ADD COLUMN IF NOT EXISTS posts_pending_analysis INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_needs_review INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_approved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_rejected INTEGER DEFAULT 0;
