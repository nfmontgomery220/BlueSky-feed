import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.bfc_DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Export type: posts, hourly_stats, daily_stats, hashtags, authors, all
    const exportType = searchParams.get("type") || "posts"
    
    // Filters
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 10000)
    const offset = parseInt(searchParams.get("offset") || "0")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const hashtag = searchParams.get("hashtag")
    const author = searchParams.get("author")
    const hasMedia = searchParams.get("has_media")
    
    // Format: json, csv, jsonl (JSON Lines)
    const format = searchParams.get("format") || "json"
    
    let data: any = {}
    
    switch (exportType) {
      case "posts":
        data = await exportPosts({ limit, offset, startDate, endDate, hashtag, author, hasMedia })
        break
      case "hourly_stats":
        data = await exportHourlyStats({ limit, offset, startDate, endDate })
        break
      case "daily_stats":
        data = await exportDailyStats({ limit, offset, startDate, endDate })
        break
      case "hashtags":
        data = await exportHashtags({ limit, offset })
        break
      case "authors":
        data = await exportAuthors({ limit, offset })
        break
      case "all":
        data = await exportAll({ limit, startDate, endDate })
        break
      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
    }
    
    // Format response
    if (format === "csv") {
      const csv = convertToCSV(data.records || data)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${exportType}_export_${Date.now()}.csv"`,
        },
      })
    }
    
    if (format === "jsonl") {
      const jsonl = (data.records || data).map((r: any) => JSON.stringify(r)).join("\n")
      return new NextResponse(jsonl, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Content-Disposition": `attachment; filename="${exportType}_export_${Date.now()}.jsonl"`,
        },
      })
    }
    
    // Default JSON response
    return NextResponse.json({
      export_type: exportType,
      exported_at: new Date().toISOString(),
      filters: { limit, offset, startDate, endDate, hashtag, author, hasMedia },
      total_records: data.total || (Array.isArray(data) ? data.length : data.records?.length || 0),
      ...data,
    })
    
  } catch (error) {
    console.error("[v0] Export error:", error)
    return NextResponse.json(
      { error: "Export failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

async function exportPosts(params: {
  limit: number
  offset: number
  startDate: string | null
  endDate: string | null
  hashtag: string | null
  author: string | null
  hasMedia: string | null
}) {
  const { limit, offset, startDate, endDate, hashtag, author, hasMedia } = params
  
  // Build dynamic query based on filters
  let whereConditions: string[] = []
  
  if (startDate) whereConditions.push(`created_at >= '${startDate}'`)
  if (endDate) whereConditions.push(`created_at <= '${endDate}'`)
  if (hashtag) whereConditions.push(`'${hashtag.toLowerCase()}' = ANY(hashtags)`)
  if (author) whereConditions.push(`author_handle ILIKE '%${author}%'`)
  if (hasMedia === "true") whereConditions.push(`(has_images = true OR has_video = true)`)
  if (hasMedia === "images") whereConditions.push(`has_images = true`)
  if (hasMedia === "video") whereConditions.push(`has_video = true`)
  if (hasMedia === "links") whereConditions.push(`has_external_link = true`)
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""
  
  // Get total count
  const countResult = await sql`
    SELECT COUNT(*) as total FROM bluesky_feed.posts
  `
  
  // Get filtered posts
  const posts = await sql`
    SELECT 
      id,
      uri,
      cid,
      author_did,
      author_handle,
      text,
      created_at,
      indexed_at,
      has_images,
      has_video,
      has_external_link,
      external_domain,
      relevance_score,
      hashtags,
      langs,
      facets,
      labels,
      embed_data
    FROM bluesky_feed.posts
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  
  return {
    total: parseInt(countResult[0]?.total || "0"),
    records: posts,
  }
}

async function exportHourlyStats(params: {
  limit: number
  offset: number
  startDate: string | null
  endDate: string | null
}) {
  const { limit, offset, startDate, endDate } = params
  
  const stats = await sql`
    SELECT 
      id,
      hour,
      posts_count,
      unique_authors,
      posts_with_images,
      posts_with_video,
      posts_with_links,
      top_domains,
      created_at
    FROM bluesky_feed.feed_stats_hourly
    ORDER BY hour DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  
  const countResult = await sql`
    SELECT COUNT(*) as total FROM bluesky_feed.feed_stats_hourly
  `
  
  return {
    total: parseInt(countResult[0]?.total || "0"),
    records: stats,
  }
}

async function exportDailyStats(params: {
  limit: number
  offset: number
  startDate: string | null
  endDate: string | null
}) {
  const { limit, offset } = params
  
  const stats = await sql`
    SELECT 
      id,
      date,
      posts_count,
      unique_authors,
      posts_with_images,
      posts_with_video,
      posts_with_links,
      top_authors,
      top_domains,
      created_at
    FROM bluesky_feed.feed_stats_daily
    ORDER BY date DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  
  const countResult = await sql`
    SELECT COUNT(*) as total FROM bluesky_feed.feed_stats_daily
  `
  
  return {
    total: parseInt(countResult[0]?.total || "0"),
    records: stats,
  }
}

async function exportHashtags(params: { limit: number; offset: number }) {
  const { limit, offset } = params
  
  const hashtags = await sql`
    SELECT 
      id,
      tag,
      count,
      first_seen,
      last_seen,
      trend_score
    FROM bluesky_feed.hashtag_stats
    ORDER BY count DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  
  const countResult = await sql`
    SELECT COUNT(*) as total FROM bluesky_feed.hashtag_stats
  `
  
  return {
    total: parseInt(countResult[0]?.total || "0"),
    records: hashtags,
  }
}

async function exportAuthors(params: { limit: number; offset: number }) {
  const { limit, offset } = params
  
  const authors = await sql`
    SELECT 
      author_did,
      author_handle,
      COUNT(*) as post_count,
      COUNT(CASE WHEN has_images THEN 1 END) as posts_with_images,
      COUNT(CASE WHEN has_video THEN 1 END) as posts_with_video,
      COUNT(CASE WHEN has_external_link THEN 1 END) as posts_with_links,
      MIN(created_at) as first_post,
      MAX(created_at) as last_post,
      AVG(relevance_score) as avg_relevance
    FROM bluesky_feed.posts
    GROUP BY author_did, author_handle
    ORDER BY post_count DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  
  const countResult = await sql`
    SELECT COUNT(DISTINCT author_did) as total FROM bluesky_feed.posts
  `
  
  return {
    total: parseInt(countResult[0]?.total || "0"),
    records: authors,
  }
}

async function exportAll(params: {
  limit: number
  startDate: string | null
  endDate: string | null
}) {
  const { limit, startDate, endDate } = params
  
  // Get summary stats
  const summary = await sql`
    SELECT 
      COUNT(*) as total_posts,
      COUNT(DISTINCT author_did) as unique_authors,
      COUNT(CASE WHEN has_images THEN 1 END) as posts_with_images,
      COUNT(CASE WHEN has_video THEN 1 END) as posts_with_video,
      COUNT(CASE WHEN has_external_link THEN 1 END) as posts_with_links,
      MIN(created_at) as oldest_post,
      MAX(created_at) as newest_post
    FROM bluesky_feed.posts
  `
  
  // Get recent posts sample
  const recentPosts = await sql`
    SELECT 
      uri, author_handle, text, created_at, 
      has_images, has_video, has_external_link, hashtags
    FROM bluesky_feed.posts
    ORDER BY created_at DESC
    LIMIT ${Math.min(limit, 100)}
  `
  
  // Get top hashtags
  const topHashtags = await sql`
    SELECT tag, count, trend_score
    FROM bluesky_feed.hashtag_stats
    ORDER BY count DESC
    LIMIT 50
  `
  
  // Get hourly trends (last 7 days)
  const hourlyTrends = await sql`
    SELECT hour, posts_count, unique_authors
    FROM bluesky_feed.feed_stats_hourly
    ORDER BY hour DESC
    LIMIT 168
  `
  
  // Get daily trends
  const dailyTrends = await sql`
    SELECT date, posts_count, unique_authors
    FROM bluesky_feed.feed_stats_daily
    ORDER BY date DESC
    LIMIT 30
  `
  
  // Get top authors
  const topAuthors = await sql`
    SELECT 
      author_handle,
      COUNT(*) as post_count
    FROM bluesky_feed.posts
    GROUP BY author_handle
    ORDER BY post_count DESC
    LIMIT 50
  `
  
  return {
    summary: summary[0],
    recent_posts: recentPosts,
    top_hashtags: topHashtags,
    hourly_trends: hourlyTrends,
    daily_trends: dailyTrends,
    top_authors: topAuthors,
  }
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return ""
  
  const headers = Object.keys(data[0])
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ""
      if (typeof value === "object") return JSON.stringify(value).replace(/"/g, '""')
      return String(value).replace(/"/g, '""')
    }).map(v => `"${v}"`).join(",")
  )
  
  return [headers.join(","), ...rows].join("\n")
}
