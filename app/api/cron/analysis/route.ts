import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateObject } from "ai"
import { z } from "zod"
import { openai } from "@ai-sdk/openai"

// Initialize Neon client
const sql = neon(process.env.DATABASE_URL!)

// Define the classification schema
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

export async function GET(request: Request) {
  // Verify Cron Secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    // 1. Fetch unanalyzed posts (batch of 10 to respect rate limits/timeouts)
    // We join with the analysis table to find posts that DON'T have an entry yet
    const postsToAnalyze = await sql`
      SELECT p.uri, p.text 
      FROM bluesky_feed.posts p
      LEFT JOIN bluesky_feed.post_analysis a ON p.uri = a.post_uri
      WHERE a.id IS NULL
      AND p.text IS NOT NULL
      LIMIT 10
    `

    if (postsToAnalyze.length === 0) {
      return NextResponse.json({ message: "No posts to analyze" })
    }

    const results = []

    // 2. Analyze each post
    for (const post of postsToAnalyze) {
      try {
        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: ClassificationSchema,
          system: `You are a policy analyst coding social media posts about the US Federal Budget.
          
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
          prompt: `Analyze this post: "${post.text}"`,
        })

        // 3. Save result
        await sql`
          INSERT INTO bluesky_feed.post_analysis 
          (post_uri, category, sentiment, confidence, model_used)
          VALUES 
          (${post.uri}, ${object.category}, ${object.sentiment}, ${object.confidence}, 'gpt-4o-mini')
          ON CONFLICT (post_uri) DO NOTHING
        `

        results.push({ uri: post.uri, category: object.category })
      } catch (err) {
        console.error(`Failed to analyze post ${post.uri}:`, err)
      }
    }

    return NextResponse.json({
      processed: results.length,
      details: results,
    })
  } catch (error) {
    console.error("Analysis job failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
