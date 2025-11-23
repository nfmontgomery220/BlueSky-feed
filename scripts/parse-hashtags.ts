import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.bfc_DATABASE_URL
if (!databaseUrl) {
  throw new Error("bfc_DATABASE_URL environment variable is not set")
}
const sql = neon(databaseUrl)

async function parseHashtags() {
  console.log("Starting hashtag extraction from existing posts...")

  try {
    // Run the parsing function
    const result = await sql`SELECT * FROM bluesky_feed.parse_hashtags_from_posts()`
    const updatedCount = result[0]?.updated_count || 0

    console.log(`✅ Successfully parsed hashtags from ${updatedCount} posts`)

    // Update hashtag statistics
    await sql`SELECT bluesky_feed.update_hashtag_stats()`
    console.log("✅ Updated hashtag statistics")

    // Show stats for tracked hashtags
    const stats = await sql`
      SELECT * FROM bluesky_feed.hashtag_stats 
      WHERE hashtag IN ('budgetbuilder', 'votingpublic')
      ORDER BY total_posts DESC
    `

    console.log("\n📊 Tracked Hashtag Statistics:")
    for (const stat of stats) {
      console.log(`\n#${stat.hashtag}:`)
      console.log(`  Total posts: ${stat.total_posts}`)
      console.log(`  Last 24h: ${stat.posts_last_24h}`)
      console.log(`  Last 7d: ${stat.posts_last_7d}`)
      console.log(`  Unique authors: ${stat.unique_authors}`)
    }
  } catch (error) {
    console.error("❌ Error parsing hashtags:", error)
    throw error
  }
}

parseHashtags()
