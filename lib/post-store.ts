import "server-only"
import type { BlueskyPost, FeedStats } from "./types"
import { sql } from "./db"

class PostStore {
  async addPost(post: BlueskyPost): Promise<void> {
    try {
      await sql`
        INSERT INTO bluesky_posts (
          uri, cid, author_did, author_handle, text, created_at,
          has_images, has_video, has_external_link, external_domain,
          relevance_score, embed_data, facets, labels, langs
        ) VALUES (
          ${post.uri},
          ${post.cid},
          ${post.author.did},
          ${post.author.handle || ""},
          ${post.record.text},
          ${post.record.createdAt},
          ${post.hasImages || false},
          ${post.hasVideo || false},
          ${post.hasExternalLink || false},
          ${post.externalDomain || null},
          ${post.score || 0},
          ${JSON.stringify(post.record.embed || null)},
          ${JSON.stringify(post.record.facets || null)},
          ${JSON.stringify(post.record.labels || null)},
          ${JSON.stringify(post.record.langs || null)}
        )
        ON CONFLICT (uri) DO UPDATE SET
          relevance_score = EXCLUDED.relevance_score,
          indexed_at = NOW()
      `

      await sql`
        UPDATE bluesky_feed_stats
        SET total_posts_indexed = total_posts_indexed + 1,
            posts_with_images = posts_with_images + ${post.hasImages ? 1 : 0},
            posts_with_video = posts_with_video + ${post.hasVideo ? 1 : 0},
            last_updated = NOW()
        WHERE id = 1
      `
    } catch (error) {
      console.error("[v0] Error adding post to database:", error)
      throw error
    }
  }

  async incrementFilteredOut(): Promise<void> {
    try {
      await sql`
        UPDATE bluesky_feed_stats
        SET posts_filtered_out = posts_filtered_out + 1,
            total_posts_received = total_posts_received + 1,
            last_updated = NOW()
        WHERE id = 1
      `
    } catch (error) {
      console.error("[v0] Error incrementing filtered out counter:", error)
    }
  }

  async getPosts(limit = 50): Promise<BlueskyPost[]> {
    try {
      const rows = await sql`
        SELECT 
          uri, cid, author_did, author_handle, text, created_at,
          has_images, has_video, has_external_link, external_domain,
          relevance_score, embed_data, facets, labels, langs
        FROM bluesky_posts
        ORDER BY relevance_score DESC, created_at DESC
        LIMIT ${limit}
      `

      return rows.map((row: any) => ({
        uri: row.uri,
        cid: row.cid,
        author: {
          did: row.author_did,
          handle: row.author_handle,
        },
        record: {
          text: row.text,
          createdAt: row.created_at,
          embed: row.embed_data,
          facets: row.facets,
          labels: row.labels,
          langs: row.langs,
        },
        hasImages: row.has_images,
        hasVideo: row.has_video,
        hasExternalLink: row.has_external_link,
        externalDomain: row.external_domain,
        score: Number.parseFloat(row.relevance_score),
      }))
    } catch (error) {
      console.error("[v0] Error fetching posts from database:", error)
      return []
    }
  }

  async getStats(): Promise<FeedStats> {
    try {
      console.log("[v0] PostStore: Fetching stats from database")

      const result = await sql`
        SELECT 
          total_posts_indexed as "totalIndexed",
          total_posts_received as "totalFiltered",
          posts_with_images as "postsWithMedia",
          posts_filtered_out as "postsExcluded",
          last_updated as "lastUpdated"
        FROM bluesky_feed_stats
        WHERE id = 1
      `

      console.log("[v0] PostStore: Query result:", result)

      if (result.length > 0) {
        const stats = {
          totalIndexed: Number(result[0].totalIndexed) || 0,
          totalFiltered: Number(result[0].totalFiltered) || 0,
          postsWithMedia: Number(result[0].postsWithMedia) || 0,
          postsExcluded: Number(result[0].postsExcluded) || 0,
          lastUpdated: result[0].lastUpdated,
        }
        console.log("[v0] PostStore: Returning stats:", stats)
        return stats
      }

      console.log("[v0] PostStore: No stats found, returning defaults")
    } catch (error) {
      console.error("[v0] PostStore: Error fetching stats from database:", error)
      console.error("[v0] PostStore: Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }

    return {
      totalIndexed: 0,
      totalFiltered: 0,
      postsWithMedia: 0,
      postsExcluded: 0,
      lastUpdated: new Date().toISOString(),
    }
  }

  async clear(): Promise<void> {
    try {
      await sql`DELETE FROM bluesky_posts`
      await sql`
        UPDATE bluesky_feed_stats
        SET total_posts_indexed = 0,
            total_posts_received = 0,
            posts_with_images = 0,
            posts_with_video = 0,
            posts_filtered_out = 0,
            last_updated = NOW()
        WHERE id = 1
      `
    } catch (error) {
      console.error("[v0] Error clearing database:", error)
    }
  }
}

export const postStore = new PostStore()
