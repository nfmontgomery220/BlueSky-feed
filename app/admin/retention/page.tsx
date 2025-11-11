"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Database, Trash2, Archive, CheckCircle2, AlertCircle } from "lucide-react"
import { runRetentionJobAction } from "./actions"

export default function RetentionPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runRetentionJob = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await runRetentionJobAction()

      if (!data.success) {
        throw new Error(data.error || "Failed to run retention job")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run retention job")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Retention Management</h1>
          <p className="text-muted-foreground">Manage your database storage with the multi-tier retention strategy</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Retention Strategy Overview
            </CardTitle>
            <CardDescription>Automatic data lifecycle management for cost optimization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Hot Storage</span>
                </div>
                <p className="text-sm text-muted-foreground">Detailed posts kept for 7 days for recent analysis</p>
                <Badge variant="outline">~150K posts</Badge>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Warm Storage</span>
                </div>
                <p className="text-sm text-muted-foreground">Hourly aggregates for 30 days for trend analysis</p>
                <Badge variant="outline">~720 hours</Badge>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Cold Storage</span>
                </div>
                <p className="text-sm text-muted-foreground">Daily summaries kept indefinitely for long-term trends</p>
                <Badge variant="outline">Forever</Badge>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-medium">How It Works</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Posts older than 7 days are aggregated to hourly statistics</li>
                <li>Hourly stats older than 30 days are aggregated to daily statistics</li>
                <li>Original detailed posts are deleted after aggregation</li>
                <li>Database is vacuumed to reclaim space</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={runRetentionJob} disabled={loading} className="flex items-center gap-2">
                {loading ? <Spinner className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                {loading ? "Running..." : "Run Retention Job Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Job Completed Successfully
              </CardTitle>
              <CardDescription>Executed at {new Date(result.timestamp).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Hours Aggregated</div>
                  <div className="text-2xl font-bold">{result.hoursAggregated}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Days Aggregated</div>
                  <div className="text-2xl font-bold">{result.daysAggregated}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Posts Deleted</div>
                  <div className="text-2xl font-bold">{result.postsDeleted.toLocaleString()}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Hourly Stats Deleted</div>
                  <div className="text-2xl font-bold">{result.hourlyStatsDeleted.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>Configure automatic retention in production</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">1. Run the Database Setup Script</h3>
              <p className="text-sm text-muted-foreground">
                Execute <code className="bg-muted px-1 rounded">scripts/create_retention_tables.sql</code> to create the
                necessary tables and functions
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">2. Set Up Vercel Cron Job</h3>
              <p className="text-sm text-muted-foreground">
                In your Vercel project settings, add a Cron Job:
                <br />
                <code className="bg-muted px-1 rounded">Path: /api/cron/retention</code>
                <br />
                <code className="bg-muted px-1 rounded">Schedule: 0 2 * * *</code> (daily at 2 AM)
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">3. Storage Savings</h3>
              <p className="text-sm text-muted-foreground">
                Expected reduction: ~90% database size while maintaining full analytics capabilities for 30+ days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
