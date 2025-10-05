import { NextResponse } from "next/server"
import { postStore } from "@/lib/post-store"

export async function GET() {
  const stats = await postStore.getStats()
  return NextResponse.json(stats)
}
