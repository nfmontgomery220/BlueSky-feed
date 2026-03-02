import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateText, Output } from "ai"
import { z } from "zod"

// Classification schema matching the cron job
const ClassificationSchema = z.object({
  category: z.enum([
    "Social Security",
    "Medicare",
    "Medicaid",
    "Net Interest",
    "National Defense",
    "Domestic / Other",
    "Revenue & Taxes",
  ]),
  sentiment: z.enum(["Positive", "Negative", "Neutral"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

export async function POST() {
  try {
    const connectionString = process.env.bfc_DATABASE_URL || process.env.DATABASE_URL
    if (!connectionString) {
      return NextResponse.json(
        { error: "Database connection not configured" },
        { status: 500 }
      )
    }
    const sql = neon(connectionString)
    
    // Get unanalyzed posts (limit to 20 for manual runs)
    const postsToAnalyze = await sql`
      SELECT p.uri, p.text, p.author_handle
      FROM bluesky_feed.posts p
      LEFT JOIN bluesky_feed.post_analysis pa ON p.uri = pa.post_uri
      WHERE pa.post_uri IS NULL
        AND p.text IS NOT NULL
        AND LENGTH(p.text) > 20
      ORDER BY p.indexed_at DESC
      LIMIT 20
    `

    if (postsToAnalyze.length === 0) {
      return NextResponse.json({ 
        analyzed: 0, 
        message: "No unanalyzed posts found" 
      })
    }

    let analyzedCount = 0
    const errors: string[] = []

    for (const post of postsToAnalyze) {
      try {
        const { output } = await generateText({
          model: "openai/gpt-4o-mini",
          output: Output.object({
            schema: ClassificationSchema,
          }),
          messages: [
            {
              role: "system",
              content: `You are a policy analyst coding social media posts about the US Federal Budget.
          
          Apply this WATERFALL LOGIC strictly in order:
          
          1. MANDATORY SPENDING (The "Unchanging"):
             - Social Security: Retirement benefits, payroll taxes for it.
             - Medicare: Health insurance for seniors.
             - Medicaid: Healthcare for low income.
             - Net Interest: Debt service, interest payments on national debt.
             
          2. DISCRETIONARY SPENDING (The "Choices"):
             - National Defense: Military, Pentagon, weapons, wars.
             - Domestic / Other: Everything else (Education, Infrastructure, EPA, NASA, Justice, etc).
             
          3. INPUTS:
             - Revenue & Taxes: IRS, tax rates, tax cuts, tariffs.
             
          If a post mentions multiple topics, pick the PRIMARY driver of the argument.`,
            },
            {
              role: "user",
              content: `Analyze this post: "${post.text}"`,
            },
          ],
        })

        if (!output) {
          errors.push(`No output for post: ${post.uri.slice(-20)}`)
          continue
        }

        // Save to post_analysis table
        await sql`
          INSERT INTO bluesky_feed.post_analysis (
            post_uri, 
            category, 
            sentiment, 
            confidence, 
            text,
            analyzed_at
          )
          VALUES (
            ${post.uri},
            ${output.category},
            ${output.sentiment},
            ${output.confidence},
            ${post.text},
            NOW()
          )
          ON CONFLICT (post_uri) DO UPDATE SET
            category = EXCLUDED.category,
            sentiment = EXCLUDED.sentiment,
            confidence = EXCLUDED.confidence,
            analyzed_at = NOW()
        `
        
        analyzedCount++
      } catch (postError) {
        const errorMsg = postError instanceof Error ? postError.message : "Unknown error"
        errors.push(`Error analyzing post: ${errorMsg}`)
      }
    }

    return NextResponse.json({
      analyzed: analyzedCount,
      total: postsToAnalyze.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Analyzed ${analyzedCount} of ${postsToAnalyze.length} posts`
    })

  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    )
  }
}
