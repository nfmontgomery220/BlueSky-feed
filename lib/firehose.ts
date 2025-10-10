import { Jetstream } from "@skyware/jetstream"

export interface Post {
  uri: string
  cid: string
  author_did: string
  author_handle: string
  text: string
  created_at: string
  langs?: string[]
  has_images: boolean
  has_video: boolean
  has_external_link: boolean
  external_domain?: string
  embed_data?: any
  facets?: any
  labels?: any
}

export class FirehoseConnection {
  private jetstream: Jetstream
  private onPostCallback?: (post: Post) => Promise<void>
  private isRunning = false

  constructor() {
    this.jetstream = new Jetstream({
      wantedCollections: ["app.bsky.feed.post"],
    })
  }

  async start(onPost: (post: Post) => Promise<void>) {
    if (this.isRunning) {
      console.log("[v0] Firehose already running")
      return
    }

    this.onPostCallback = onPost
    this.isRunning = true

    this.jetstream.on("error", (error) => {
      console.error("[v0] Jetstream error:", error)
    })

    this.jetstream.on("close", () => {
      console.log("[v0] Jetstream connection closed")
      this.isRunning = false
    })

    this.jetstream.onCreate("app.bsky.feed.post", async (event) => {
      try {
        console.log("[v0] Received post from firehose:", event.did)
        const record = event.commit.record as any

        // Extract post data
        const post: Post = {
          uri: event.did + "/app.bsky.feed.post/" + event.commit.rkey,
          cid: event.commit.cid,
          author_did: event.did,
          author_handle: "", // Will be resolved later if needed
          text: record.text || "",
          created_at: record.createdAt || new Date().toISOString(),
          langs: record.langs || [],
          has_images: false,
          has_video: false,
          has_external_link: false,
          embed_data: null,
          facets: record.facets || null,
          labels: record.labels || null,
        }

        // Check for embeds
        if (record.embed) {
          post.embed_data = record.embed

          if (record.embed.$type === "app.bsky.embed.images") {
            post.has_images = true
          } else if (record.embed.$type === "app.bsky.embed.video") {
            post.has_video = true
          } else if (record.embed.$type === "app.bsky.embed.external") {
            post.has_external_link = true
            post.external_domain = this.extractDomain(record.embed.external?.uri)
          }
        }

        if (this.onPostCallback) {
          await this.onPostCallback(post)
        }
      } catch (error) {
        console.error("[v0] Error processing post:", error)
      }
    })

    try {
      await this.jetstream.start()
      console.log("[v0] Firehose connection started successfully")
    } catch (error) {
      console.error("[v0] Failed to start Jetstream:", error)
      this.isRunning = false
      throw error
    }
  }

  stop() {
    if (this.isRunning) {
      this.jetstream.close()
      this.isRunning = false
      console.log("[v0] Firehose connection stopped")
    }
  }

  private extractDomain(url?: string): string | undefined {
    if (!url) return undefined
    try {
      const domain = new URL(url).hostname
      return domain
    } catch {
      return undefined
    }
  }
}
