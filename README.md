# Bluesky Civics Feed Generator

A production-ready Bluesky feed generator for civic engagement content, featuring AI-powered content analysis, automated filtering, and manual review capabilities.

## Overview

This feed generator collects posts from Bluesky related to voting, elections, and civic engagement, then uses AI to analyze and filter them for quality and relevance. It provides a two-stage filtering system with automated quality control and manual review capabilities.

## Key Features

- **Automated Collection**: Vercel Cron Jobs collect posts every minute from Bluesky's firehose
- **AI Content Analysis**: Automatic topic classification, sentiment analysis, and quality scoring
- **Two-Stage Filtering**: Broad hashtag collection → AI analysis → quality filtering
- **Manual Review Queue**: Review borderline posts before they appear in the feed
- **Real-time Dashboard**: Monitor stats, manage database, and review posts
- **Database Management**: Built-in tools to manage storage and clean up old data
- **AT Protocol Integration**: Full Bluesky feed generator protocol support

## System Architecture

\`\`\`
Bluesky Firehose → Collection (hashtags) → AI Analysis → Filtering → Review Queue → Public Feed
                         ↓                      ↓            ↓            ↓
                    Database (pending)    Add codes    Auto-approve  Manual review
                                                       Auto-reject
\`\`\`

### Data Flow

1. **Collection** (`/api/cron/collect-posts`): Cron job runs every minute
   - Connects to Bluesky firehose for 50 seconds
   - Filters by civics-related hashtags/keywords
   - Stores posts with status: `pending_analysis`

2. **AI Analysis** (`/api/posts/analyze`): Analyzes collected posts
   - Topic classification (voter registration, election integrity, etc.)
   - Sentiment analysis (-1 to +1 scale)
   - Quality scoring (0 to 1, spam/misinformation detection)
   - Actionability detection (call-to-action vs informational)

3. **Automated Filtering**: Based on analysis results
   - Quality > 0.6 → Auto-approve (status: `approved`)
   - Quality < 0.3 → Auto-reject (status: `rejected`)
   - Quality 0.3-0.6 → Manual review (status: `needs_review`)

4. **Manual Review** (`/api/posts/review`): Admin reviews borderline posts
   - Approve or reject with notes
   - Corrections improve future AI accuracy

5. **Public Feed** (`/xrpc/app.bsky.feed.getFeedSkeleton`): Serves approved posts
   - Only `approved` posts appear in the public feed
   - Sorted by relevance and recency

## Quick Start

### 1. Deploy to Vercel

\`\`\`bash
# Push to GitHub
git push origin main

# Connect to Vercel and deploy
\`\`\`

### 2. Add Integrations

- **Neon Database**: Add from Vercel integrations
- **Vercel AI Gateway**: Automatically configured

### 3. Set Environment Variables

\`\`\`env
# Database (from Neon integration)
DATABASE_URL=postgresql://...

# Feed Configuration
FEEDGEN_HOSTNAME=feed.votingpublic.org
FEEDGEN_SERVICE_DID=did:web:feed.votingpublic.org
BLUESKY_DID=your-bluesky-did

# Security
ADMIN_PASSWORD=your-secure-password
CRON_SECRET=auto-generated-by-vercel
\`\`\`

### 4. Run Database Migrations

Execute in order:
1. `scripts/run-003-migration.mjs` - Historical stats table
2. `scripts/run-004-migration.mjs` - AI analysis fields

### 5. Access Admin Dashboard

Visit your deployment URL and log in with `ADMIN_PASSWORD`.

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and technical details
- **[DATABASE.md](./DATABASE.md)** - Complete database schema documentation
- **[API.md](./API.md)** - API endpoints reference
- **[AI_ANALYSIS.md](./AI_ANALYSIS.md)** - How AI analysis and filtering works
- **[MAINTENANCE.md](./MAINTENANCE.md)** - Database management and ongoing tasks
- **[FEED_CONFIGURATION.md](./FEED_CONFIGURATION.md)** - Customizing hashtags and keywords

## Admin Dashboard Features

### Stats Overview
- Total posts received, indexed, filtered
- Posts with images/video
- Real-time collection status

### Historical Charts
- Posts per hour over last 24 hours
- Filter rate trends
- Index rate visualization

### Database Management
- View storage metrics (total posts, oldest/newest)
- Clean up old posts (configurable retention period)
- Delete historical stats
- Optimize database

### Review Queue
- Review posts flagged for manual review
- Approve or reject with notes
- View AI analysis results
- Correct AI suggestions

## Cost Considerations

### AI Analysis Costs
- Model: GPT-4o-mini via Vercel AI Gateway
- Cost: ~$0.001-0.003 per post analyzed
- Volume: If collecting 100 posts/minute = $4-12/day

### Database Storage
- ~500-2000 bytes per post
- 100 posts/minute = ~144,000 posts/day = 70-300 MB/day
- Use database management tools to control growth

### Vercel Hosting
- Cron jobs: Included in Pro plan
- Serverless functions: Generous free tier
- Bandwidth: Depends on feed usage

## Troubleshooting

**Cron not collecting posts?**
- Check Vercel deployment logs
- Verify `CRON_SECRET` is set
- Ensure database connection is working

**AI analysis not running?**
- Check Vercel AI Gateway is configured
- Verify posts have `pending_analysis` status
- Check API logs for errors

**Posts not appearing in feed?**
- Check post status (must be `approved`)
- Run AI analysis on pending posts
- Review and approve posts in review queue

**Database filling up too fast?**
- Use database management tools to clean up old posts
- Adjust retention period (default: 30 days)
- Consider more aggressive quality filtering

## Development

\`\`\`bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
\`\`\`

## License

MIT
