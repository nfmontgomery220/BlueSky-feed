"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { testBlueskyConnection } from "@/app/admin/debug/actions"

export function DebugConnection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<string[]>([])

  async function runTest() {
    setStatus("loading")
    setLogs([])
    setMessage("")

    try {
      const result = await testBlueskyConnection()
      setLogs(result.logs)
      if (result.success) {
        setStatus("success")
        setMessage(result.message)
      } else {
        setStatus("error")
        setMessage(result.message)
      }
    } catch (error) {
      setStatus("error")
      setMessage("Failed to run test")
      setLogs((prev) => [...prev, `Client error: ${error}`])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={runTest} disabled={status === "loading"}>
          {status === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Test Connection Now
        </Button>
        {status === "success" && (
          <div className="flex items-center text-green-600">
            <CheckCircle2 className="mr-2 h-5 w-5" />
            <span>Success</span>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center text-red-600">
            <XCircle className="mr-2 h-5 w-5" />
            <span>Failed</span>
          </div>
        )}
      </div>

      {message && (
        <Alert variant={status === "success" ? "default" : "destructive"}>
          <AlertTitle>{status === "success" ? "Connected" : "Connection Error"}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {logs.length > 0 && (
        <div className="mt-4 rounded-md bg-muted p-4 font-mono text-xs">
          <div className="mb-2 font-semibold text-muted-foreground">Execution Logs:</div>
          {logs.map((log, i) => (
            <div key={i} className="border-b border-muted-foreground/10 py-1 last:border-0">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
