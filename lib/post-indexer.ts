import { sql } from "./db"
import type { Post } from "./firehose"
import type { FeedAlgorithm } from "./feed-algorithm"

export class PostIndexer {
  private algorithm: FeedAlgorithm
  private statsUpdateInterval: NodeJS.Timeout | null = null
  private stats = {
    totalReceived: 0,
    totalIndexed: 0,
    withImages: 0,
    withVideo: 0,
    filteredOut: 0,
  }

  constructor(algorithm: FeedAlgorithm) {
    this.algorithm = algorithm
    this.startStatsUpdater()
  }

  async indexPost(post: Post): Promise<void> {
    this.stats.totalReceived++

    // Check if post should be included
    if (!this.algorithm.shouldIncludePost(post)) {
      this.stats.filteredOut++
      return
    }

    // Calculate relevance score
    const relevanceScore = this.algorithm.calculateRelevanceScore(post)

    try {
      // Insert post into database
      await sql`
        INSERT INTO bluesky_feed.posts (
          uri, cid, author_did, author_handle, text, created_at,
          langs, has_images, has_video, has_external_link,
          external_domain, embed_data, facets, labels,
          relevance_score, indexed_at
        ) VALUES (
          ${post.uri}, ${post.cid}, ${post.author_did}, ${post.author_handle},
          ${post.text}, ${post.created_at}, ${post.langs || []},
          ${post.has_images}, ${post.has_video}, ${post.has_external_link},
          ${post.external_domain || null}, ${JSON.stringify(post.embed_data)},
          ${JSON.stringify(post.facets)}, ${JSON.stringify(post.labels)},
          ${relevanceScore}, NOW()
        )
        ON CONFLICT (uri) DO NOTHING
      `

      this.stats.totalIndexed++
      if (post.has_images) this.stats.withImages++
      if (post.has_video) this.stats.withVideo++
    } catch (error) {
      console.error("[v0] Error indexing post:", error)
    }
  }

  private startStatsUpdater() {
    // Update stats every 30 seconds
    this.statsUpdateInterval = setInterval(async () => {
      try {
        await sql`
          INSERT INTO bluesky_feed.feed_stats (
            total_posts_received, total_posts_indexed,
            posts_with_images, posts_with_video,
            posts_filtered_out, last_updated
          ) VALUES (
            ${this.stats.totalReceived}, ${this.stats.totalIndexed},
            ${this.stats.withImages}, ${this.stats.withVideo},
            ${this.stats.filteredOut}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            total_posts_received = ${this.stats.totalReceived},
            total_posts_indexed = ${this.stats.totalIndexed},
            posts_with_images = ${this.stats.withImages},
            posts_with_video = ${this.stats.withVideo},
            posts_filtered_out = ${this.stats.filteredOut},
            last_updated = NOW()
        `
      } catch (error) {
        console.error("[v0] Error updating stats:", error)
      }
    }, 30000)
  }

  stop() {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval)
      this.statsUpdateInterval = null
    }
  }

  getStats() {
    return { ...this.stats }
  }
}
