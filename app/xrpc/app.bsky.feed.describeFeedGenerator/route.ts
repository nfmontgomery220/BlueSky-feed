import { NextResponse } from "next/server"

export async function GET() {
  const feeds = [
    {
      uri: `at://${process.env.FEEDGEN_SERVICE_DID}/app.bsky.feed.generator/voting-public`,
      displayName: "Voting Public Feed",
      description: "A curated feed for voting and civic engagement content",
    },
  ]

  return NextResponse.json({
    did: process.env.FEEDGEN_SERVICE_DID,
    feeds,
  })
}
