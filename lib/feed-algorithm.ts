import type { Post } from "./firehose"

export interface FeedAlgorithmConfig {
  minRelevanceScore?: number
  allowedLanguages?: string[]
  blockedDomains?: string[]
  requireImages?: boolean
  requireVideo?: boolean
  requiredHashtags?: string[]
  optionalHashtags?: string[]
  keywords?: string[]
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
      requiredHashtags: [],
      optionalHashtags: [],
      keywords: [],
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

    // Filter by required hashtags
    if (this.config.requiredHashtags && this.config.requiredHashtags.length > 0) {
      const postHashtags = post.hashtags || []
      const hasRequiredHashtag = this.config.requiredHashtags.some((tag) => postHashtags.includes(tag))
      if (!hasRequiredHashtag) {
        return false
      }
    }

    // Filter by optional hashtags
    if (this.config.optionalHashtags && this.config.optionalHashtags.length > 0) {
      const postHashtags = post.hashtags || []
      const hasOptionalHashtag = this.config.optionalHashtags.some((tag) => postHashtags.includes(tag))
      if (!hasOptionalHashtag) {
        return false
      }
    }

    // Filter by keywords
    if (this.config.keywords && this.config.keywords.length > 0) {
      const postText = post.text.toLowerCase()
      const hasKeyword = this.config.keywords.some((keyword) => postText.includes(keyword.toLowerCase()))
      if (!hasKeyword) {
        return false
      }
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

    // Boost for required hashtags
    if (this.config.requiredHashtags && this.config.requiredHashtags.length > 0) {
      const postHashtags = post.hashtags || []
      const hasRequiredHashtag = this.config.requiredHashtags.some((tag) => postHashtags.includes(tag))
      if (hasRequiredHashtag) score += 10
    }

    // Boost for optional hashtags
    if (this.config.optionalHashtags && this.config.optionalHashtags.length > 0) {
      const postHashtags = post.hashtags || []
      const hasOptionalHashtag = this.config.optionalHashtags.some((tag) => postHashtags.includes(tag))
      if (hasOptionalHashtag) score += 5
    }

    // Boost for keywords
    if (this.config.keywords && this.config.keywords.length > 0) {
      const postText = post.text.toLowerCase()
      const hasKeyword = this.config.keywords.some((keyword) => postText.includes(keyword.toLowerCase()))
      if (hasKeyword) score += 10
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score))
  }
}

/**
 * Hashtags to track for voting and civic engagement content
 */
const VOTING_HASHTAGS = [
  "voting",
  "vote",
  "election",
  "elections",
  "democracy",
  "civic",
  "civicengagement",
  "politics",
  "政治", // politics in other languages
  "voter",
  "ballot",
  "campaign",
  "政策", // policy
]

/**
 * Keywords to look for in post text (case-insensitive)
 */
const VOTING_KEYWORDS = [
  "voting",
  "vote",
  "election",
  "ballot",
  "democracy",
  "civic engagement",
  "voter registration",
  "polling place",
  "campaign",
  "candidate",
  "referendum",
]

/**
 * Simple function to determine if a post should be indexed
 * Used by the cron job for quick filtering
 */
export function shouldIndexPost(post: any): boolean {
  // Filter by language - only English posts
  if (post.langs && post.langs.length > 0) {
    if (!post.langs.includes("en")) {
      return false
    }
  }

  // Filter out posts with no text
  if (!post.text || post.text.trim().length === 0) {
    return false
  }

  // Filter out very short posts (likely spam or low quality)
  if (post.text.length < 10) {
    return false
  }

  const postText = post.text.toLowerCase()
  const hasVotingHashtag = VOTING_HASHTAGS.some((tag) => postText.includes(`#${tag}`))

  const hasVotingKeyword = VOTING_KEYWORDS.some((keyword) => postText.includes(keyword.toLowerCase()))

  // Post must contain either a voting hashtag or keyword
  if (!hasVotingHashtag && !hasVotingKeyword) {
    return false
  }

  return true
}

/**
 * Export hashtags and keywords for configuration
 */
export { VOTING_HASHTAGS, VOTING_KEYWORDS }
