import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

// Civic keywords for filtering (maintaining ~1.5% index rate)
const CIVIC_KEYWORDS = [
  // Government & Politics
  "vote",
  "voting",
  "election",
  "ballot",
  "poll",
  "campaign",
  "candidate",
  "democrat",
  "republican",
  "congress",
  "senate",
  "house",
  "legislation",
  "bill",
  "law",
  "policy",
  "politics",
  "political",
  "government",
  "civic",

  // Budget & Finance
  "budget",
  "budgetbuilder",
  "fiscal",
  "spending",
  "taxes",
  "revenue",
  "deficit",
  "appropriation",
  "funding",
  "treasury",

  // Voting & Democracy
  "votingpublic",
  "democracy",
  "voter",
  "suffrage",
  "referendum",
  "initiative",
  "recall",
  "primary",
  "caucus",
  "midterm",

  // Civic Engagement
  "activism",
  "advocacy",
  "grassroots",
  "organize",
  "protest",
  "petition",
  "town hall",
  "public comment",
  "constituent",
]

interface BlueskyPost {
  uri: string
  cid: string
  author: {
    did: string
    handle: string
  }
  record: {
    text: string
    createdAt: string
    langs?: string[]
    embed?: any
    facets?: any[]
    labels?: any
  }
}

async function createSession() {
  const identifier = process.env.BLUESKY_IDENTIFIER || process.env.Bluesky_Identifier
  const password = process.env.BLUESKY_PASSWORD || process.env.Bluesky_Password

  if (!identifier || !password) {
    console.error("[v0] Missing Bluesky credentials (BLUESKY_IDENTIFIER, BLUESKY_PASSWORD or mixed case)")
    return null
  }

  try {
    const response = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    })

    if (!response.ok) {
      console.error(`[v0] Bluesky auth failed: ${response.status} - ${await response.text()}`)
      return null
    }

    const data = await response.json()
    return data.accessJwt
  } catch (error) {
    console.error("[v0] Bluesky auth error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  console.log("[v0] Firehose cron started")

  const connectionString = process.env.bfc_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error("[v0] Missing DATABASE_URL")
    return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 })
  }
  const sql = neon(connectionString)

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[v0] Unauthorized attempt - Invalid or missing token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.log("[v0] Authentication successful")

    const accessJwt = await createSession()
    if (!accessJwt) {
      console.log("[v0] Proceeding without auth (public API limits apply)")
    } else {
      console.log("[v0] Bluesky authenticated successfully")
    }

    console.log("[v0] Firehose: Starting fetch cycle")

    // Using searchPosts with civic keywords to get relevant content
    const searchQueries = ["vote OR election OR politics", "budget OR fiscal", "democracy OR civic"]

    let postsReceived = 0
    let postsIndexed = 0
    let postsFiltered = 0

    console.log(`[v0] Running ${searchQueries.length} search queries`)

    for (const query of searchQueries) {
      try {
        const searchUrl = `https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=100`
        console.log(`[v0] Fetching from Bluesky: ${searchUrl}`)

        const headers: Record<string, string> = {
          Accept: "application/json",
        }
        if (accessJwt) {
          headers["Authorization"] = `Bearer ${accessJwt}`
        }

        const response = await fetch(searchUrl, {
          headers,
          signal: AbortSignal.timeout(15000),
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => "No error body")
          console.error(`[v0] Bluesky API error for query "${query}": ${response.status} - ${errorText}`)
          continue
        }

        const data = await response.json()
        const posts = data.posts || []
        console.log(`[v0] Query "${query}" returned ${posts.length} posts`)

        for (const post of posts) {
          postsReceived++

          // Filter for civic content
          const text = post.record.text.toLowerCase()
          const isCivic = CIVIC_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))

          if (!isCivic) {
            postsFiltered++
            continue
          }

          // Extract post data
          const hasImages = post.record.embed?.$type === "app.bsky.embed.images" || post.embed?.images
          const hasVideo =
            post.record.embed?.$type === "app.bsky.embed.video" || post.embed?.media?.$type?.includes("video")
          const hasExternalLink = post.record.embed?.$type === "app.bsky.embed.external" || post.embed?.external

          let externalDomain = null
          if (hasExternalLink) {
            const externalUri = post.record.embed?.external?.uri || post.embed?.external?.uri
            if (externalUri) {
              try {
                externalDomain = new URL(externalUri).hostname
              } catch (e) {
                // Invalid URL, skip
              }
            }
          }

          // Calculate relevance score
          const relevanceScore = Math.min(text.length / 280, 1.0)

          const hashtagMatches = post.record.text.match(/#(\w+)/g) || []
          const hashtags = hashtagMatches.map((tag: string) => tag.substring(1).toLowerCase())

          // Insert into database
          try {
            await sql`
              INSERT INTO bluesky_feed.posts (
                uri, cid, author_did, author_handle, text, created_at, indexed_at,
                has_images, has_video, has_external_link, external_domain,
                langs, facets, labels, embed_data, relevance_score, hashtags
              ) VALUES (
                ${post.uri},
                ${post.cid},
                ${post.author.did},
                ${post.author.handle},
                ${post.record.text},
                ${post.record.createdAt},
                NOW(),
                ${hasImages},
                ${hasVideo},
                ${hasExternalLink},
                ${externalDomain},
                ${post.record.langs || []},
                ${post.record.facets ? JSON.stringify(post.record.facets) : null},
                ${post.record.labels ? JSON.stringify(post.record.labels) : null},
                ${post.record.embed ? JSON.stringify(post.record.embed) : null},
                ${relevanceScore},
                ${hashtags}
              )
              ON CONFLICT (uri) DO NOTHING
            `
            postsIndexed++
          } catch (dbError) {
            console.error("[v0] Database insert error:", dbError)
          }
        }
      } catch (queryError) {
        console.error(`[v0] Error processing query "${query}":`, queryError)
      }
    }

    // Update feed statistics
    await sql`
      INSERT INTO bluesky_feed.feed_stats (id, total_posts_received, total_posts_indexed, posts_filtered_out, last_updated)
      VALUES (1, ${postsReceived}, ${postsIndexed}, ${postsFiltered}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        total_posts_received = bluesky_feed.feed_stats.total_posts_received + ${postsReceived},
        total_posts_indexed = bluesky_feed.feed_stats.total_posts_indexed + ${postsIndexed},
        posts_filtered_out = bluesky_feed.feed_stats.posts_filtered_out + ${postsFiltered},
        last_updated = NOW()
    `

    if (postsIndexed > 0) {
      try {
        console.log("[v0] Updating hashtag stats...")
        await sql`SELECT bluesky_feed.update_hashtag_stats()`
      } catch (hashtagError) {
        console.error("[v0] Error updating hashtag stats:", hashtagError)
      }
    }

    console.log(`[v0] Firehose: Processed ${postsReceived} posts, indexed ${postsIndexed}, filtered ${postsFiltered}`)
    console.log("[v0] Firehose run completed successfully")

    return NextResponse.json({
      success: true,
      postsReceived,
      postsIndexed,
      postsFiltered,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Firehose error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
