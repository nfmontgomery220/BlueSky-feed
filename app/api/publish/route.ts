import { type NextRequest, NextResponse } from "next/server"
import { publishFeed, deleteFeed } from "@/lib/bluesky-client"
import { FEED_CONFIG } from "@/lib/feed-config"

export async function POST(request: NextRequest) {
  try {
    const { action, handle, password, serviceDid } = await request.json()

    if (action === "publish") {
      if (!handle || !password || !serviceDid) {
        return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
      }

      const result = await publishFeed({
        handle,
        password,
        serviceDid,
        recordName: FEED_CONFIG.feed.recordName,
        displayName: FEED_CONFIG.feed.displayName,
        description: FEED_CONFIG.feed.description,
        avatar: FEED_CONFIG.feed.avatar,
      })

      return NextResponse.json({
        success: true,
        message: "Feed published successfully!",
        uri: result.uri,
        cid: result.cid,
      })
    }

    if (action === "delete") {
      if (!handle || !password) {
        return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
      }

      await deleteFeed({
        handle,
        password,
        recordName: FEED_CONFIG.feed.recordName,
      })

      return NextResponse.json({
        success: true,
        message: "Feed deleted successfully!",
      })
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error publishing feed:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to publish feed",
      },
      { status: 500 },
    )
  }
}
