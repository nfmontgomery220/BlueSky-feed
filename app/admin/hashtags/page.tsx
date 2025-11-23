"use client"

import { useEffect, useState } from "react"
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Hash, TrendingUp, Users, Clock, RefreshCw } from "lucide-react"

interface HashtagStats {
  hashtag: string
  total_posts: number
  posts_last_24h: number
  posts_last_7d: number
  unique_authors: number
  last_post_at: string
}

interface Post {
  id: number
  text: string
  author_handle: string
  hashtags: string[]
  indexed_at: string
  has_images: boolean
  has_video: boolean
  has_external_link: boolean
}

export default function HashtagsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/hashtags")
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error("Failed to fetch hashtag data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !data) {
    return (
      <>
        <AdminNav />
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">Loading hashtag data...</div>
          </div>
        </div>
      </>
    )
  }

  const stats: HashtagStats[] = data.stats || []
  const recentPosts: Post[] = data.recentPosts || []

  return (
    <>
      <AdminNav />
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Hashtag Tracking</h1>
              <p className="text-muted-foreground mt-2">Monitoring #budgetbuilder and #votingpublic</p>
            </div>
            <Button onClick={fetchData} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Hashtag Statistics Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {stats.length === 0 ? (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>No Hashtags Found Yet</CardTitle>
                  <CardDescription>
                    Run the hashtag parsing script to extract hashtags from existing posts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Execute <code className="bg-muted px-2 py-1 rounded text-xs">scripts/parse-hashtags.ts</code> or run
                    the SQL script in{" "}
                    <code className="bg-muted px-2 py-1 rounded text-xs">scripts/add_hashtag_tracking.sql</code>
                  </p>
                </CardContent>
              </Card>
            ) : (
              stats.map((stat) => (
                <Card key={stat.hashtag}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="h-5 w-5" />
                      {stat.hashtag}
                    </CardTitle>
                    <CardDescription>
                      {stat.last_post_at
                        ? `Last post: ${new Date(stat.last_post_at).toLocaleString()}`
                        : "No posts yet"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{stat.total_posts}</div>
                        <div className="text-sm text-muted-foreground">Total Posts</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stat.unique_authors}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Unique Authors
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stat.posts_last_24h}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last 24 Hours
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stat.posts_last_7d}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Last 7 Days
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Latest 50 posts with tracked hashtags</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPosts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No posts found with #budgetbuilder or #votingpublic yet
                  </p>
                ) : (
                  recentPosts.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">@{post.author_handle}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(post.indexed_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{post.text}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {post.hashtags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                #{tag}
                              </Badge>
                            ))}
                            {post.has_images && <Badge variant="outline">📷 Images</Badge>}
                            {post.has_video && <Badge variant="outline">🎥 Video</Badge>}
                            {post.has_external_link && <Badge variant="outline">🔗 Link</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
