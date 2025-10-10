# Feed Configuration Guide

## Current Feed Settings

**Feed Name:** `voting-public`  
**Display Name:** Voting & Civic Engagement  
**Feed URI:** `at://{your-did}/app.bsky.feed.generator/voting-public`

## Tracked Hashtags

The feed currently tracks these hashtags:
- #voting
- #vote
- #election / #elections
- #democracy
- #civic / #civicengagement
- #politics
- #voter
- #ballot
- #campaign

## Tracked Keywords

Posts containing these keywords will be included:
- voting
- vote
- election
- ballot
- democracy
- civic engagement
- voter registration
- polling place
- campaign
- candidate
- referendum

## Customizing Your Feed

### Adding New Hashtags

Edit `lib/feed-algorithm.ts` and add to the `VOTING_HASHTAGS` array:

\`\`\`typescript
const VOTING_HASHTAGS = [
  "voting",
  "yourtag", // Add your hashtag here (without #)
]
\`\`\`

### Adding New Keywords

Edit `lib/feed-algorithm.ts` and add to the `VOTING_KEYWORDS` array:

\`\`\`typescript
const VOTING_KEYWORDS = [
  "voting",
  "your keyword phrase", // Add your keyword here
]
\`\`\`

### Changing Feed Name/Description

Edit `app/xrpc/app.bsky.feed.describeFeedGenerator/route.ts`:

\`\`\`typescript
{
  uri: `at://${process.env.FEEDGEN_SERVICE_DID}/app.bsky.feed.generator/your-feed-name`,
  displayName: "Your Feed Display Name",
  description: "Your feed description here",
}
\`\`\`

### Language Filtering

Currently set to English only. To add more languages, edit `lib/feed-algorithm.ts`:

\`\`\`typescript
if (!post.langs.includes("en") && !post.langs.includes("es")) {
  return false
}
\`\`\`

## Publishing Your Feed

Once deployed, your feed will be available at:
\`\`\`
at://{FEEDGEN_SERVICE_DID}/app.bsky.feed.generator/voting-public
\`\`\`

Users can subscribe to it by searching for "Voting & Civic Engagement" in Bluesky or using the direct feed URI.
