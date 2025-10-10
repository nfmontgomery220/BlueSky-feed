export type LogLevel = "info" | "warning" | "error" | "success"

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  details?: any
}

class ConnectionLogger {
  private logs: LogEntry[] = []
  private maxLogs = 500 // Keep last 500 log entries

  log(level: LogLevel, message: string, details?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    }

    this.logs.unshift(entry) // Add to beginning

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Also log to console for server-side debugging
    const prefix = `[v0 ${level.toUpperCase()}]`
    if (level === "error") {
      console.error(prefix, message, details || "")
    } else if (level === "warning") {
      console.warn(prefix, message, details || "")
    } else {
      console.log(prefix, message, details || "")
    }
  }

  getLogs(limit?: number): LogEntry[] {
    return limit ? this.logs.slice(0, limit) : this.logs
  }

  clear(): void {
    this.logs = []
    this.log("info", "Logs cleared")
  }
}

export const connectionLogger = new ConnectionLogger()
