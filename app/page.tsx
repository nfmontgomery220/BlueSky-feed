import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Civic Impact Feed</h1>
          <p className="text-lg text-muted-foreground">
            A Bluesky feed generator surfacing posts about fiscal transparency, policy impact, and civic engagement
          </p>
        </div>

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
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Development Mode:</strong> This feed generator is currently using in-memory storage. Use the
            dashboard to simulate posts and test the filtering logic.
          </p>
        </div>
      </div>
    </div>
  )
}
