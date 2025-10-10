import { NextResponse } from "next/server"
import { FirehoseConnection } from "@/lib/firehose"
import { PostIndexer } from "@/lib/post-indexer"
import { FeedAlgorithm } from "@/lib/feed-algorithm"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes max (Vercel Pro limit)

let firehose: FirehoseConnection | null = null
let indexer: PostIndexer | null = null

export async function POST(request: Request) {
  try {
    // Check admin password
    const { password } = await request.json()
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (firehose) {
      return NextResponse.json({
        message: "Firehose already running",
        stats: indexer?.getStats(),
      })
    }

    console.log("[v0] Initializing feed algorithm and indexer...")

    // Initialize algorithm and indexer
    const algorithm = new FeedAlgorithm({
      allowedLanguages: ["en"],
      minRelevanceScore: 0,
    })

    indexer = new PostIndexer(algorithm)
    firehose = new FirehoseConnection()

    console.log("[v0] Starting firehose connection...")

    // Start firehose
    await firehose.start(async (post) => {
      console.log("[v0] Processing post:", post.uri)
      if (indexer) {
        await indexer.indexPost(post)
      }
    })

    console.log("[v0] Firehose started, waiting for posts...")

    return NextResponse.json({
      message: "Firehose started successfully",
      stats: indexer.getStats(),
    })
  } catch (error) {
    console.error("[v0] Error starting firehose:", error)
    firehose = null
    indexer = null
    return NextResponse.json(
      { error: "Failed to start firehose", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
