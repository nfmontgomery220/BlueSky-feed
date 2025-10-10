import { postStore } from "./post-store"
import { filterPost } from "./feed-filter"
import type { BlueskyPost } from "./types"
import { connectionLogger } from "./connection-logger"

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
      connectionLogger.log("warning", "Already connected to firehose")
      return
    }

    const endpoint = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post"

    connectionLogger.log("info", "Attempting to connect to Bluesky Jetstream...", { endpoint })

    try {
      this.ws = new WebSocket(endpoint)

      this.ws.onopen = () => {
        connectionLogger.log("success", "Successfully connected to Bluesky firehose")
        this.isConnected = true
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data: JetstreamEvent = JSON.parse(event.data)
          this.handleEvent(data).catch((error) => {
            connectionLogger.log("error", "Error handling firehose event", { error: String(error) })
          })
        } catch (error) {
          connectionLogger.log("error", "Error parsing firehose event", {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      this.ws.onerror = (error) => {
        connectionLogger.log("error", "Firehose WebSocket error", { error: String(error) })
      }

      this.ws.onclose = (event) => {
        connectionLogger.log("warning", "Disconnected from firehose", {
          code: event.code,
          reason: event.reason || "No reason provided",
          wasClean: event.wasClean,
        })
        this.isConnected = false
        this.ws = null

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          connectionLogger.log(
            "info",
            `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay / 1000}s`,
          )
          setTimeout(() => this.connect(), this.reconnectDelay)
        } else {
          connectionLogger.log("error", "Max reconnection attempts reached. Please reconnect manually.")
        }
      }
    } catch (error) {
      connectionLogger.log("error", "Error creating WebSocket connection", { error: String(error) })
      this.isConnected = false
      this.ws = null
    }
  }

  disconnect(): void {
    if (this.ws) {
      connectionLogger.log("info", "Manually disconnecting from firehose...")
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

  private async handleEvent(event: JetstreamEvent): Promise<void> {
    try {
      // Only process create operations for posts
      if (event?.commit?.operation !== "create" || event?.commit?.collection !== "app.bsky.feed.post") {
        return
      }

      const record = event.commit?.record
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
        hasImages: !!(record.embed?.images && Array.isArray(record.embed.images) && record.embed.images.length > 0),
        hasVideo: !!record.embed?.video,
      }

      // Apply filtering logic
      const result = filterPost(post)

      if (result.passed) {
        post.score = result.score
        await postStore.addPost(post)

        connectionLogger.log("info", `Post indexed: ${post.record.text.substring(0, 50)}...`, {
          score: result.score,
          hasMedia: post.hasImages || post.hasVideo,
        })
      } else {
        connectionLogger.log("info", `Post filtered: ${result.reason}`, {
          text: post.record.text.substring(0, 50),
        })

        await postStore.incrementFilteredOut()
      }
    } catch (error) {
      connectionLogger.log("error", "Error processing firehose event", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }
}

// Singleton instance
export const firehoseService = new FirehoseService()
