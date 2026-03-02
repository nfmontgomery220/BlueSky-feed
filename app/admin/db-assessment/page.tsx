"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, XCircle, Database, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ColumnMismatch {
  functionColumn: string
  tableColumn: string
  status: "match" | "mismatch" | "missing"
}

interface FunctionAssessment {
  name: string
  status: "working" | "broken" | "warning"
  issues: string[]
  columnMismatches: ColumnMismatch[]
}

interface TableSchema {
  name: string
  columns: { column_name: string; data_type: string; is_nullable: string }[]
}

export default function DbAssessmentPage() {
  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState<TableSchema[]>([])
  const [functions, setFunctions] = useState<FunctionAssessment[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAssessment()
  }, [])

  async function fetchAssessment() {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/admin/db-assessment")
      if (!response.ok) throw new Error("Failed to fetch assessment")
      const data = await response.json()
      setTables(data.tables)
      setFunctions(data.functions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "working":
      case "match":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "broken":
      case "mismatch":
      case "missing":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "working":
        return <Badge className="bg-green-100 text-green-800">Working</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case "broken":
        return <Badge className="bg-red-100 text-red-800">Broken</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Function Assessment
            </h1>
            <p className="text-muted-foreground">
              Analysis of database functions and schema compatibility
            </p>
          </div>
        </div>
        <Button onClick={fetchAssessment} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Critical Issues Summary */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Known Issues Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">aggregate_to_hourly Function</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-amber-900">
              <li>Uses <code className="bg-amber-100 px-1 rounded">hour_bucket</code> but table has <code className="bg-amber-100 px-1 rounded">hour</code></li>
              <li>Uses <code className="bg-amber-100 px-1 rounded">total_posts</code> but table has <code className="bg-amber-100 px-1 rounded">posts_count</code></li>
              <li>Uses <code className="bg-amber-100 px-1 rounded">posts_with_media</code> but table has <code className="bg-amber-100 px-1 rounded">posts_with_images</code></li>
              <li>Uses <code className="bg-amber-100 px-1 rounded">has_media</code> but posts table has <code className="bg-amber-100 px-1 rounded">has_images</code></li>
              <li>Uses <code className="bg-amber-100 px-1 rounded">has_links</code> but posts table has <code className="bg-amber-100 px-1 rounded">has_external_link</code></li>
              <li>References non-existent columns: <code className="bg-amber-100 px-1 rounded">avg_index_delay_seconds</code>, <code className="bg-amber-100 px-1 rounded">updated_at</code></li>
            </ul>
          </div>
          <div className="pt-4 border-t border-amber-200">
            <p className="text-sm text-amber-800 mb-2">A fix script has been prepared:</p>
            <code className="bg-amber-100 px-2 py-1 rounded text-sm block">
              scripts/fix_aggregate_functions.sql
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Table Schemas */}
      <Card>
        <CardHeader>
          <CardTitle>Table Schemas</CardTitle>
          <CardDescription>Current database table structures</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((table) => (
                <Card key={table.name} className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{table.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                      {table.columns.map((col) => (
                        <div key={col.column_name} className="flex justify-between items-center py-1 border-b last:border-0">
                          <span className="font-mono">{col.column_name}</span>
                          <span className="text-muted-foreground">{col.data_type}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Function Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Function Assessment</CardTitle>
          <CardDescription>Status of database functions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {functions.map((fn) => (
                <Card key={fn.name} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono">{fn.name}</CardTitle>
                      {getStatusBadge(fn.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {fn.issues.length > 0 && (
                      <ul className="text-sm text-red-600 space-y-1 mb-2">
                        {fn.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    )}
                    {fn.columnMismatches.length > 0 && (
                      <div className="text-xs space-y-1 mt-2 pt-2 border-t">
                        {fn.columnMismatches.map((cm, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {getStatusIcon(cm.status)}
                            <span className="font-mono">{cm.functionColumn}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-mono">{cm.tableColumn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Posts Table Date Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Posts Table - Date Fields</CardTitle>
          <CardDescription>Timestamp columns in the posts table</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div>
                <span className="font-mono text-sm">created_at</span>
                <span className="text-xs text-muted-foreground ml-2">timestamp with time zone</span>
              </div>
              <Badge>NOT NULL</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div>
                <span className="font-mono text-sm">indexed_at</span>
                <span className="text-xs text-muted-foreground ml-2">timestamp with time zone</span>
              </div>
              <Badge variant="secondary">NULLABLE</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            The <code className="bg-muted px-1 rounded">indexed_at</code> column being nullable can cause issues 
            when functions filter on this column. Records with NULL indexed_at will be excluded from aggregation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
