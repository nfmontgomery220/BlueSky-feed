import { NextResponse } from "next/server"
import { connectionLogger } from "@/lib/connection-logger"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 100

  const logs = connectionLogger.getLogs(limit)
  return NextResponse.json({ logs })
}

export async function DELETE() {
  connectionLogger.clear()
  return NextResponse.json({ success: true, message: "Logs cleared" })
}
