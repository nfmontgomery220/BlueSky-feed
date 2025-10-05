import { postStore } from "./post-store"
import { filterPost } from "./feed-filter"
import type { BlueskyPost } from "./types"

interface JetstreamEvent {
  did: string
  time_us: number
  kind: "commit"
  commit: {
    rev: string
    operation: "create" | "update" | "delete"
    collection: string
    rkey: string
    record?: {
      $type: string
      text?: string
      createdAt?: string
      embed?: any
      facets?: any
    }
    cid?: string
  }
}

class FirehoseService {
  private ws: WebSocket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000

  connect(): void {
    if (this.isConnected || this.ws) {
      console.log("[v0] Already connected to firehose")
      return
    }

    const endpoint = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post"

    console.log("[v0] Connecting to Bluesky Jetstream...")

    try {
      this.ws = new WebSocket(endpoint)

      this.ws.onopen = () => {
        console.log("[v0] Connected to Bluesky firehose")
        this.isConnected = true
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data: JetstreamEvent = JSON.parse(event.data)
          this.handleEvent(data)
        } catch (error) {
          console.error("[v0] Error parsing firehose event:", error)
        }
      }

      this.ws.onerror = (error) => {
        console.error("[v0] Firehose WebSocket error:", error)
      }

      this.ws.onclose = () => {
        console.log("[v0] Disconnected from firehose")
        this.isConnected = false
        this.ws = null

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          console.log(`[v0] Reconnecting in ${this.reconnectDelay / 1000}s (attempt ${this.reconnectAttempts})...`)
          setTimeout(() => this.connect(), this.reconnectDelay)
        }
      }
    } catch (error) {
      console.error("[v0] Error creating WebSocket connection:", error)
      this.isConnected = false
      this.ws = null
    }
  }

  disconnect(): void {
    if (this.ws) {
      console.log("[v0] Disconnecting from firehose...")
      this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }

  getStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    }
  }

  private handleEvent(event: JetstreamEvent): void {
    // Only process create operations for posts
    if (event.commit.operation !== "create" || event.commit.collection !== "app.bsky.feed.post") {
      return
    }

    const record = event.commit.record
    if (!record || !record.text) {
      return
    }

    // Convert Jetstream event to BlueskyPost format
    const post: BlueskyPost = {
      uri: `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`,
      cid: event.commit.cid || "",
      author: {
        did: event.did,
        handle: "", // Jetstream doesn't include handle, would need to resolve separately
      },
      record: {
        text: record.text,
        createdAt: record.createdAt || new Date().toISOString(),
        embed: record.embed,
        facets: record.facets,
      },
      indexedAt: new Date().toISOString(),
      score: 0,
    }

    // Apply filtering logic
    const result = filterPost(post)

    if (result.passed) {
      post.score = result.score
      postStore.addPost(post)

      // Update stats
      const stats = postStore.getStats()
      if (post.record.embed?.images || post.record.embed?.video) {
        postStore.updateStats({ postsWithMedia: stats.postsWithMedia + 1 })
      }
    } else {
      // Update exclusion stats
      const stats = postStore.getStats()
      postStore.updateStats({
        postsExcluded: stats.postsExcluded + 1,
        totalFiltered: stats.totalFiltered + 1,
      })
    }
  }
}

// Singleton instance
export const firehoseService = new FirehoseService()
