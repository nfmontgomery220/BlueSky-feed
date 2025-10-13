"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Database, Trash2, RefreshCw, AlertTriangle } from "lucide-react"

interface DatabaseStats {
  posts_count: number
  historical_stats_count: number
  oldest_post: string | null
  newest_post: string | null
}

interface DatabaseManagementProps {
  password: string
}

export function DatabaseManagement({ password }: DatabaseManagementProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>("")
  const [daysToKeep, setDaysToKeep] = useState(30)
  const [historyDaysToKeep, setHistoryDaysToKeep] = useState(7)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/database/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ action: "get_stats" }),
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching database stats:", error)
    }
  }

  const handleAction = async (action: string, params?: any) => {
    setLoading(true)
    setResult("")
    try {
      const response = await fetch("/api/database/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ action, params }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✓ ${data.message || "Operation completed successfully"}`)
        await fetchStats()
      } else {
        setResult(`✗ Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`✗ Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
      setShowConfirm(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDaysOld = (dateString: string | null) => {
    if (!dateString) return 0
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Database Storage</h3>
            <p className="text-sm text-muted-foreground">Monitor and manage database size</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-accent p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Total Posts</div>
            <div className="text-2xl font-bold text-foreground">{stats?.posts_count.toLocaleString() || 0}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Oldest: {formatDate(stats?.oldest_post)} ({getDaysOld(stats?.oldest_post)} days old)
            </div>
          </div>

          <div className="bg-accent p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Historical Stats</div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.historical_stats_count.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Data points collected every 30 seconds</div>
          </div>
        </div>

        <Button
          onClick={fetchStats}
          disabled={loading}
          size="sm"
          variant="outline"
          className="w-full md:w-auto bg-transparent"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Stats
        </Button>
      </Card>

      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 className="w-5 h-5 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Data Cleanup</h3>
            <p className="text-sm text-muted-foreground">Remove old data to free up space</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Delete old posts */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Delete Old Posts</h4>
            <div className="flex items-end gap-3 mb-3">
              <div className="flex-1">
                <Label htmlFor="daysToKeep" className="text-sm text-muted-foreground">
                  Keep posts from last (days)
                </Label>
                <Input
                  id="daysToKeep"
                  type="number"
                  value={daysToKeep}
                  onChange={(e) => setDaysToKeep(Number(e.target.value))}
                  min={1}
                  max={365}
                  className="mt-1"
                />
              </div>
              {showConfirm === "delete_posts" ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAction("delete_old_posts", { days: daysToKeep })}
                    disabled={loading}
                    variant="destructive"
                    size="sm"
                  >
                    Confirm Delete
                  </Button>
                  <Button onClick={() => setShowConfirm(null)} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowConfirm("delete_posts")} variant="destructive" size="sm">
                  Delete Old Posts
                </Button>
              )}
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>This will permanently delete posts older than {daysToKeep} days</span>
            </div>
          </div>

          {/* Delete old historical stats */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Delete Old Historical Stats</h4>
            <div className="flex items-end gap-3 mb-3">
              <div className="flex-1">
                <Label htmlFor="historyDaysToKeep" className="text-sm text-muted-foreground">
                  Keep history from last (days)
                </Label>
                <Input
                  id="historyDaysToKeep"
                  type="number"
                  value={historyDaysToKeep}
                  onChange={(e) => setHistoryDaysToKeep(Number(e.target.value))}
                  min={1}
                  max={90}
                  className="mt-1"
                />
              </div>
              {showConfirm === "delete_history" ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAction("delete_old_history", { days: historyDaysToKeep })}
                    disabled={loading}
                    variant="destructive"
                    size="sm"
                  >
                    Confirm Delete
                  </Button>
                  <Button onClick={() => setShowConfirm(null)} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowConfirm("delete_history")} variant="destructive" size="sm">
                  Delete Old History
                </Button>
              )}
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>This will permanently delete historical stats older than {historyDaysToKeep} days</span>
            </div>
          </div>

          {/* Optimize database */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Optimize Database</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Run after deleting data to reclaim disk space and improve performance
            </p>
            <Button onClick={() => handleAction("vacuum")} disabled={loading} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Optimize Now
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-4 text-sm bg-accent px-4 py-3 rounded-md text-foreground border border-border">
            {result}
          </div>
        )}
      </Card>
    </div>
  )
}
