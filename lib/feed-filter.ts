import type { BlueskyPost, FilterResult } from "./types"
import { FEED_CONFIG } from "./feed-config"

export function filterPost(post: BlueskyPost): FilterResult {
  const text = post.record.text.toLowerCase()
  let score = 0

  // Check for civic keywords
  const matchedKeywords = FEED_CONFIG.civicKeywords.filter((keyword) => text.includes(keyword.toLowerCase()))

  if (matchedKeywords.length === 0) {
    return { passed: false, reason: "No civic keywords found", score: 0 }
  }

  // Score based on keyword matches
  score += matchedKeywords.length * 10

  // Check for media (images or video)
  const hasMedia = post.record.embed?.images || post.record.embed?.video
  if (hasMedia) {
    score += 20 // Boost posts with visual content
  }

  // Check for excluded domains in links
  if (post.record.embed?.external?.uri || post.record.facets) {
    const links: string[] = []

    if (post.record.embed?.external?.uri) {
      links.push(post.record.embed.external.uri)
    }

    if (post.record.facets) {
      for (const facet of post.record.facets) {
        for (const feature of facet.features) {
          if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
            links.push(feature.uri)
          }
        }
      }
    }

    // Check if any link contains excluded domains
    for (const link of links) {
      const linkLower = link.toLowerCase()
      for (const domain of FEED_CONFIG.excludedDomains) {
        if (linkLower.includes(domain)) {
          return { passed: false, reason: `Excluded domain: ${domain}`, score: 0 }
        }
      }
    }
  }

  // Boost for emotional/impact words
  const impactWords = ["crisis", "urgent", "critical", "breaking", "important", "impact", "change", "action"]
  const matchedImpact = impactWords.filter((word) => text.includes(word))
  score += matchedImpact.length * 5

  return { passed: true, score }
}
