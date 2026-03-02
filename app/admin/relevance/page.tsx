"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Trash2, Save, RefreshCw, Users, Hash, FileText, Settings } from "lucide-react"
import Link from "next/link"

interface Keyword {
  id: number
  keyword: string
  category: string
  weight: number
  is_hashtag: boolean
  created_at: string
}

interface ScoringConfig {
  category: string
  weight: number
  description: string
}

interface AuthorTrust {
  author_did: string
  trust_score: number
  posts_count: number
  avg_relevance: number
  last_updated: string
}

export default function RelevanceAdminPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [config, setConfig] = useState<ScoringConfig[]>([])
  const [topAuthors, setTopAuthors] = useState<AuthorTrust[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"keywords" | "weights" | "authors">("keywords")
  
  // New keyword form
  const [newKeyword, setNewKeyword] = useState("")
  const [newCategory, setNewCategory] = useState("keyword")
  const [newWeight, setNewWeight] = useState("1.0")
  const [newIsHashtag, setNewIsHashtag] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/relevance")
      if (response.ok) {
        const data = await response.json()
        setKeywords(data.keywords || [])
        setConfig(data.config || [])
        setTopAuthors(data.topAuthors || [])
      }
    } catch (error) {
      console.error("Failed to fetch relevance data:", error)
    }
    setLoading(false)
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return
    setSaving(true)
    try {
      const response = await fetch("/api/admin/relevance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_keyword",
          keyword: newKeyword.trim().toLowerCase(),
          category: newCategory,
          weight: parseFloat(newWeight),
          is_hashtag: newIsHashtag
        })
      })
      if (response.ok) {
        setNewKeyword("")
        setNewWeight("1.0")
        setNewIsHashtag(false)
        fetchData()
      }
    } catch (error) {
      console.error("Failed to add keyword:", error)
    }
    setSaving(false)
  }

  async function deleteKeyword(id: number) {
    try {
      await fetch("/api/admin/relevance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_keyword", id })
      })
      fetchData()
    } catch (error) {
      console.error("Failed to delete keyword:", error)
    }
  }

  async function updateWeight(category: string, weight: number) {
    try {
      await fetch("/api/admin/relevance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_weight", category, weight })
      })
      fetchData()
    } catch (error) {
      console.error("Failed to update weight:", error)
    }
  }

  const keywordsByCategory = keywords.reduce((acc, kw) => {
    if (!acc[kw.category]) acc[kw.category] = []
    acc[kw.category].push(kw)
    return acc
  }, {} as Record<string, Keyword[]>)

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relevance Scoring</h1>
          <p className="text-muted-foreground">Configure keywords, weights, and view trusted authors</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("keywords")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === "keywords" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          <FileText className="h-4 w-4" />
          Keywords
        </button>
        <button
          onClick={() => setActiveTab("weights")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === "weights" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          <Settings className="h-4 w-4" />
          Weights
        </button>
        <button
          onClick={() => setActiveTab("authors")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === "authors" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          <Users className="h-4 w-4" />
          Trusted Authors
        </button>
        <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Keywords Tab */}
          {activeTab === "keywords" && (
            <div className="space-y-6">
              {/* Add New Keyword */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add New Keyword</CardTitle>
                  <CardDescription>Add keywords or hashtags to the relevance dictionary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="md:col-span-2">
                      <Label>Keyword/Hashtag</Label>
                      <Input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="e.g., budget, #vote2024"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="keyword">Keyword (text match)</option>
                        <option value="hashtag">Hashtag</option>
                        <option value="high_priority">High Priority</option>
                      </select>
                    </div>
                    <div>
                      <Label>Weight (0.1 - 3.0)</Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="3.0"
                        step="0.1"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addKeyword} disabled={saving || !newKeyword.trim()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords by Category */}
              {Object.entries(keywordsByCategory).map(([category, kws]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize flex items-center gap-2">
                      {category === "hashtag" ? <Hash className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      {category.replace("_", " ")}
                      <Badge variant="secondary" className="ml-2">{kws.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {kws.map((kw) => (
                        <Badge 
                          key={kw.id} 
                          variant="outline" 
                          className="px-3 py-1.5 flex items-center gap-2"
                        >
                          <span>{kw.is_hashtag ? "#" : ""}{kw.keyword}</span>
                          <span className="text-xs text-muted-foreground">({kw.weight}x)</span>
                          <button
                            onClick={() => deleteKeyword(kw.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {keywords.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Keywords Yet</h3>
                    <p className="text-muted-foreground">Add keywords above to start building your relevance dictionary.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Weights Tab */}
          {activeTab === "weights" && (
            <div className="grid gap-6 md:grid-cols-2">
              {config.map((cfg) => (
                <Card key={cfg.category}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">{cfg.category.replace("_", " ")}</CardTitle>
                    <CardDescription>{cfg.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Weight: {cfg.weight}x</Label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={cfg.weight}
                          onChange={(e) => updateWeight(cfg.category, parseFloat(e.target.value))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>How Scoring Works</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>The relevance score is calculated using a weighted combination of three categories:</p>
                  <ol>
                    <li><strong>Keyword Score</strong> - Text matches against your keyword dictionary</li>
                    <li><strong>Hashtag Score</strong> - Matches against tracked hashtags</li>
                    <li><strong>Author Trust</strong> - Built over time based on their posts' relevance (tiebreaker)</li>
                  </ol>
                  <p>Final score = (keyword_score × weight) + (hashtag_score × weight) + (author_trust × weight)</p>
                  <p>Posts with a relevance score above 0.3 will boost the author's trust score over time.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Trusted Authors Tab */}
          {activeTab === "authors" && (
            <Card>
              <CardHeader>
                <CardTitle>Top Trusted Authors</CardTitle>
                <CardDescription>Authors ranked by their trust score (built from post relevance over time)</CardDescription>
              </CardHeader>
              <CardContent>
                {topAuthors.length > 0 ? (
                  <div className="space-y-3">
                    {topAuthors.map((author, i) => (
                      <div key={author.author_did} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
                          <div>
                            <p className="font-mono text-sm truncate max-w-[300px]">{author.author_did}</p>
                            <p className="text-xs text-muted-foreground">
                              {author.posts_count} posts | Avg relevance: {(author.avg_relevance * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{(author.trust_score * 100).toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">Trust Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Trusted Authors Yet</h3>
                    <p className="text-muted-foreground max-w-md">
                      Author trust scores are built automatically over time based on the relevance of their posts.
                      As posts are indexed with high relevance scores, their authors' trust will increase.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  )
}
