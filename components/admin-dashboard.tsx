"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Activity, Database, Users, ImageIcon, Video, Link, TrendingUp, HardDrive, AlertCircle } from "lucide-react"

interface Stats {
  currentStats: {
    total_posts_indexed: string
    total_posts_received: string
    posts_with_images: string
    posts_with_video: string
    posts_filtered_out: string
    last_updated: string
  } | null
  postStats: {
    total_posts: string
    posts_with_images: string
    posts_with_video: string
    posts_with_links: string
    unique_authors: string
    oldest_post: string
    newest_post: string
  } | null
  historicalStats: Array<{
    id: number
    total_posts_indexed: string
    total_posts_received: string
    posts_with_images: string
    posts_with_video: string
    posts_filtered_out: string
    recorded_at: string
  }>
  recentPosts: Array<{
    id: number
    author_handle: string
    text: string
    created_at: string
    has_images: boolean
    has_video: boolean
    has_external_link: boolean
    external_domain: string | null
  }>
  trafficMetrics: Array<{
    hour: string
    posts_count: string
  }>
  retentionMetrics: {
    active_posts: string
    hourly_stats: string
    daily_stats: string
    oldest_active_post: string
    oldest_hourly_stat: string
    oldest_daily_stat: string
  } | null
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (!response.ok) throw new Error("Failed to fetch stats")
      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const currentStats = stats?.currentStats
  const postStats = stats?.postStats
  const retentionMetrics = stats?.retentionMetrics
  const filterRate = currentStats
    ? ((Number(currentStats.posts_filtered_out) / Number(currentStats.total_posts_received)) * 100).toFixed(1)
    : "0"
  const indexRate = currentStats
    ? ((Number(currentStats.total_posts_indexed) / Number(currentStats.total_posts_received)) * 100).toFixed(1)
    : "0"

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bluesky Feed Dashboard</h1>
          <p className="text-muted-foreground">Monitor your feed statistics and traffic in real-time</p>
          {currentStats && (
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date(currentStats.last_updated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Warning Banner if retention tables don't exist */}
        {!retentionMetrics && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                <AlertCircle className="h-5 w-5" />
                Data Retention Not Configured
              </CardTitle>
              <CardDescription>
                Run the SQL script in{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">scripts/create_retention_tables.sql</code> to
                enable the data retention strategy. Then visit{" "}
                <a href="/admin/retention" className="underline hover:text-primary">
                  /admin/retention
                </a>{" "}
                to manage your data lifecycle.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts Received</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats?.total_posts_received?.toLocaleString() || "0"}</div>
              <p className="text-xs text-muted-foreground">
                {currentStats?.total_posts_indexed?.toLocaleString() || "0"} indexed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Index Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{indexRate}%</div>
              <p className="text-xs text-muted-foreground">
                {currentStats?.posts_filtered_out?.toLocaleString() || "0"} filtered out
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Authors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{postStats?.unique_authors?.toLocaleString() || "0"}</div>
              <p className="text-xs text-muted-foreground">
                {postStats?.total_posts?.toLocaleString() || "0"} total posts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Posts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-lg font-bold">{currentStats?.posts_with_images?.toLocaleString() || "0"}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Images
                  </p>
                </div>
                <div>
                  <div className="text-lg font-bold">{currentStats?.posts_with_video?.toLocaleString() || "0"}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Video className="h-3 w-3" /> Videos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Retention Metrics */}
        {retentionMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Data Retention Strategy
              </CardTitle>
              <CardDescription>Multi-tier storage efficiency metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Hot Storage (7 days)</div>
                  <div className="text-2xl font-bold">{Number(retentionMetrics.active_posts).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Detailed posts since{" "}
                    {retentionMetrics.oldest_active_post
                      ? new Date(retentionMetrics.oldest_active_post).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Warm Storage (30 days)</div>
                  <div className="text-2xl font-bold">{Number(retentionMetrics.hourly_stats).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Hourly aggregates since{" "}
                    {retentionMetrics.oldest_hourly_stat
                      ? new Date(retentionMetrics.oldest_hourly_stat).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Cold Storage (Forever)</div>
                  <div className="text-2xl font-bold">{Number(retentionMetrics.daily_stats).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Daily summaries since{" "}
                    {retentionMetrics.oldest_daily_stat
                      ? new Date(retentionMetrics.oldest_daily_stat).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Storage Strategy:</span> Detailed posts kept for 7 days, then aggregated
                  to hourly stats for 30 days, then archived as daily summaries indefinitely. This provides full
                  analytics with ~90% storage reduction.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Traffic Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>24-Hour Traffic</CardTitle>
            <CardDescription>Posts indexed per hour</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.trafficMetrics && stats.trafficMetrics.length > 0 ? (
              <div className="space-y-2">
                {stats.trafficMetrics.map((metric) => (
                  <div key={metric.hour} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{new Date(metric.hour).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 bg-primary rounded-full"
                        style={{ width: `${Math.min(Number(metric.posts_count) / 10, 100)}px` }}
                      />
                      <span className="text-sm font-medium">{metric.posts_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No traffic data in the last 24 hours</p>
            )}
          </CardContent>
        </Card>

        {/* Historical Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Statistics</CardTitle>
            <CardDescription>Recent snapshots from feed_stats_history</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.historicalStats && stats.historicalStats.length > 0 ? (
              <div className="space-y-4">
                {stats.historicalStats.slice(0, 10).map((stat) => (
                  <div key={stat.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{new Date(stat.recorded_at).toLocaleString()}</span>
                      <Badge variant="outline">
                        {((Number(stat.total_posts_indexed) / Number(stat.total_posts_received)) * 100).toFixed(1)}%
                        indexed
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>Received: {stat.total_posts_received?.toLocaleString()}</div>
                      <div>Indexed: {stat.total_posts_indexed?.toLocaleString()}</div>
                      <div>Images: {stat.posts_with_images?.toLocaleString()}</div>
                      <div>Videos: {stat.posts_with_video?.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No historical data available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Latest 10 posts indexed</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentPosts && stats.recentPosts.length > 0 ? (
              <div className="space-y-4">
                {stats.recentPosts.map((post) => (
                  <div key={post.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-medium text-sm">@{post.author_handle}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{post.text}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.has_images && (
                        <Badge variant="secondary" className="text-xs">
                          <ImageIcon className="h-3 w-3 mr-1" /> Images
                        </Badge>
                      )}
                      {post.has_video && (
                        <Badge variant="secondary" className="text-xs">
                          <Video className="h-3 w-3 mr-1" /> Video
                        </Badge>
                      )}
                      {post.has_external_link && (
                        <Badge variant="secondary" className="text-xs">
                          <Link className="h-3 w-3 mr-1" /> {post.external_domain || "Link"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent posts available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
