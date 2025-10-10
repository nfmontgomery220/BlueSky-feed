"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogEntry } from "@/lib/connection-logger"

export function ConnectionLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/logs?limit=50")
      if (!response.ok) return
      const data = await response.json()
      setLogs(data.logs)
    } catch (error) {
      console.error("Error fetching logs:", error)
    }
  }

  const clearLogs = async () => {
    try {
      await fetch("/api/logs", { method: "DELETE" })
      setLogs([])
    } catch (error) {
      console.error("Error clearing logs:", error)
    }
  }

  useEffect(() => {
    fetchLogs()
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000) // Refresh every 2 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-400"
      case "warning":
        return "text-yellow-400"
      case "success":
        return "text-green-400"
      default:
        return "text-blue-400"
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Connection Logs</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] w-full rounded border bg-black/20 p-4">
        <div className="space-y-2 font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No logs yet. Connect to firehose to see activity.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`shrink-0 font-semibold ${getLevelColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="text-foreground">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
