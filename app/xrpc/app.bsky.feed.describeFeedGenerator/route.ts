import { NextResponse } from "next/server"

export async function GET() {
  const feeds = [
    {
      uri: `at://${process.env.FEEDGEN_SERVICE_DID}/app.bsky.feed.generator/voting-public`,
      displayName: "Voting & Civic Engagement",
      description:
        "A curated feed for voting, elections, democracy, and civic engagement content. Tracks posts with hashtags like #voting, #election, #democracy, and related keywords.",
      avatar: undefined, // Optional: Add an avatar URL here
    },
  ]

  return NextResponse.json({
    did: process.env.FEEDGEN_SERVICE_DID,
    feeds,
  })
}
