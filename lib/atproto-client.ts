import { BskyAgent } from "@atproto/api"

export class ATProtoClient {
  private agent: BskyAgent

  constructor() {
    this.agent = new BskyAgent({
      service: "https://bsky.social",
    })
  }

  async publishFeedGenerator(
    handle: string,
    password: string,
    feedConfig: {
      rkey: string
      displayName: string
      description: string
      did: string
    },
  ) {
    try {
      // Login
      await this.agent.login({
        identifier: handle,
        password: password,
      })

      // Publish feed generator record
      const response = await this.agent.com.atproto.repo.putRecord({
        repo: this.agent.session?.did || "",
        collection: "app.bsky.feed.generator",
        rkey: feedConfig.rkey,
        record: {
          did: feedConfig.did,
          displayName: feedConfig.displayName,
          description: feedConfig.description,
          createdAt: new Date().toISOString(),
        },
      })

      return {
        success: true,
        uri: response.uri,
        cid: response.cid,
      }
    } catch (error) {
      console.error("[v0] Error publishing feed generator:", error)
      throw error
    }
  }

  async resolveDID(handle: string): Promise<string> {
    try {
      const response = await this.agent.resolveHandle({ handle })
      return response.data.did
    } catch (error) {
      console.error("[v0] Error resolving DID:", error)
      throw error
    }
  }
}
