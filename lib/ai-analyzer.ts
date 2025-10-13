import { generateObject } from "ai"

export interface PostAnalysis {
  topic: string
  sentiment_score: number
  sentiment_label: string
  quality_score: number
  themes: string[]
  is_actionable: boolean
  time_sensitivity: string
  reasoning: string
}

export async function analyzePost(text: string, author: string): Promise<PostAnalysis> {
  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "Voter Registration",
            "Election Integrity",
            "Voting Rights",
            "Civic Education",
            "Campaign Information",
            "Ballot Measures",
            "Polling Places",
            "Off-Topic",
          ],
          description: "Primary topic category",
        },
        sentiment_score: {
          type: "number",
          minimum: -1,
          maximum: 1,
          description: "Sentiment from -1 (very negative) to 1 (very positive)",
        },
        sentiment_label: {
          type: "string",
          enum: ["Encouraging", "Concerned", "Neutral", "Critical"],
          description: "Sentiment label",
        },
        quality_score: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Quality score: 0=spam/low-quality, 1=high-quality informative content",
        },
        themes: {
          type: "array",
          items: { type: "string" },
          description: "Additional themes (e.g., Accessibility, Youth, Misinformation, Deadlines)",
        },
        is_actionable: {
          type: "boolean",
          description: "Does the post contain a call-to-action?",
        },
        time_sensitivity: {
          type: "string",
          enum: ["Urgent", "Time-bound", "Evergreen"],
          description: "Time sensitivity of the content",
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of the analysis",
        },
      },
      required: [
        "topic",
        "sentiment_score",
        "sentiment_label",
        "quality_score",
        "themes",
        "is_actionable",
        "time_sensitivity",
        "reasoning",
      ],
    },
    prompt: `Analyze this Bluesky post about civics/voting and provide structured categorization.

Post text: "${text}"
Author: ${author}

Evaluate:
1. Topic: What is the primary civics-related topic? If not civics-related, mark as "Off-Topic"
2. Sentiment: How positive/negative is the tone? (-1 to 1)
3. Quality: Is this informative, spam, or misinformation? (0 to 1)
   - High quality (0.7-1.0): Well-sourced, informative, clear
   - Medium quality (0.4-0.6): Opinion, personal story, unclear
   - Low quality (0-0.3): Spam, misinformation, incoherent
4. Themes: What additional themes are present?
5. Actionable: Does it tell people to do something specific?
6. Time sensitivity: Is there urgency or a deadline?

Provide your analysis:`,
  })

  return object as PostAnalysis
}

export function determineStatus(analysis: PostAnalysis): string {
  // Auto-reject criteria
  if (analysis.quality_score < 0.3) return "rejected"
  if (analysis.topic === "Off-Topic") return "rejected"

  // Manual review criteria
  if (analysis.quality_score >= 0.3 && analysis.quality_score < 0.6) return "needs_review"

  // Auto-approve criteria
  if (analysis.quality_score >= 0.6) return "approved"

  return "needs_review"
}
