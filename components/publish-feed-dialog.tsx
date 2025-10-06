"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"

interface PublishFeedDialogProps {
  onPublished?: (uri: string) => void
}

export function PublishFeedDialog({ onPublished }: PublishFeedDialogProps) {
  const [handle, setHandle] = useState("")
  const [password, setPassword] = useState("")
  const [serviceDid, setServiceDid] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [publishedUri, setPublishedUri] = useState<string | null>(null)

  const handlePublish = async () => {
    setIsPublishing(true)
    setMessage(null)

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          handle,
          password,
          serviceDid,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: "success", text: data.message })
        setPublishedUri(data.uri)
        onPublished?.(data.uri)
      } else {
        setMessage({ type: "error", text: data.message })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to publish feed. Please try again." })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this feed?")) {
      return
    }

    setIsPublishing(true)
    setMessage(null)

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          handle,
          password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: "success", text: data.message })
        setPublishedUri(null)
      } else {
        setMessage({ type: "error", text: data.message })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete feed. Please try again." })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <Card className="border-border bg-card p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Publish Feed to Bluesky</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish your feed generator to make it discoverable on Bluesky
          </p>
        </div>

        {message && (
          <Alert className={message.type === "error" ? "border-destructive bg-destructive/10" : "border-chart-3"}>
            <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-chart-3"}`}>
              {message.text}
            </p>
          </Alert>
        )}

        {publishedUri && (
          <Alert className="border-chart-3 bg-chart-3/10">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Feed Published!</p>
              <p className="text-xs text-muted-foreground">URI: {publishedUri}</p>
              <p className="text-xs text-muted-foreground">
                Users can now find and subscribe to your feed on Bluesky by searching for "
                {publishedUri.split("/").pop()}"
              </p>
            </div>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handle" className="text-foreground">
              Bluesky Handle
            </Label>
            <Input
              id="handle"
              type="text"
              placeholder="username.bsky.social"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Your full Bluesky handle (e.g., username.bsky.social) - do NOT include the @ symbol
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              App Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Create an app password in your Bluesky settings (Settings → App Passwords)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceDid" className="text-foreground">
              Service DID
            </Label>
            <Input
              id="serviceDid"
              type="text"
              placeholder="did:web:your-domain.com"
              value={serviceDid}
              onChange={(e) => setServiceDid(e.target.value)}
              className="bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Your feed generator's DID (e.g., did:web:feed.yourdomain.com)
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePublish} disabled={isPublishing || !handle || !password || !serviceDid}>
            {isPublishing ? "Publishing..." : publishedUri ? "Update Feed" : "Publish Feed"}
          </Button>
          {publishedUri && (
            <Button onClick={handleDelete} disabled={isPublishing} variant="destructive">
              {isPublishing ? "Deleting..." : "Delete Feed"}
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Setup Instructions</h3>
          <ol className="space-y-2 text-xs text-muted-foreground">
            <li>1. Deploy this feed generator to a public server (e.g., Vercel, Railway)</li>
            <li>2. Set up a domain or subdomain for your feed (e.g., feed.yourdomain.com)</li>
            <li>3. Create a DID for your service (did:web:feed.yourdomain.com)</li>
            <li>4. Create an app password in your Bluesky settings</li>
            <li>5. Fill in the form above and click "Publish Feed"</li>
            <li>6. Your feed will be discoverable on Bluesky!</li>
          </ol>
        </div>
      </div>
    </Card>
  )
}
