import { NextResponse } from "next/server"

export async function GET() {
  if (!process.env.FEEDGEN_SERVICE_DID || !process.env.FEEDGEN_HOSTNAME) {
    return NextResponse.json({ error: "Feed generator not configured" }, { status: 500 })
  }

  return NextResponse.json({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: process.env.FEEDGEN_SERVICE_DID,
    service: [
      {
        id: "#bsky_fg",
        type: "BskyFeedGenerator",
        serviceEndpoint: `https://${process.env.FEEDGEN_HOSTNAME}`,
      },
    ],
  })
}
