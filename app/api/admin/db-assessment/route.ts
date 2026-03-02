import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    
    // Get table schemas for key tables
    const tableNames = ['posts', 'feed_stats_hourly', 'feed_stats_daily', 'hashtag_stats']
    const tables = []
    
    for (const tableName of tableNames) {
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'bluesky_feed' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `
      if (columns.length > 0) {
        tables.push({ name: tableName, columns })
      }
    }
    
    // Get function definitions
    const functionDefs = await sql`
      SELECT proname as function_name, pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'bluesky_feed')
      ORDER BY proname
    `
    
    // Analyze functions for issues
    const functions = functionDefs.map((fn: { function_name: string; definition: string }) => {
      const issues: string[] = []
      const columnMismatches: { functionColumn: string; tableColumn: string; status: string }[] = []
      let status: "working" | "broken" | "warning" = "working"
      
      const def = fn.definition
      
      // Check aggregate_to_hourly for known issues
      if (fn.function_name === 'aggregate_to_hourly') {
        if (def.includes('hour_bucket')) {
          issues.push("Uses 'hour_bucket' but table has 'hour' column")
          columnMismatches.push({ functionColumn: 'hour_bucket', tableColumn: 'hour', status: 'mismatch' })
          status = "broken"
        }
        if (def.includes('total_posts')) {
          issues.push("Uses 'total_posts' but table has 'posts_count' column")
          columnMismatches.push({ functionColumn: 'total_posts', tableColumn: 'posts_count', status: 'mismatch' })
          status = "broken"
        }
        if (def.includes('posts_with_media') && !def.includes('posts_with_images')) {
          issues.push("Uses 'posts_with_media' but table has 'posts_with_images'")
          columnMismatches.push({ functionColumn: 'posts_with_media', tableColumn: 'posts_with_images', status: 'mismatch' })
          status = "broken"
        }
        if (def.includes('has_media') && !def.includes('has_images')) {
          issues.push("Uses 'has_media' but posts table has 'has_images'")
          status = "broken"
        }
        if (def.includes('has_links') && !def.includes('has_external_link')) {
          issues.push("Uses 'has_links' but posts table has 'has_external_link'")
          status = "broken"
        }
        if (def.includes('avg_index_delay_seconds')) {
          issues.push("References non-existent column 'avg_index_delay_seconds'")
          status = "broken"
        }
        if (def.includes('updated_at') && fn.function_name === 'aggregate_to_hourly') {
          issues.push("References non-existent column 'updated_at' in feed_stats_hourly")
          status = "broken"
        }
      }
      
      // Check aggregate_to_daily
      if (fn.function_name === 'aggregate_to_daily') {
        // This function looks correct based on schema
        if (!def.includes('posts_with_video')) {
          issues.push("Missing 'posts_with_video' aggregation")
          status = "warning"
        }
      }
      
      return {
        name: fn.function_name,
        status,
        issues,
        columnMismatches
      }
    })
    
    return NextResponse.json({ tables, functions })
  } catch (error) {
    console.error("Database assessment error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
