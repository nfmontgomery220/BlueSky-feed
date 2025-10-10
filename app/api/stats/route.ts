import { NextResponse } from "next/server"
import { postStore } from "@/lib/post-store"

export async function GET() {
  try {
    console.log("[v0] Stats API: Fetching stats from database")
    const stats = await postStore.getStats()
    console.log("[v0] Stats API: Successfully fetched stats:", stats)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Stats API: Error fetching stats:", error)
    console.error("[v0] Stats API: Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Return default stats instead of crashing
    return NextResponse.json(
      {
        totalIndexed: 0,
        totalFiltered: 0,
        postsWithMedia: 0,
        postsExcluded: 0,
        lastUpdated: new Date().toISOString(),
        error: "Failed to fetch stats from database",
      },
      { status: 200 }, // Return 200 to avoid triggering error pages
    )
  }
}
