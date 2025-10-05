import { type NextRequest, NextResponse } from "next/server"
import { firehoseService } from "@/lib/firehose-service"

export async function POST(request: NextRequest) {
  const { action } = await request.json()

  if (action === "connect") {
    firehoseService.connect()
    return NextResponse.json({ success: true, message: "Connecting to firehose..." })
  }

  if (action === "disconnect") {
    firehoseService.disconnect()
    return NextResponse.json({ success: true, message: "Disconnected from firehose" })
  }

  return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 })
}

export async function GET() {
  const status = firehoseService.getStatus()
  return NextResponse.json(status)
}
