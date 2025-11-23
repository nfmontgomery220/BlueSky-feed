"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface AnalysisStats {
  total_analyzed: number
  category_breakdown: { name: string; value: number }[]
  sentiment_breakdown: { name: string; value: number; color: string }[]
  recent_analysis: {
    post_uri: string
    category: string
    sentiment: string
    confidence: number
    text: string
    analyzed_at: string
  }[]
}

export default function AnalysisPage() {
  const [stats, setStats] = useState<AnalysisStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/analysis")
      if (!res.ok) throw new Error("Failed to fetch analysis stats")
      const data = await res.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError("Failed to load analysis data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={fetchStats}>Try Again</Button>
      </div>
    )
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"]

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversation Analysis</h1>
          <p className="text-muted-foreground">AI-powered categorization and sentiment tracking for #budgetbuilder</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Analyzed Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_analyzed || 0}</div>
            <p className="text-xs text-muted-foreground">AI-coded interactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversation Topics</CardTitle>
            <CardDescription>Waterfall breakdown of budget categories</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.category_breakdown}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats?.category_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Overview</CardTitle>
            <CardDescription>Emotional tone of the conversation</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.sentiment_breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats?.sentiment_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coding Deck</CardTitle>
          <CardDescription>Recent posts and their AI-assigned categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recent_analysis.map((item, i) => (
              <div key={i} className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {item.category}
                    </Badge>
                    <Badge
                      className={
                        item.sentiment === "positive"
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          : item.sentiment === "negative"
                            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            : "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                      }
                    >
                      {item.sentiment}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.analyzed_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{item.text}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Confidence: {Math.round(item.confidence * 100)}%</span>
                  {item.post_uri && (
                    <a
                      href={`https://bsky.app/profile/${item.post_uri.split("/")[2]}/post/${item.post_uri.split("/")[4]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      View on Bluesky <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
