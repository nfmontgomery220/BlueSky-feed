import { type NextRequest, NextResponse } from "next/server"
import { postStore } from "@/lib/post-store"
import { filterPost } from "@/lib/feed-filter"
import type { BlueskyPost } from "@/lib/types"

// Simulated posts for testing
const SAMPLE_POSTS = [
  {
    text: "New Medicare policy changes will impact millions of seniors. Here's what you need to know about the fiscal implications.",
    hasImage: true,
  },
  {
    text: "SNAP benefits update: Congress passes new legislation to expand food assistance programs.",
    hasImage: false,
  },
  {
    text: "Vaccination rates in rural communities show promising increase. Public health officials celebrate milestone.",
    hasImage: true,
  },
  {
    text: "Voter registration deadline approaching! Make sure you're registered for the upcoming election.",
    hasImage: true,
  },
  {
    text: "Check out this amazing deal on Amazon! 50% off today only.",
    hasImage: false,
  },
]

export async function POST(request: NextRequest) {
  const { count = 1 } = await request.json()

  let added = 0
  let filtered = 0

  for (let i = 0; i < count; i++) {
    const sample = SAMPLE_POSTS[Math.floor(Math.random() * SAMPLE_POSTS.length)]

    const post: BlueskyPost = {
      uri: `at://did:plc:${Math.random().toString(36).substring(7)}/app.bsky.feed.post/${Date.now()}`,
      cid: `cid${Math.random().toString(36).substring(7)}`,
      author: {
        did: `did:plc:${Math.random().toString(36).substring(7)}`,
        handle: `user${Math.floor(Math.random() * 1000)}.bsky.social`,
      },
      record: {
        text: sample.text,
        createdAt: new Date().toISOString(),
        embed: sample.hasImage
          ? {
              $type: "app.bsky.embed.images",
              images: [{ alt: "Policy image", image: {} }],
            }
          : undefined,
      },
      indexedAt: new Date().toISOString(),
      score: 0,
    }

    const result = filterPost(post)

    if (result.passed) {
      post.score = result.score
      postStore.addPost(post)
      added++

      if (sample.hasImage) {
        const stats = postStore.getStats()
        postStore.updateStats({ postsWithMedia: stats.postsWithMedia + 1 })
      }
    } else {
      filtered++
      const stats = postStore.getStats()
      postStore.updateStats({
        postsExcluded: stats.postsExcluded + 1,
        totalFiltered: stats.totalFiltered + 1,
      })
    }
  }

  return NextResponse.json({ added, filtered })
}
