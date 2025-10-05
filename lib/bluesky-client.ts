import { BskyAgent } from "@atproto/api"

export async function publishFeed(params: {
  handle: string
  password: string
  serviceDid: string
  recordName: string
  displayName: string
  description: string
  avatar?: string
}) {
  const agent = new BskyAgent({ service: "https://bsky.social" })

  // Login
  await agent.login({
    identifier: params.handle,
    password: params.password,
  })

  // Create the feed generator record
  const record = {
    did: params.serviceDid,
    displayName: params.displayName,
    description: params.description,
    avatar: params.avatar,
    createdAt: new Date().toISOString(),
  }

  const response = await agent.api.com.atproto.repo.createRecord({
    repo: agent.session?.did || "",
    collection: "app.bsky.feed.generator",
    rkey: params.recordName,
    record,
  })

  return {
    uri: response.uri,
    cid: response.cid,
  }
}

export async function deleteFeed(params: { handle: string; password: string; recordName: string }) {
  const agent = new BskyAgent({ service: "https://bsky.social" })

  await agent.login({
    identifier: params.handle,
    password: params.password,
  })

  await agent.api.com.atproto.repo.deleteRecord({
    repo: agent.session?.did || "",
    collection: "app.bsky.feed.generator",
    rkey: params.recordName,
  })

  return { success: true }
}
