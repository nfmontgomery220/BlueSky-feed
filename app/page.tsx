"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function HomePage() {
  const [stats, setStats] = useState<{ totalIndexed: number; passRate: number } | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats")
        const data = await response.json()
        const passRate =
          data.totalIndexed + data.postsExcluded > 0
            ? (data.totalIndexed / (data.totalIndexed + data.postsExcluded)) * 100
            : 0
        setStats({ totalIndexed: data.totalIndexed, passRate })
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Civic Impact Feed</h1>
          <p className="text-lg text-muted-foreground">
            A Bluesky feed generator surfacing posts about fiscal transparency, policy impact, and civic engagement
          </p>
        </div>

        {stats && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border bg-card p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Posts Indexed</p>
                <p className="text-4xl font-semibold text-foreground">{stats.totalIndexed.toLocaleString()}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-chart-1" />
                  <p className="text-xs text-muted-foreground">Live count</p>
                </div>
              </div>
            </Card>

            <Card className="border-border bg-card p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Filter Pass Rate</p>
                <p className="text-4xl font-semibold text-foreground">{stats.passRate.toFixed(1)}%</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-chart-3" />
                  <p className="text-xs text-muted-foreground">Acceptance rate</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <Card className="border-border bg-card p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Focus Areas</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Medicare & Medicaid policy</li>
                <li>SNAP and food assistance programs</li>
                <li>Vaccination and public health</li>
                <li>Voter activation and civic engagement</li>
                <li>Fiscal transparency and budget impact</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Content Priority</h2>
              <p className="text-sm text-muted-foreground">
                Prioritizes posts with images or video links to capture visual storytelling and emotional resonance
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard">Admin Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
