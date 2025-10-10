import type { Post } from "./firehose"

export interface FeedAlgorithmConfig {
  minRelevanceScore?: number
  allowedLanguages?: string[]
  blockedDomains?: string[]
  requireImages?: boolean
  requireVideo?: boolean
}

export class FeedAlgorithm {
  private config: FeedAlgorithmConfig

  constructor(config: FeedAlgorithmConfig = {}) {
    this.config = {
      minRelevanceScore: 0,
      allowedLanguages: ["en"],
      blockedDomains: [],
      requireImages: false,
      requireVideo: false,
      ...config,
    }
  }

  /**
   * Determines if a post should be included in the feed
   */
  shouldIncludePost(post: Post): boolean {
    // Filter by language
    if (this.config.allowedLanguages && this.config.allowedLanguages.length > 0) {
      if (!post.langs || post.langs.length === 0) {
        return false
      }
      const hasAllowedLang = post.langs.some((lang) => this.config.allowedLanguages!.includes(lang))
      if (!hasAllowedLang) {
        return false
      }
    }

    // Filter by blocked domains
    if (post.external_domain && this.config.blockedDomains?.includes(post.external_domain)) {
      return false
    }

    // Filter by media requirements
    if (this.config.requireImages && !post.has_images) {
      return false
    }

    if (this.config.requireVideo && !post.has_video) {
      return false
    }

    return true
  }

  /**
   * Calculate relevance score for a post (0-100)
   */
  calculateRelevanceScore(post: Post): number {
    let score = 50 // Base score

    // Boost for media content
    if (post.has_images) score += 10
    if (post.has_video) score += 15

    // Boost for external links
    if (post.has_external_link) score += 5

    // Penalize very short posts
    if (post.text.length < 50) score -= 10

    // Boost for longer, more substantial posts
    if (post.text.length > 200) score += 10

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score))
  }
}
