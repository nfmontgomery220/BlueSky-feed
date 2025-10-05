export interface BlueskyPost {
  uri: string
  cid: string
  author: {
    did: string
    handle: string
  }
  record: {
    text: string
    createdAt: string
    embed?: {
      $type: string
      images?: Array<{ alt: string; image: any }>
      external?: { uri: string; title: string; description: string }
      video?: any
    }
    facets?: Array<{
      features: Array<{ $type: string; uri?: string }>
    }>
  }
  indexedAt: string
  score: number
}

export interface FeedStats {
  totalIndexed: number
  totalFiltered: number
  postsWithMedia: number
  postsExcluded: number
  lastUpdated: string
}

export interface FilterResult {
  passed: boolean
  reason?: string
  score: number
}
