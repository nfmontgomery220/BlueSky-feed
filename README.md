# Bluesky Feed Generator

A production-ready Bluesky feed generator built with Next.js, featuring automated post collection via Vercel Cron Jobs and real-time monitoring dashboard.

## Features

- **Automated Post Collection**: Vercel Cron Jobs collect posts every minute from Bluesky's firehose
- **Real-time Monitoring**: Admin dashboard with live stats and historical charts
- **Configurable Feed Algorithm**: Customize which posts to index based on content, language, media, etc.
- **AT Protocol Integration**: Full support for Bluesky's feed generator protocol
- **Database Storage**: Efficient post storage and retrieval using Neon PostgreSQL

## Architecture

This feed generator uses a **cron-based architecture** optimized for Vercel's serverless platform:

- **Cron Job** (`/api/cron/collect-posts`): Runs every minute, collects posts for 50 seconds, then exits
- **Historical Tracking**: Saves stats snapshots every minute for time-series charts
- **Feed API**: Serves posts via AT Protocol endpoints for Bluesky integration

## Environment Variables

Required environment variables (automatically configured via integrations):

\`\`\`env
# Database (Neon Integration)
DATABASE_URL=postgresql://...

# Bluesky Feed Configuration
FEEDGEN_HOSTNAME=feed.votingpublic.org
FEEDGEN_SERVICE_DID=did:web:feed.votingpublic.org
BLUESKY_DID=your-bluesky-did

# Admin Access
ADMIN_PASSWORD=your-secure-password
NEXT_PUBLIC_ADMIN_PASSWORD=your-secure-password

# Cron Security (Vercel automatically provides this)
CRON_SECRET=your-cron-secret
\`\`\`

## Setup

1. **Deploy to Vercel**: Push to GitHub and connect to Vercel
2. **Add Neon Integration**: Connect Neon database from Vercel dashboard
3. **Run Migrations**: Execute the SQL scripts in order:
   - `scripts/run-003-migration.mjs` (creates historical_stats table)
4. **Set Environment Variables**: Add ADMIN_PASSWORD and other required vars
5. **Deploy**: Vercel will automatically set up the cron job

## Cron Job Configuration

The cron job is configured in `vercel.json`:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/collect-posts",
      "schedule": "* * * * *"
    }
  ]
}
\`\`\`

Schedule format: `* * * * *` (every minute)

## Feed Algorithm

Customize the feed algorithm in `lib/feed-algorithm.ts`:

\`\`\`typescript
export function shouldIndexPost(post: any): boolean {
  // Add your custom logic here
  // Examples:
  // - Filter by language
  // - Require images/video
  // - Check for specific keywords
  // - Filter by author
  
  return true // Index all posts by default
}
\`\`\`

## Admin Dashboard

Access the admin dashboard at your deployment URL (e.g., `https://feed.votingpublic.org`):

- **Login**: Enter admin password
- **Monitor Stats**: View real-time post counts and metrics
- **View Charts**: Historical data over last 24 hours
- **System Status**: See when last cron job ran

## AT Protocol Endpoints

The feed generator exposes these endpoints for Bluesky:

- `/.well-known/did.json` - DID document
- `/xrpc/app.bsky.feed.describeFeedGenerator` - Feed metadata
- `/xrpc/app.bsky.feed.getFeedSkeleton` - Feed posts

## Database Schema

### Tables

**bluesky_feed.posts**
- Stores indexed posts with metadata
- Includes text, author, timestamps, media flags

**bluesky_feed.feed_stats**
- Current cumulative statistics
- Updated every minute by cron job

**bluesky_feed.historical_stats**
- Time-series data for charts
- One row per minute

## Development

\`\`\`bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
\`\`\`

## Troubleshooting

**Cron job not running?**
- Check Vercel deployment logs
- Verify CRON_SECRET is set (Vercel sets this automatically)
- Ensure vercel.json is in the root directory

**No posts appearing?**
- Wait 1-2 minutes for first cron run
- Check `/api/cron/collect-posts` logs in Vercel
- Verify DATABASE_URL is correct

**Charts not showing data?**
- Ensure historical_stats table exists (run migration)
- Wait for multiple cron runs to accumulate data points
- Check browser console for API errors

## License

MIT
