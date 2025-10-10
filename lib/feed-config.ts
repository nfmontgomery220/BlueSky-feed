/**
 * Feed configuration and metadata
 * Customize these values to match your feed's purpose
 */

export const FEED_CONFIG = {
  // Feed identifier (used in the feed URI)
  feedName: "voting-public",

  // Display name shown to users
  displayName: "Voting & Civic Engagement",

  // Description shown in feed discovery
  description:
    "A curated feed for voting, elections, democracy, and civic engagement content. Tracks posts with hashtags like #voting, #election, #democracy, and related keywords.",

  // Hashtags to track (without the # symbol)
  hashtags: [
    "voting",
    "vote",
    "election",
    "elections",
    "democracy",
    "civic",
    "civicengagement",
    "politics",
    "voter",
    "ballot",
    "campaign",
  ],

  // Keywords to search for in post text
  keywords: [
    "voting",
    "vote",
    "election",
    "ballot",
    "democracy",
    "civic engagement",
    "voter registration",
    "polling place",
    "campaign",
    "candidate",
    "referendum",
  ],

  // Language filtering
  allowedLanguages: ["en"],

  // Minimum post length
  minPostLength: 10,
}
