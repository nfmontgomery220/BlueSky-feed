export async function GET() {
  // Your Bluesky DID - find this in Bluesky Settings → Advanced → Account DID
  const did = process.env.BLUESKY_DID || ""

  if (!did) {
    return new Response("DID not configured", { status: 500 })
  }

  return new Response(did, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
