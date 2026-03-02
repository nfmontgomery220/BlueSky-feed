-- ============================================================
-- RELEVANCE SCORING SYSTEM
-- ============================================================
-- Tiered waterfall scoring with 4 categories:
--   1. Keyword matches (configurable dictionary)
--   2. Hashtag matches (from tracked hashtags)
--   3. Author trust (built from historical performance)
--   4. Engagement signals (tie-breaker: media, links, length)
--
-- Each category has a configurable weight.
-- Posts must meet minimum threshold to be included.
-- ============================================================

-- Table 1: Keyword Dictionary
-- Store keywords/phrases with individual weights
CREATE TABLE IF NOT EXISTS bluesky_feed.relevance_keywords (
  id SERIAL PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  weight NUMERIC(3,2) DEFAULT 1.0,  -- 0.0 to 1.0, multiplier for this keyword
  category TEXT DEFAULT 'general',   -- group keywords: 'budget', 'vote', 'congress', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Author Trust Scores
-- Built over time from post performance
CREATE TABLE IF NOT EXISTS bluesky_feed.author_trust (
  id SERIAL PRIMARY KEY,
  author_did TEXT NOT NULL UNIQUE,
  author_handle TEXT,
  trust_score NUMERIC(4,3) DEFAULT 0.500,  -- 0.000 to 1.000
  total_posts INTEGER DEFAULT 0,
  quality_posts INTEGER DEFAULT 0,         -- posts that met relevance threshold
  last_post_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Scoring Configuration
-- Weights for each category and global settings
CREATE TABLE IF NOT EXISTS bluesky_feed.scoring_config (
  id SERIAL PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value NUMERIC(4,3) NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scoring weights
INSERT INTO bluesky_feed.scoring_config (config_key, config_value, description) VALUES
  ('weight_keywords', 0.400, 'Weight for keyword matches (40%)'),
  ('weight_hashtags', 0.300, 'Weight for hashtag matches (30%)'),
  ('weight_author_trust', 0.200, 'Weight for author trust score (20%)'),
  ('weight_engagement', 0.100, 'Weight for engagement signals - tie breaker (10%)'),
  ('minimum_threshold', 0.250, 'Minimum score to include post (25%)'),
  ('new_author_default', 0.500, 'Default trust score for new authors'),
  ('trust_decay_rate', 0.010, 'Daily decay rate for inactive authors'),
  ('trust_boost_quality', 0.050, 'Trust boost per quality post'),
  ('trust_penalty_spam', 0.100, 'Trust penalty for spam/low quality')
ON CONFLICT (config_key) DO NOTHING;

-- Insert seed keywords (US Government Budget focus)
INSERT INTO bluesky_feed.relevance_keywords (keyword, weight, category) VALUES
  -- Budget & Finance
  ('budget', 1.0, 'budget'),
  ('appropriations', 1.0, 'budget'),
  ('spending', 0.9, 'budget'),
  ('deficit', 0.9, 'budget'),
  ('fiscal', 0.9, 'budget'),
  ('debt ceiling', 1.0, 'budget'),
  ('omnibus', 1.0, 'budget'),
  ('continuing resolution', 1.0, 'budget'),
  ('CR', 0.7, 'budget'),
  ('sequester', 0.9, 'budget'),
  
  -- Congress & Voting
  ('congress', 0.8, 'congress'),
  ('senate', 0.8, 'congress'),
  ('house', 0.7, 'congress'),
  ('vote', 0.8, 'vote'),
  ('voting', 0.8, 'vote'),
  ('bill', 0.7, 'congress'),
  ('legislation', 0.8, 'congress'),
  ('amendment', 0.7, 'congress'),
  ('filibuster', 0.9, 'congress'),
  ('cloture', 0.9, 'congress'),
  
  -- Government & Policy
  ('federal', 0.6, 'government'),
  ('government', 0.6, 'government'),
  ('policy', 0.6, 'government'),
  ('bipartisan', 0.8, 'government'),
  ('partisan', 0.7, 'government'),
  ('shutdown', 1.0, 'government'),
  
  -- Agencies
  ('OMB', 0.9, 'agencies'),
  ('CBO', 0.9, 'agencies'),
  ('GAO', 0.9, 'agencies'),
  ('treasury', 0.8, 'agencies')
ON CONFLICT (keyword) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_relevance_keywords_active 
  ON bluesky_feed.relevance_keywords(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_relevance_keywords_category 
  ON bluesky_feed.relevance_keywords(category);

CREATE INDEX IF NOT EXISTS idx_author_trust_did 
  ON bluesky_feed.author_trust(author_did);

CREATE INDEX IF NOT EXISTS idx_author_trust_score 
  ON bluesky_feed.author_trust(trust_score DESC);

-- Function to calculate relevance score
CREATE OR REPLACE FUNCTION bluesky_feed.calculate_relevance(
  p_text TEXT,
  p_hashtags TEXT[],
  p_author_did TEXT,
  p_has_images BOOLEAN,
  p_has_video BOOLEAN,
  p_has_links BOOLEAN
)
RETURNS NUMERIC(4,3)
LANGUAGE plpgsql
AS $$
DECLARE
  v_keyword_score NUMERIC(4,3) := 0;
  v_hashtag_score NUMERIC(4,3) := 0;
  v_author_score NUMERIC(4,3) := 0.5;
  v_engagement_score NUMERIC(4,3) := 0;
  v_final_score NUMERIC(4,3);
  v_weight_keywords NUMERIC(4,3);
  v_weight_hashtags NUMERIC(4,3);
  v_weight_author NUMERIC(4,3);
  v_weight_engagement NUMERIC(4,3);
  v_text_lower TEXT;
  v_keyword_matches INTEGER := 0;
  v_keyword_weight_sum NUMERIC := 0;
  v_keyword_rec RECORD;
  v_hashtag_match_count INTEGER := 0;
BEGIN
  v_text_lower := LOWER(p_text);
  
  -- Get weights from config
  SELECT config_value INTO v_weight_keywords FROM bluesky_feed.scoring_config WHERE config_key = 'weight_keywords';
  SELECT config_value INTO v_weight_hashtags FROM bluesky_feed.scoring_config WHERE config_key = 'weight_hashtags';
  SELECT config_value INTO v_weight_author FROM bluesky_feed.scoring_config WHERE config_key = 'weight_author_trust';
  SELECT config_value INTO v_weight_engagement FROM bluesky_feed.scoring_config WHERE config_key = 'weight_engagement';
  
  -- Default weights if not configured
  v_weight_keywords := COALESCE(v_weight_keywords, 0.4);
  v_weight_hashtags := COALESCE(v_weight_hashtags, 0.3);
  v_weight_author := COALESCE(v_weight_author, 0.2);
  v_weight_engagement := COALESCE(v_weight_engagement, 0.1);
  
  -- Category 1: Keyword Matching
  FOR v_keyword_rec IN 
    SELECT keyword, weight FROM bluesky_feed.relevance_keywords WHERE is_active = true
  LOOP
    IF v_text_lower LIKE '%' || LOWER(v_keyword_rec.keyword) || '%' THEN
      v_keyword_matches := v_keyword_matches + 1;
      v_keyword_weight_sum := v_keyword_weight_sum + v_keyword_rec.weight;
    END IF;
  END LOOP;
  
  IF v_keyword_matches > 0 THEN
    -- Normalize: cap at 1.0, with diminishing returns after 3 matches
    v_keyword_score := LEAST(1.0, (v_keyword_weight_sum / GREATEST(v_keyword_matches, 1)) * (1 - EXP(-v_keyword_matches * 0.5)));
  END IF;
  
  -- Category 2: Hashtag Matching (against tracked hashtags)
  IF p_hashtags IS NOT NULL AND array_length(p_hashtags, 1) > 0 THEN
    SELECT COUNT(*) INTO v_hashtag_match_count
    FROM bluesky_feed.hashtag_stats hs
    WHERE hs.hashtag = ANY(p_hashtags);
    
    -- Score based on matching tracked hashtags
    v_hashtag_score := LEAST(1.0, v_hashtag_match_count * 0.25);
  END IF;
  
  -- Category 3: Author Trust
  SELECT trust_score INTO v_author_score
  FROM bluesky_feed.author_trust
  WHERE author_did = p_author_did;
  
  v_author_score := COALESCE(v_author_score, 0.5);
  
  -- Category 4: Engagement Signals (tie-breaker)
  IF p_has_images THEN v_engagement_score := v_engagement_score + 0.3; END IF;
  IF p_has_video THEN v_engagement_score := v_engagement_score + 0.3; END IF;
  IF p_has_links THEN v_engagement_score := v_engagement_score + 0.2; END IF;
  IF LENGTH(p_text) > 100 THEN v_engagement_score := v_engagement_score + 0.2; END IF;
  v_engagement_score := LEAST(1.0, v_engagement_score);
  
  -- Calculate weighted final score
  v_final_score := (v_keyword_score * v_weight_keywords) +
                   (v_hashtag_score * v_weight_hashtags) +
                   (v_author_score * v_weight_author) +
                   (v_engagement_score * v_weight_engagement);
  
  RETURN LEAST(1.0, v_final_score);
END;
$$;

-- Function to update author trust after a post
CREATE OR REPLACE FUNCTION bluesky_feed.update_author_trust(
  p_author_did TEXT,
  p_author_handle TEXT,
  p_relevance_score NUMERIC(4,3)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_threshold NUMERIC(4,3);
  v_boost NUMERIC(4,3);
BEGIN
  SELECT config_value INTO v_threshold FROM bluesky_feed.scoring_config WHERE config_key = 'minimum_threshold';
  SELECT config_value INTO v_boost FROM bluesky_feed.scoring_config WHERE config_key = 'trust_boost_quality';
  
  v_threshold := COALESCE(v_threshold, 0.25);
  v_boost := COALESCE(v_boost, 0.05);
  
  INSERT INTO bluesky_feed.author_trust (author_did, author_handle, total_posts, quality_posts, trust_score, last_post_at)
  VALUES (p_author_did, p_author_handle, 1, 
          CASE WHEN p_relevance_score >= v_threshold THEN 1 ELSE 0 END,
          CASE WHEN p_relevance_score >= v_threshold THEN 0.5 + v_boost ELSE 0.5 END,
          NOW())
  ON CONFLICT (author_did) DO UPDATE SET
    author_handle = COALESCE(EXCLUDED.author_handle, bluesky_feed.author_trust.author_handle),
    total_posts = bluesky_feed.author_trust.total_posts + 1,
    quality_posts = bluesky_feed.author_trust.quality_posts + 
                    CASE WHEN p_relevance_score >= v_threshold THEN 1 ELSE 0 END,
    trust_score = LEAST(1.0, GREATEST(0.0,
                    bluesky_feed.author_trust.trust_score + 
                    CASE WHEN p_relevance_score >= v_threshold THEN v_boost ELSE -0.01 END
                  )),
    last_post_at = NOW(),
    updated_at = NOW();
END;
$$;
