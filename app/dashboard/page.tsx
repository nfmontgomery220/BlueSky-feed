"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PublishFeedDialog } from "@/components/publish-feed-dialog"
import type { FeedStats } from "@/lib/types"

export default function DashboardPage() {
  const [stats, setStats] = useState<FeedStats | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [firehoseStatus, setFirehoseStatus] = useState<{ connected: boolean; reconnectAttempts: number } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)

  const fetchStats = async () => {
    const response = await fetch("/api/stats")
    const data = await response.json()
    setStats(data)
    setDbConnected(data.totalIndexed !== undefined)
  }

  const fetchFirehoseStatus = async () => {
    const response = await fetch("/api/firehose")
    const data = await response.json()
    setFirehoseStatus(data)
  }

  const toggleFirehose = async () => {
    setIsConnecting(true)
    const action = firehoseStatus?.connected ? "disconnect" : "connect"
    await fetch("/api/firehose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    await fetchFirehoseStatus()
    setIsConnecting(false)
  }

  const simulatePosts = async (count: number) => {
    setIsSimulating(true)
    await fetch("/api/simulate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    })
    await fetchStats()
    setIsSimulating(false)
  }

  useEffect(() => {
    fetchStats()
    fetchFirehoseStatus()
    const interval = setInterval(() => {
      fetchStats()
      fetchFirehoseStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Civic Impact Feed</h1>
            <p className="mt-1 text-sm text-muted-foreground">Monitor your Bluesky feed generator performance</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowPublishDialog(!showPublishDialog)} variant="outline">
              {showPublishDialog ? "Hide Publisher" : "Publish Feed"}
            </Button>
            <Button
              onClick={toggleFirehose}
              disabled={isConnecting}
              variant={firehoseStatus?.connected ? "destructive" : "default"}
            >
              {isConnecting
                ? "Connecting..."
                : firehoseStatus?.connected
                  ? "Disconnect Firehose"
                  : "Connect to Firehose"}
            </Button>
            <Button onClick={() => simulatePosts(10)} disabled={isSimulating} variant="outline">
              {isSimulating ? "Simulating..." : "Simulate 10"}
            </Button>
          </div>
        </div>

        {/* Publish Feed Dialog */}
        {showPublishDialog && <PublishFeedDialog onPublished={() => setShowPublishDialog(false)} />}

        {/* Database Connection Status Card */}
        <Card className="border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Database Connection</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dbConnected
                  ? "✓ Connected to Neon PostgreSQL - all tables created and ready"
                  : "Connecting to database..."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${dbConnected ? "bg-chart-3" : "bg-muted-foreground"}`} />
              <span className="text-sm font-medium text-foreground">{dbConnected ? "Ready" : "Connecting"}</span>
            </div>
          </div>
        </Card>

        {/* Firehose Connection */}
        <Card className="border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Firehose Connection</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {firehoseStatus?.connected
                  ? "Connected to Bluesky Jetstream - receiving real-time posts"
                  : "Not connected - use simulation mode or connect to start indexing"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${firehoseStatus?.connected ? "bg-chart-3" : "bg-muted-foreground"}`}
              />
              <span className="text-sm font-medium text-foreground">
                {firehoseStatus?.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Indexed</p>
              <p className="text-3xl font-semibold text-foreground">{stats.totalIndexed.toLocaleString()}</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-1" />
                <p className="text-xs text-muted-foreground">Posts processed</p>
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Posts with Media</p>
              <p className="text-3xl font-semibold text-foreground">{stats.postsWithMedia.toLocaleString()}</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-3" />
                <p className="text-xs text-muted-foreground">
                  {stats.totalIndexed > 0
                    ? `${((stats.postsWithMedia / stats.totalIndexed) * 100).toFixed(1)}% of total`
                    : "0% of total"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Posts Excluded</p>
              <p className="text-3xl font-semibold text-foreground">{stats.postsExcluded.toLocaleString()}</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-5" />
                <p className="text-xs text-muted-foreground">Filtered out</p>
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Pass Rate</p>
              <p className="text-3xl font-semibold text-foreground">
                {stats.totalIndexed + stats.postsExcluded > 0
                  ? `${((stats.totalIndexed / (stats.totalIndexed + stats.postsExcluded)) * 100).toFixed(1)}%`
                  : "0%"}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-2" />
                <p className="text-xs text-muted-foreground">Acceptance rate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Feed Configuration */}
        <Card className="border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Feed Configuration</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Target Topics</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Medicare, Medicaid, SNAP, vaccinations, voter activation, fiscal transparency
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Content Priority</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Posts with images or video links (visual storytelling)
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Exclusions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commercial products, non-civic domains, unrelated content
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Last Updated</p>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(stats.lastUpdated).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Status */}
        <Card className="border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Feed Status</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dbConnected
                  ? "Ready to index posts - connect to firehose or use simulation mode"
                  : "Initializing database connection..."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${dbConnected ? "bg-chart-3" : "bg-muted-foreground"}`} />
              <span className="text-sm font-medium text-foreground">{dbConnected ? "Ready" : "Initializing"}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
