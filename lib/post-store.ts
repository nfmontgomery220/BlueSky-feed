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
          ${post.author.handle},
          ${post.record.text},
          ${post.record.createdAt},
          ${post.hasImages || false},
          ${post.hasVideo || false},
          ${post.hasExternalLink || false},
          ${post.externalDomain || null},
          ${post.score},
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

      if (result.length > 0) {
        return {
          totalIndexed: Number(result[0].totalIndexed),
          totalFiltered: Number(result[0].totalFiltered),
          postsWithMedia: Number(result[0].postsWithMedia),
          postsExcluded: Number(result[0].postsExcluded),
          lastUpdated: result[0].lastUpdated,
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching stats from database:", error)
    }

    return {
      totalIndexed: 0,
      totalFiltered: 0,
      postsWithMedia: 0,
      postsExcluded: 0,
      lastUpdated: new Date().toISOString(),
    }
  }

  async updateStats(update: Partial<FeedStats>): Promise<void> {
    try {
      await sql`
        INSERT INTO bluesky_feed_stats (id, total_posts_indexed, total_posts_received, posts_with_images, posts_with_video, posts_filtered_out)
        VALUES (1, 0, 0, 0, 0, 0)
        ON CONFLICT (id) DO NOTHING
      `

      if (update.totalIndexed !== undefined) {
        await sql`
          UPDATE bluesky_feed_stats
          SET total_posts_indexed = total_posts_indexed + ${update.totalIndexed},
              last_updated = NOW()
          WHERE id = 1
        `
      }
      if (update.totalFiltered !== undefined) {
        await sql`
          UPDATE bluesky_feed_stats
          SET total_posts_received = total_posts_received + ${update.totalFiltered},
              last_updated = NOW()
          WHERE id = 1
        `
      }
      if (update.postsExcluded !== undefined) {
        await sql`
          UPDATE bluesky_feed_stats
          SET posts_filtered_out = posts_filtered_out + ${update.postsExcluded},
              last_updated = NOW()
          WHERE id = 1
        `
      }
    } catch (error) {
      console.error("[v0] Error updating stats:", error)
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
