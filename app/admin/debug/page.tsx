import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminNav } from "@/components/admin-nav"
import { DebugConnection } from "@/components/debug-connection"

export default function DebugPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
        <div className="flex flex-1 items-center gap-4">
          <h1 className="font-semibold text-lg">System Debug</h1>
        </div>
        <AdminNav />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Bluesky Connection Test</CardTitle>
              <CardDescription>Verify your credentials and firehose connection immediately.</CardDescription>
            </CardHeader>
            <CardContent>
              <DebugConnection />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
