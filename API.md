# API Documentation

## Overview

All API endpoints are serverless functions deployed on Vercel. Authentication is required for admin endpoints.

## Authentication

### Admin Endpoints

Require `Authorization` header with admin password:

\`\`\`http
Authorization: Bearer YOUR_ADMIN_PASSWORD
\`\`\`

### Cron Endpoints

Require `Authorization` header with cron secret:

\`\`\`http
Authorization: Bearer YOUR_CRON_SECRET
\`\`\`

## Endpoints

### Collection

#### POST /api/cron/collect-posts

Collects posts from Bluesky firehose (cron job).

**Authentication**: Cron secret or admin password

**Request**: No body required

**Response**:
\`\`\`json
{
  "success": true,
  "postsReceived": 150,
  "postsIndexed": 45,
  "postsFiltered": 105,
  "duration": 50000
}
\`\`\`

**Errors**:
- `401`: Unauthorized (invalid credentials)
- `500`: Collection error

---

#### GET /api/firehose/stats

Get current feed statistics.

**Authentication**: None (public)

**Response**:
\`\`\`json
{
  "total_posts_received": "15000",
  "total_posts_indexed": "4500",
  "posts_filtered_out": "10500",
  "posts_with_images": "2000",
  "posts_with_video": "500",
  "last_updated": "2025-01-15T10:30:00Z"
}
\`\`\`

---

#### GET /api/firehose/history

Get historical stats for charts.

**Authentication**: None (public)

**Query Parameters**:
- `hours` (optional): Number of hours to fetch (default: 24)

**Response**:
\`\`\`json
{
  "data": [
    {
      "timestamp": "2025-01-15T10:00:00Z",
      "posts_received": 100,
      "posts_indexed": 30,
      "filter_rate": 70.00
    }
  ]
}
\`\`\`

---

### Analysis

#### POST /api/posts/analyze

Analyze pending posts with AI.

**Authentication**: Admin password

**Request Body**:
\`\`\`json
{
  "limit": 100,
  "batchSize": 10
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "analyzed": 100,
  "approved": 65,
  "rejected": 20,
  "needsReview": 15
}
\`\`\`

**Process**:
1. Fetches posts with `status = 'pending_analysis'`
2. Analyzes each post with AI
3. Updates posts with analysis data
4. Applies filtering rules
5. Returns summary

---

### Review

#### GET /api/posts/review

Get posts needing manual review.

**Authentication**: Admin password

**Query Parameters**:
- `limit` (optional): Number of posts to fetch (default: 50)

**Response**:
\`\`\`json
{
  "posts": [
    {
      "id": 12345,
      "uri": "at://did:plc:.../app.bsky.feed.post/...",
      "text": "Post content...",
      "author_did": "did:plc:...",
      "topic": "voter_registration",
      "sentiment_score": 0.45,
      "sentiment_label": "neutral",
      "quality_score": 0.55,
      "themes": ["accessibility", "deadlines"],
      "is_actionable": true,
      "analyzed_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 15
}
\`\`\`

---

#### POST /api/posts/review

Approve or reject a post.

**Authentication**: Admin password

**Request Body**:
\`\`\`json
{
  "postId": 12345,
  "action": "approve",
  "notes": "High quality, relevant content"
}
\`\`\`

**Parameters**:
- `postId`: Post ID to review
- `action`: "approve" or "reject"
- `notes` (optional): Review notes

**Response**:
\`\`\`json
{
  "success": true,
  "postId": 12345,
  "newStatus": "approved"
}
\`\`\`

---

### Database Management

#### GET /api/database/manage

Get database statistics.

**Authentication**: Admin password

**Response**:
\`\`\`json
{
  "posts": {
    "total": 150000,
    "pending": 1000,
    "needsReview": 50,
    "approved": 100000,
    "rejected": 48950,
    "oldest": "2025-01-01T00:00:00Z",
    "newest": "2025-01-15T10:30:00Z"
  },
  "historicalStats": {
    "total": 10080,
    "oldest": "2025-01-08T10:30:00Z",
    "newest": "2025-01-15T10:30:00Z"
  }
}
\`\`\`

---

#### POST /api/database/manage

Perform database cleanup operations.

**Authentication**: Admin password

**Request Body**:
\`\`\`json
{
  "action": "cleanup_posts",
  "days": 30
}
\`\`\`

**Actions**:
- `cleanup_posts`: Delete posts older than X days
- `cleanup_historical`: Delete historical stats older than X days
- `optimize`: Run VACUUM ANALYZE

**Response**:
\`\`\`json
{
  "success": true,
  "deleted": 50000,
  "message": "Deleted 50000 posts older than 30 days"
}
\`\`\`

---

### AT Protocol Endpoints

#### GET /.well-known/did.json

Returns DID document for feed generator.

**Authentication**: None (public)

**Response**:
\`\`\`json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:feed.votingpublic.org",
  "service": [
    {
      "id": "#bsky_fg",
      "type": "BskyFeedGenerator",
      "serviceEndpoint": "https://feed.votingpublic.org"
    }
  ]
}
\`\`\`

---

#### GET /xrpc/app.bsky.feed.describeFeedGenerator

Returns feed metadata.

**Authentication**: None (public)

**Response**:
\`\`\`json
{
  "did": "did:web:feed.votingpublic.org",
  "feeds": [
    {
      "uri": "at://did:web:feed.votingpublic.org/app.bsky.feed.generator/voting-public",
      "displayName": "Voting & Civic Engagement",
      "description": "Curated feed of voting, elections, and civic engagement content"
    }
  ]
}
\`\`\`

---

#### GET /xrpc/app.bsky.feed.getFeedSkeleton

Returns feed posts (called by Bluesky).

**Authentication**: None (public)

**Query Parameters**:
- `feed`: Feed URI
- `limit` (optional): Number of posts (default: 50, max: 100)
- `cursor` (optional): Pagination cursor

**Response**:
\`\`\`json
{
  "feed": [
    {
      "post": "at://did:plc:.../app.bsky.feed.post/..."
    }
  ],
  "cursor": "12345"
}
\`\`\`

**Notes**:
- Only returns posts with `status = 'approved'`
- Sorted by relevance_score DESC, indexed_at DESC
- Bluesky fetches full post data separately

---

## Error Responses

All endpoints return errors in this format:

\`\`\`json
{
  "error": "Error message",
  "details": "Detailed error information"
}
\`\`\`

**Common Status Codes**:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (missing/invalid credentials)
- `404`: Not found
- `500`: Server error

## Rate Limiting

- **Cron endpoints**: Once per minute (Vercel enforced)
- **Admin endpoints**: No explicit limit (use responsibly)
- **Public endpoints**: Cached for 60 seconds
- **AT Protocol endpoints**: No limit (Bluesky controls request rate)

## Development

### Testing Endpoints Locally

\`\`\`bash
# Start dev server
pnpm dev

# Test with curl
curl http://localhost:3000/api/firehose/stats

# Test with authentication
curl -H "Authorization: Bearer YOUR_PASSWORD" \
  http://localhost:3000/api/posts/analyze
\`\`\`

### Environment Variables

Required for local development:

\`\`\`env
DATABASE_URL=postgresql://...
ADMIN_PASSWORD=test-password
FEEDGEN_SERVICE_DID=did:web:localhost:3000
FEEDGEN_HOSTNAME=localhost:3000
