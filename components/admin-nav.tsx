"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Hash, Database } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminNav() {
  const pathname = usePathname()

  const links = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      href: "/admin/hashtags",
      label: "Hashtags",
      icon: Hash,
    },
    {
      href: "/admin/retention",
      label: "Data Retention",
      icon: Database,
    },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex h-14 items-center gap-6">
          <Link href="/admin" className="font-semibold text-lg">
            Admin
          </Link>
          <div className="flex gap-1">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
