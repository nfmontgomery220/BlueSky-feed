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

  const cleanHandle = params.handle.trim().replace(/^@/, "")

  console.log("[v0] Attempting to login with identifier:", cleanHandle)

  // Login
  try {
    await agent.login({
      identifier: cleanHandle,
      password: params.password,
    })
  } catch (error: any) {
    console.log("[v0] Login error:", error)
    throw new Error(`Authentication failed: ${error.message || "Invalid identifier or password"}`)
  }

  // Create the feed generator record
  const record: {
    did: string
    displayName: string
    description: string
    avatar?: string
    createdAt: string
  } = {
    did: params.serviceDid,
    displayName: params.displayName,
    description: params.description,
    createdAt: new Date().toISOString(),
  }

  // Only add avatar if it's provided and not empty
  if (params.avatar && params.avatar.trim() !== "") {
    record.avatar = params.avatar
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

  const cleanHandle = params.handle.trim().replace(/^@/, "")

  await agent.login({
    identifier: cleanHandle,
    password: params.password,
  })

  await agent.api.com.atproto.repo.deleteRecord({
    repo: agent.session?.did || "",
    collection: "app.bsky.feed.generator",
    rkey: params.recordName,
  })

  return { success: true }
}
