import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Note: In production, you'd need to maintain a reference to the firehose instance
    // For now, this is a placeholder
    return NextResponse.json({ message: "Firehose stop requested" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to stop firehose" }, { status: 500 })
  }
}
