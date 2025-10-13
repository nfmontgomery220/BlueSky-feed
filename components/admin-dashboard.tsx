"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, Database, TrendingUp, ImageIcon, Filter } from "lucide-react"
import { StatsCard } from "@/components/stats-card"
import { MetricChart } from "@/components/metric-chart"
import { DatabaseManagement } from "@/components/database-management"

interface FeedStats {
  total_posts_received: number
  total_posts_indexed: number
  posts_with_images: number
  posts_with_video: number
  posts_filtered_out: number
  last_updated?: string
}

interface HistoricalDataPoint {
  hour: string
  total_posts_received: string
  total_posts_indexed: string
  posts_with_images: string
  posts_with_video: string
  posts_filtered_out: string
}

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [stats, setStats] = useState<FeedStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [isCollectingManually, setIsCollectingManually] = useState(false)
  const [lastCollectionResult, setLastCollectionResult] = useState<string>("")
  const [chartData, setChartData] = useState<{
    received: Array<{ time: string; value: number }>
    indexed: Array<{ time: string; value: number }>
  }>({
    received: [],
    indexed: [],
  })
  const [activeTab, setActiveTab] = useState<"overview" | "database">("overview")

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
      fetchHistory()
      const interval = setInterval(() => {
        fetchStats()
        fetchHistory()
      }, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/firehose/stats")
      if (response.ok) {
        const data = await response.json()
        const parsedStats: FeedStats = {
          total_posts_received: Number(data.total_posts_received) || 0,
          total_posts_indexed: Number(data.total_posts_indexed) || 0,
          posts_with_images: Number(data.posts_with_images) || 0,
          posts_with_video: Number(data.posts_with_video) || 0,
          posts_filtered_out: Number(data.posts_filtered_out) || 0,
          last_updated: data.last_updated,
        }
        setStats(parsedStats)
      }
    } catch (error) {
      console.error("[v0] Error fetching stats:", error)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/firehose/history")
      if (response.ok) {
        const data = await response.json()
        const history: HistoricalDataPoint[] = data.history || []

        // Format data for charts
        const receivedData = history.map((point) => ({
          time: new Date(point.hour).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
          value: Number(point.total_posts_received) || 0,
        }))

        const indexedData = history.map((point) => ({
          time: new Date(point.hour).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
          value: Number(point.total_posts_indexed) || 0,
        }))

        setChartData({
          received: receivedData,
          indexed: indexedData,
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching history:", error)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password) {
      setIsAuthenticated(true)
    }
  }

  const calculatePercentage = (numerator: number | undefined, denominator: number | undefined): number => {
    if (!denominator || denominator === 0 || !numerator) {
      return 0
    }
    return Math.round((numerator / denominator) * 100)
  }

  const handleManualCollection = async () => {
    setIsCollectingManually(true)
    setLastCollectionResult("")
    try {
      console.log("[v0] Starting manual collection...")
      const response = await fetch("/api/cron/collect-posts", {
        method: "GET", // explicitly set method
        headers: {
          Authorization: `Bearer ${password}`,
        },
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

      const contentType = response.headers.get("content-type")
      let result

      if (contentType?.includes("application/json")) {
        result = await response.json()
      } else {
        const text = await response.text()
        console.error("[v0] Non-JSON response:", text)
        setLastCollectionResult(`✗ Error: Server error (${response.status}). Check server logs.`)
        return
      }

      console.log("[v0] Response data:", result)

      if (response.ok) {
        setLastCollectionResult(
          `✓ Collected ${result.postsReceived} posts, indexed ${result.postsIndexed}, filtered ${result.postsFiltered}`,
        )
        // Refresh stats immediately
        await fetchStats()
        await fetchHistory()
      } else {
        const errorMsg = result.details ? `${result.error}: ${result.details}` : result.error || "Unknown error"
        setLastCollectionResult(`✗ Error: ${errorMsg}`)
      }
    } catch (error) {
      console.error("[v0] Manual collection error:", error)
      setLastCollectionResult(`✗ Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsCollectingManually(false)
    }
  }

  const indexRate = calculatePercentage(stats?.total_posts_indexed, stats?.total_posts_received)
  const filterRate = calculatePercentage(stats?.posts_filtered_out, stats?.total_posts_received)

  const isCollecting = stats?.last_updated
    ? Date.now() - new Date(stats.last_updated).getTime() < 120000 // Active if updated in last 2 minutes
    : false

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md p-8 bg-card border-border">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Feed Generator Admin</h1>
            <p className="text-sm text-muted-foreground">Enter admin password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input border-border text-foreground"
                placeholder="Enter admin password"
              />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Login
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Feed Generator</h1>
              <p className="text-sm text-muted-foreground">Bluesky Feed Monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 mr-4">
                <Button
                  onClick={() => setActiveTab("overview")}
                  variant={activeTab === "overview" ? "default" : "outline"}
                  size="sm"
                >
                  Overview
                </Button>
                <Button
                  onClick={() => setActiveTab("database")}
                  variant={activeTab === "database" ? "default" : "outline"}
                  size="sm"
                >
                  Database
                </Button>
              </div>
              <Button
                onClick={handleManualCollection}
                disabled={isCollectingManually}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isCollectingManually ? "Collecting..." : "Collect Now"}
              </Button>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isCollecting ? "bg-chart-2" : "bg-muted"}`} />
                <span className="text-sm text-muted-foreground">
                  {isCollecting ? "Collecting" : "Waiting for next run"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground bg-accent px-3 py-1.5 rounded-md">Cron: Every minute</div>
            </div>
          </div>
          {lastCollectionResult && (
            <div className="mt-3 text-xs text-muted-foreground bg-accent px-3 py-2 rounded-md">
              {lastCollectionResult}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {activeTab === "overview" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard title="Posts Received" value={stats?.total_posts_received || 0} icon={Activity} />
              <StatsCard title="Posts Indexed" value={stats?.total_posts_indexed || 0} icon={Database} />
              <StatsCard title="With Images" value={stats?.posts_with_images || 0} icon={ImageIcon} />
              <StatsCard title="Filtered Out" value={stats?.posts_filtered_out || 0} icon={Filter} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <MetricChart
                title="Posts Received"
                description="Total posts from firehose over last 24 hours"
                data={chartData.received.length > 0 ? chartData.received : [{ time: "Now", value: 0 }]}
                color="hsl(var(--chart-1))"
              />
              <MetricChart
                title="Posts Indexed"
                description="Successfully indexed posts over last 24 hours"
                data={chartData.indexed.length > 0 ? chartData.indexed : [{ time: "Now", value: 0 }]}
                color="hsl(var(--chart-2))"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-card border-border">
                <div className="flex items-center gap-3 mb-4">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Media Content</h3>
                    <p className="text-xs text-muted-foreground">Posts with images and video</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Images</span>
                    <span className="text-lg font-semibold text-foreground">{stats?.posts_with_images || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Videos</span>
                    <span className="text-lg font-semibold text-foreground">{stats?.posts_with_video || 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Feed Health</h3>
                    <p className="text-xs text-muted-foreground">System performance metrics</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Index Rate</span>
                    <span className="text-lg font-semibold text-chart-2">{indexRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Filter Rate</span>
                    <span className="text-lg font-semibold text-chart-3">{filterRate}%</span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <DatabaseManagement password={password} />
        )}
      </main>
    </div>
  )
}
