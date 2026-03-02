"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, FileJson, FileSpreadsheet, FileText, Loader2, Database, Users, Hash, Calendar, BarChart3 } from "lucide-react"
import Link from "next/link"

interface ExportFilters {
  type: string
  format: string
  limit: string
  offset: string
  startDate: string
  endDate: string
  hashtag: string
  author: string
  hasMedia: string
}

export default function ExportPage() {
  const [filters, setFilters] = useState<ExportFilters>({
    type: "posts",
    format: "json",
    limit: "1000",
    offset: "0",
    startDate: "",
    endDate: "",
    hashtag: "",
    author: "",
    hasMedia: "",
  })
  
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const buildExportUrl = (forDownload = false) => {
    const params = new URLSearchParams()
    params.set("type", filters.type)
    params.set("format", forDownload ? filters.format : "json")
    params.set("limit", forDownload ? filters.limit : "10") // Preview only shows 10
    if (filters.offset && filters.offset !== "0") params.set("offset", filters.offset)
    if (filters.startDate) params.set("start_date", filters.startDate)
    if (filters.endDate) params.set("end_date", filters.endDate)
    if (filters.hashtag) params.set("hashtag", filters.hashtag)
    if (filters.author) params.set("author", filters.author)
    if (filters.hasMedia) params.set("has_media", filters.hasMedia)
    
    return `/api/admin/export?${params.toString()}`
  }

  const handlePreview = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(buildExportUrl(false))
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch preview")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const url = buildExportUrl(true)
      
      if (filters.format === "json") {
        // For JSON, fetch and create blob
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        downloadBlob(blob, `${filters.type}_export_${Date.now()}.json`)
      } else {
        // For CSV/JSONL, direct download
        window.location.href = url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download")
    } finally {
      setLoading(false)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportTypes = [
    { value: "posts", label: "Posts", icon: FileText, description: "All indexed posts with full metadata" },
    { value: "hourly_stats", label: "Hourly Stats", icon: BarChart3, description: "Aggregated hourly statistics" },
    { value: "daily_stats", label: "Daily Stats", icon: Calendar, description: "Aggregated daily statistics" },
    { value: "hashtags", label: "Hashtags", icon: Hash, description: "Hashtag counts and trends" },
    { value: "authors", label: "Authors", icon: Users, description: "Author statistics and activity" },
    { value: "all", label: "Full Export", icon: Database, description: "Complete data summary" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex h-14 items-center px-4">
          <Link href="/admin" className="font-semibold text-foreground hover:text-foreground/80">
            Admin Dashboard
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-muted-foreground">Data Export</span>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Data Export</h1>
          <p className="mt-2 text-muted-foreground">
            Export feed data in JSON, CSV, or JSONL format for analysis and backup
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Export Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Type</CardTitle>
                <CardDescription>Select the data you want to export</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {exportTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFilters(f => ({ ...f, type: type.value }))}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      filters.type === type.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <type.icon className={`h-5 w-5 mt-0.5 ${filters.type === type.value ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Format & Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select value={filters.format} onValueChange={(v) => setFilters(f => ({ ...f, format: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          JSON
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          CSV
                        </div>
                      </SelectItem>
                      <SelectItem value="jsonl">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          JSON Lines
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Limit</Label>
                    <Input
                      type="number"
                      value={filters.limit}
                      onChange={(e) => setFilters(f => ({ ...f, limit: e.target.value }))}
                      placeholder="1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Offset</Label>
                    <Input
                      type="number"
                      value={filters.offset}
                      onChange={(e) => setFilters(f => ({ ...f, offset: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {filters.type === "posts" && (
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>Filter posts by various criteria</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Hashtag</Label>
                    <Input
                      value={filters.hashtag}
                      onChange={(e) => setFilters(f => ({ ...f, hashtag: e.target.value }))}
                      placeholder="e.g. vote"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Author Handle</Label>
                    <Input
                      value={filters.author}
                      onChange={(e) => setFilters(f => ({ ...f, author: e.target.value }))}
                      placeholder="e.g. user.bsky.social"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Media Filter</Label>
                    <Select value={filters.hasMedia} onValueChange={(v) => setFilters(f => ({ ...f, hasMedia: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All posts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All posts</SelectItem>
                        <SelectItem value="true">Has any media</SelectItem>
                        <SelectItem value="images">Has images</SelectItem>
                        <SelectItem value="video">Has video</SelectItem>
                        <SelectItem value="links">Has external links</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button onClick={handlePreview} variant="outline" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Preview
              </Button>
              <Button onClick={handleDownload} className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                      {preview ? `Showing ${preview.records?.length || Object.keys(preview).length} of ${preview.total_records || "?"} records` : "Click preview to see data"}
                    </CardDescription>
                  </div>
                  {preview && (
                    <Badge variant="secondary">
                      {filters.type.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">
                    {error}
                  </div>
                )}
                
                {preview ? (
                  <Tabs defaultValue="formatted">
                    <TabsList>
                      <TabsTrigger value="formatted">Formatted</TabsTrigger>
                      <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                    </TabsList>
                    <TabsContent value="formatted">
                      <ScrollArea className="h-[600px] rounded-md border">
                        <div className="p-4">
                          {preview.records ? (
                            <div className="space-y-4">
                              {preview.records.map((record: any, i: number) => (
                                <div key={i} className="rounded-lg border p-4">
                                  <PreviewRecord record={record} type={filters.type} />
                                </div>
                              ))}
                            </div>
                          ) : filters.type === "all" ? (
                            <AllExportPreview data={preview} />
                          ) : (
                            <pre className="text-sm">{JSON.stringify(preview, null, 2)}</pre>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="raw">
                      <ScrollArea className="h-[600px] rounded-md border bg-muted/50">
                        <pre className="p-4 text-xs font-mono">
                          {JSON.stringify(preview, null, 2)}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex h-[600px] items-center justify-center rounded-md border border-dashed">
                    <div className="text-center">
                      <FileJson className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        Configure your export and click Preview
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewRecord({ record, type }: { record: any; type: string }) {
  if (type === "posts") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">@{record.author_handle}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(record.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-sm">{record.text}</p>
        <div className="flex flex-wrap gap-1">
          {record.has_images && <Badge variant="outline" className="text-xs">Images</Badge>}
          {record.has_video && <Badge variant="outline" className="text-xs">Video</Badge>}
          {record.has_external_link && <Badge variant="outline" className="text-xs">Link</Badge>}
          {record.hashtags?.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
          ))}
        </div>
      </div>
    )
  }
  
  if (type === "hashtags") {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">#{record.tag}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{record.count} posts</span>
          <span>Score: {record.trend_score?.toFixed(2)}</span>
        </div>
      </div>
    )
  }
  
  if (type === "authors") {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">@{record.author_handle}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{record.post_count} posts</span>
          <span>Relevance: {(record.avg_relevance * 100).toFixed(0)}%</span>
        </div>
      </div>
    )
  }
  
  if (type === "hourly_stats" || type === "daily_stats") {
    const dateKey = type === "hourly_stats" ? "hour" : "date"
    return (
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {new Date(record[dateKey]).toLocaleString()}
        </span>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{record.posts_count} posts</span>
          <span>{record.unique_authors} authors</span>
        </div>
      </div>
    )
  }
  
  return <pre className="text-xs">{JSON.stringify(record, null, 2)}</pre>
}

function AllExportPreview({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {data.summary && (
        <div>
          <h3 className="font-semibold mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-muted-foreground">Total Posts</div>
              <div className="font-semibold">{parseInt(data.summary.total_posts).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-muted-foreground">Unique Authors</div>
              <div className="font-semibold">{parseInt(data.summary.unique_authors).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
      
      {data.top_hashtags && (
        <div>
          <h3 className="font-semibold mb-2">Top Hashtags</h3>
          <div className="flex flex-wrap gap-2">
            {data.top_hashtags.slice(0, 10).map((h: any) => (
              <Badge key={h.tag} variant="secondary">
                #{h.tag} ({h.count})
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {data.recent_posts && (
        <div>
          <h3 className="font-semibold mb-2">Recent Posts Sample</h3>
          <div className="space-y-2">
            {data.recent_posts.slice(0, 5).map((post: any, i: number) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">@{post.author_handle}</div>
                <p className="text-muted-foreground line-clamp-2">{post.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
