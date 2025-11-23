"use server"

import { BskyAgent } from "@atproto/api"

export async function testBlueskyConnection() {
  const logs: string[] = []

  function log(msg: string) {
    logs.push(`[${new Date().toISOString().split("T")[1].split(".")[0]}] ${msg}`)
    console.log(`[Debug] ${msg}`)
  }

  try {
    log("Starting connection test...")

    // 1. Check Environment Variables (supporting both cases)
    const identifier = process.env.BLUESKY_IDENTIFIER || process.env.Bluesky_Identifier
    const password = process.env.BLUESKY_PASSWORD || process.env.Bluesky_Password

    if (!identifier) log("❌ Missing BLUESKY_IDENTIFIER (or Bluesky_Identifier) env var")
    else log(`✅ BLUESKY_IDENTIFIER found: ${identifier}`)

    if (!password) log("❌ Missing BLUESKY_PASSWORD (or Bluesky_Password) env var")
    else log(`✅ BLUESKY_PASSWORD found (length: ${password.length})`)

    if (!identifier || !password) {
      return { success: false, message: "Missing credentials in environment variables", logs }
    }

    // 2. Attempt Authentication
    log("Attempting to authenticate with Bluesky...")
    const agent = new BskyAgent({ service: "https://bsky.social" })

    try {
      await agent.login({ identifier, password })
      log("✅ Authentication successful!")
    } catch (authError: any) {
      log(`❌ Authentication failed: ${authError.message}`)
      return { success: false, message: `Auth Failed: ${authError.message}`, logs }
    }

    // 3. Test Search (Firehose Simulation)
    log("Testing search API (simulating firehose)...")
    try {
      const result = await agent.app.bsky.feed.searchPosts({
        q: "democracy OR civic",
        limit: 5,
      })

      log(`✅ Search successful! Found ${result.data.posts.length} posts`)
      if (result.data.posts.length > 0) {
        log(`Sample post: "${result.data.posts[0].record.text.substring(0, 50)}..."`)
      }

      return { success: true, message: "Connection verified! Credentials are correct and API is accessible.", logs }
    } catch (searchError: any) {
      log(`❌ Search failed: ${searchError.message}`)
      return { success: false, message: `Search Failed: ${searchError.message}`, logs }
    }
  } catch (error: any) {
    log(`❌ Unexpected error: ${error.message}`)
    return { success: false, message: `Unexpected Error: ${error.message}`, logs }
  }
}
