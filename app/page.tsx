import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">Bluesky Feed Generator</h1>
            <p className="text-lg md:text-xl text-muted-foreground text-balance">
              Custom algorithmic feed for Bluesky social network
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card>
              <CardHeader>
                <CardTitle>About This Feed</CardTitle>
                <CardDescription>A curated feed powered by custom algorithms</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This feed generator indexes and filters posts from the Bluesky network, providing a custom algorithmic
                  timeline based on specific criteria.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How to Use</CardTitle>
                <CardDescription>Add this feed to your Bluesky client</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Search for this feed in your Bluesky app or copy the feed URL to subscribe and see curated content in
                  your timeline.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Access */}
          <div className="text-center mt-12">
            <Card className="inline-block">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-4">Feed administrator?</p>
                <Button asChild>
                  <Link href="/admin">Access Admin Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-muted-foreground mt-16 space-y-2">
            <p>Powered by Bluesky AT Protocol</p>
            <p className="text-xs">Feed service running on {process.env.FEEDGEN_HOSTNAME || "custom domain"}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
