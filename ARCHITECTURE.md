# System Architecture

## Overview

The Bluesky Civics Feed Generator is a serverless application built on Vercel that collects, analyzes, and serves civics-related content from Bluesky's social network.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Vercel Serverless Functions
- **Database**: Neon PostgreSQL (serverless)
- **AI**: Vercel AI Gateway (GPT-4o-mini)
- **Scheduling**: Vercel Cron Jobs
- **Protocol**: AT Protocol (Bluesky)

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                         Bluesky Network                          │
│                    (Jetstream Firehose)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Collection Layer                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Vercel Cron Job (every minute)                          │   │
│  │  /api/cron/collect-posts                                 │   │
│  │  - Connects to firehose for 50 seconds                   │   │
│  │  - Filters by hashtags/keywords                          │   │
│  │  - Stores posts as "pending_analysis"                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Analysis Layer                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AI Analysis Service                                      │   │
│  │  /api/posts/analyze                                       │   │
│  │  - Topic classification                                   │   │
│  │  - Sentiment analysis                                     │   │
│  │  - Quality scoring                                        │   │
│  │  - Spam/misinformation detection                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Filtering Layer                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Automated Filtering Rules                                │   │
│  │  - Quality > 0.6 → Auto-approve                           │   │
│  │  - Quality < 0.3 → Auto-reject                            │   │
│  │  - Quality 0.3-0.6 → Manual review queue                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Review Layer                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Manual Review Interface                                  │   │
│  │  /api/posts/review                                        │   │
│  │  - Admin reviews borderline posts                         │   │
│  │  - Approve/reject with notes                              │   │
│  │  - Corrections improve AI                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Serving Layer                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AT Protocol Feed Endpoints                               │   │
│  │  /xrpc/app.bsky.feed.getFeedSkeleton                      │   │
│  │  - Serves only "approved" posts                           │   │
│  │  - Sorted by relevance + recency                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Bluesky Users                                 │
│                  (Subscribe to feed)                             │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

## Data Flow

### 1. Collection Phase

**Trigger**: Vercel Cron (every minute)

\`\`\`typescript
// /api/cron/collect-posts/route.ts
1. Authenticate request (CRON_SECRET or ADMIN_PASSWORD)
2. Connect to Jetstream firehose (wss://jetstream2.us-east.bsky.network)
3. Subscribe to "app.bsky.feed.post" events
4. For each post:
   - Check hashtags/keywords (lib/feed-algorithm.ts)
   - If match: INSERT INTO posts (status: pending_analysis)
5. Collect for 50 seconds, then disconnect
6. Update feed_stats and historical_stats
\`\`\`

**Output**: Posts stored in database with `pending_analysis` status

### 2. Analysis Phase

**Trigger**: Manual or automated (after collection)

\`\`\`typescript
// /api/posts/analyze/route.ts
1. Fetch posts WHERE status = 'pending_analysis'
2. For each post:
   - Call AI model (lib/ai-analyzer.ts)
   - Extract: topic, sentiment, quality_score, themes
3. UPDATE posts SET:
   - topic, sentiment_score, sentiment_label
   - quality_score, themes, is_actionable
   - time_sensitivity, analyzed_at
4. Apply filtering rules:
   - quality_score > 0.6 → status = 'approved'
   - quality_score < 0.3 → status = 'rejected'
   - else → status = 'needs_review'
\`\`\`

**Output**: Posts with analysis data and updated status

### 3. Review Phase

**Trigger**: Admin action (manual)

\`\`\`typescript
// /api/posts/review/route.ts
1. Admin views posts WHERE status = 'needs_review'
2. Reviews AI analysis and post content
3. Decision:
   - Approve: UPDATE status = 'approved'
   - Reject: UPDATE status = 'rejected'
4. Add review_notes for future reference
\`\`\`

**Output**: Posts moved to approved or rejected

### 4. Serving Phase

**Trigger**: Bluesky user requests feed

\`\`\`typescript
// /xrpc/app.bsky.feed.getFeedSkeleton/route.ts
1. Receive request from Bluesky
2. Query: SELECT * FROM posts WHERE status = 'approved'
3. Sort by: relevance_score DESC, indexed_at DESC
4. Return: Array of post URIs
5. Bluesky fetches full post data and displays to user
\`\`\`

**Output**: Feed of approved posts to Bluesky users

## Component Architecture

### Core Libraries

**lib/ai-analyzer.ts**
- AI analysis logic
- Prompt engineering for topic/sentiment/quality
- Structured output parsing

**lib/feed-algorithm.ts**
- Initial hashtag/keyword filtering
- Language filtering
- Content requirements (text length, etc.)

**lib/feed-config.ts**
- Centralized configuration
- Hashtags, keywords, feed metadata
- Easy customization

**lib/db.ts**
- Database connection management
- Lazy-loaded SQL client
- Environment variable handling

### API Routes

**Collection**
- `/api/cron/collect-posts` - Cron job endpoint
- `/api/firehose/stats` - Real-time stats

**Analysis**
- `/api/posts/analyze` - Analyze pending posts
- `/api/posts/review` - Manual review actions

**Management**
- `/api/database/manage` - Database cleanup/stats

**AT Protocol**
- `/.well-known/did.json` - DID document
- `/xrpc/app.bsky.feed.describeFeedGenerator` - Feed metadata
- `/xrpc/app.bsky.feed.getFeedSkeleton` - Feed posts

### UI Components

**components/admin-dashboard.tsx**
- Main dashboard container
- Stats display, charts, tabs

**components/database-management.tsx**
- Storage metrics
- Cleanup controls

**components/stats-card.tsx**
- Individual stat display
- Trend indicators

**components/metric-chart.tsx**
- Time-series charts
- Recharts integration

## Database Schema

See [DATABASE.md](./DATABASE.md) for complete schema documentation.

## Security

### Authentication
- Admin password (server-side only, never exposed to client)
- Cron secret (Vercel-managed)
- No public write access

### Data Privacy
- Only public Bluesky posts are collected
- No user tracking or analytics
- Posts can be deleted via database management

### Rate Limiting
- Cron runs once per minute (Vercel enforced)
- AI analysis batched to control costs
- Database queries optimized with indexes

## Scalability

### Current Limits
- **Collection**: ~3,000 posts/hour (50 posts/minute × 60 minutes)
- **Storage**: Unlimited (Neon scales automatically)
- **AI Analysis**: Rate limited by Vercel AI Gateway quotas
- **Serving**: Vercel serverless scales automatically

### Optimization Strategies
- Database cleanup (delete old posts)
- Batch AI analysis (process multiple posts per request)
- Caching (feed results cached for 1 minute)
- Indexes on frequently queried columns

## Monitoring

### Metrics Tracked
- Posts received/indexed/filtered (real-time)
- Collection rate (posts/minute)
- Filter rate (% filtered out)
- Database size (total posts, storage used)
- AI analysis success rate

### Logging
- All API routes log to Vercel
- Console logs prefixed with `[v0]` for debugging
- Error tracking with detailed stack traces

## Deployment

### Vercel Configuration

**vercel.json**
\`\`\`json
{
  "crons": [{
    "path": "/api/cron/collect-posts",
    "schedule": "* * * * *"
  }]
}
\`\`\`

### Environment Variables
- Managed via Vercel dashboard
- Separate staging/production environments
- Secrets never committed to git

### CI/CD
- Push to GitHub → Auto-deploy to Vercel
- Preview deployments for PRs
- Production deployment on main branch

## Future Enhancements

- **Real-time analysis**: Analyze posts immediately after collection
- **User preferences**: Allow users to customize feed filters
- **Multiple feeds**: Support different topic feeds
- **Advanced analytics**: Trend detection, topic clustering
- **Webhook notifications**: Alert on high-quality posts
- **API for external tools**: Allow third-party integrations
