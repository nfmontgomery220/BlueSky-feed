import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Instructions for publishing the feed
    const publishInstructions = {
      message: "Feed generator is ready to publish",
      steps: [
        {
          step: 1,
          description: "Ensure your feed generator is running at the configured hostname",
          hostname: process.env.FEEDGEN_HOSTNAME,
        },
        {
          step: 2,
          description: "Verify the DID document is accessible",
          url: `https://${process.env.FEEDGEN_HOSTNAME}/.well-known/did.json`,
        },
        {
          step: 3,
          description: "Use the Bluesky API to publish your feed generator",
          endpoint: "com.atproto.repo.putRecord",
          record: {
            repo: process.env.BLUESKY_DID,
            collection: "app.bsky.feed.generator",
            rkey: "voting-public",
            record: {
              did: process.env.FEEDGEN_SERVICE_DID,
              displayName: "Voting Public Feed",
              description: "A curated feed for voting and civic engagement content",
              createdAt: new Date().toISOString(),
            },
          },
        },
      ],
      endpoints: {
        did: `https://${process.env.FEEDGEN_HOSTNAME}/.well-known/did.json`,
        describeFeedGenerator: `https://${process.env.FEEDGEN_HOSTNAME}/xrpc/app.bsky.feed.describeFeedGenerator`,
        getFeedSkeleton: `https://${process.env.FEEDGEN_HOSTNAME}/xrpc/app.bsky.feed.getFeedSkeleton`,
      },
    }

    return NextResponse.json(publishInstructions)
  } catch (error) {
    console.error("[v0] Error generating publish instructions:", error)
    return NextResponse.json({ error: "Failed to generate publish instructions" }, { status: 500 })
  }
}
