import { type NextRequest, NextResponse } from "next/server"
import { postStore } from "@/lib/post-store"
import { FEED_CONFIG } from "@/lib/feed-config"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), FEED_CONFIG.maxFeedLength)

  const posts = postStore.getPosts(limit)

  return NextResponse.json({
    feed: posts.map((post) => ({
      post: post.uri,
    })),
  })
}
