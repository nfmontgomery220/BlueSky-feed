import { NextResponse } from "next/server"
import { FEED_CONFIG } from "@/lib/feed-config"

export async function GET() {
  return NextResponse.json({
    did: FEED_CONFIG.serviceDid,
    feeds: [
      {
        uri: `at://${FEED_CONFIG.serviceDid}/app.bsky.feed.generator/${FEED_CONFIG.feed.recordName}`,
        ...FEED_CONFIG.feed,
      },
    ],
  })
}
