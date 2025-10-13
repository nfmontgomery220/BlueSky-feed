import { getDb } from "@/lib/db"
import { Jetstream } from "@skyware/jetstream"
import { shouldIndexPost } from "@/lib/feed-algorithm"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  let sql
  try {
    sql = getDb()
    console.log("[v0] Database connection established")
  } catch (error) {
    console.error("[v0] Database connection error:", error)
    return Response.json({ error: "Database connection failed", details: String(error) }, { status: 500 })
  }

  const authHeader = request.headers.get("authorization")
  console.log("[v0] Auth header received:", authHeader ? "present" : "missing")

  const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const providedPassword = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  const expectedPassword = process.env.ADMIN_PASSWORD
  const isManualTrigger = providedPassword === expectedPassword

  console.log("[v0] Is cron request:", isCronRequest)
  console.log("[v0] Is manual trigger:", isManualTrigger)
  console.log("[v0] Password provided:", providedPassword ? `${providedPassword.substring(0, 3)}...` : "none")
  console.log("[v0] Password expected:", expectedPassword ? `${expectedPassword.substring(0, 3)}...` : "not set")
  console.log("[v0] Passwords match:", providedPassword === expectedPassword)

  if (!isCronRequest && !isManualTrigger) {
    console.log("[v0] Unauthorized request")
    return Response.json(
      {
        error: "Unauthorized",
        hint: !expectedPassword ? "ADMIN_PASSWORD not set" : "Invalid password",
      },
      { status: 401 },
    )
  }

  console.log("[v0] Collection started - collecting posts")

  let postsReceived = 0
  let postsIndexed = 0
  let postsFiltered = 0
  let postsWithImages = 0
  let postsWithVideo = 0

  try {
    const jetstream = new Jetstream({
      wantedCollections: ["app.bsky.feed.post"],
      endpoint: "wss://jetstream2.us-east.bsky.network/subscribe",
    })

    // Collect posts for 50 seconds, then stop
    const collectionTimeout = setTimeout(() => {
      jetstream.close()
    }, 50000)

    await new Promise<void>((resolve, reject) => {
      jetstream.onCreate("app.bsky.feed.post", async (event) => {
        try {
          postsReceived++

          const post = event.commit.record
          const shouldIndex = shouldIndexPost(post)

          // Track media types
          if (post.embed?.images?.length > 0) postsWithImages++
          if (post.embed?.video) postsWithVideo++

          if (shouldIndex) {
            postsIndexed++

            const uri = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`

            // Store in database
            await sql`
              INSERT INTO bluesky_feed.posts (
                uri, cid, author_did, text, created_at, indexed_at,
                has_images, has_video, has_external_link, langs
              ) VALUES (
                ${uri},
                ${event.commit.cid},
                ${event.did},
                ${post.text || ""},
                ${post.createdAt},
                NOW(),
                ${post.embed?.images?.length > 0 || false},
                ${post.embed?.video ? true : false},
                ${post.facets?.some((f: any) => f.features?.some((feat: any) => feat.$type === "app.bsky.richtext.facet#link")) || false},
                ${post.langs || ["en"]}
              )
              ON CONFLICT (uri) DO NOTHING
            `
          } else {
            postsFiltered++
          }
        } catch (error) {
          console.error("[v0] Error processing post:", error)
        }
      })

      jetstream.on("error", (error) => {
        console.error("[v0] Jetstream error:", error)
        clearTimeout(collectionTimeout)
        reject(error)
      })

      jetstream.on("close", () => {
        console.log("[v0] Jetstream closed")
        clearTimeout(collectionTimeout)
        resolve()
      })

      jetstream.start()
    })

    // Update stats in database
    await sql`
      INSERT INTO bluesky_feed.feed_stats (
        id, total_posts_received, total_posts_indexed, posts_with_images,
        posts_with_video, posts_filtered_out, last_updated
      ) VALUES (
        1,
        ${postsReceived},
        ${postsIndexed},
        ${postsWithImages},
        ${postsWithVideo},
        ${postsFiltered},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        total_posts_received = bluesky_feed.feed_stats.total_posts_received + ${postsReceived},
        total_posts_indexed = bluesky_feed.feed_stats.total_posts_indexed + ${postsIndexed},
        posts_with_images = bluesky_feed.feed_stats.posts_with_images + ${postsWithImages},
        posts_with_video = bluesky_feed.feed_stats.posts_with_video + ${postsWithVideo},
        posts_filtered_out = bluesky_feed.feed_stats.posts_filtered_out + ${postsFiltered},
        last_updated = NOW()
    `

    // Save historical snapshot
    await sql`
      INSERT INTO bluesky_feed.historical_stats (
        posts_received, posts_indexed, posts_filtered, timestamp
      ) VALUES (
        ${postsReceived},
        ${postsIndexed},
        ${postsFiltered},
        NOW()
      )
    `

    console.log(
      `[v0] Collection completed: ${postsReceived} received, ${postsIndexed} indexed, ${postsFiltered} filtered`,
    )

    return Response.json({
      success: true,
      postsReceived,
      postsIndexed,
      postsFiltered,
      postsWithImages,
      postsWithVideo,
    })
  } catch (error) {
    console.error("[v0] Collection job error:", error)
    return Response.json({ error: "Failed to collect posts", details: String(error) }, { status: 500 })
  }
}
