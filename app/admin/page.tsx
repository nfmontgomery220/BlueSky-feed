import { AdminDashboard } from "@/components/admin-dashboard"
import { AdminNav } from "@/components/admin-nav"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  const isAuthenticated = true // In production, check session/cookie

  if (!isAuthenticated) {
    redirect("/admin/login")
  }

  return (
    <>
      <AdminNav />
      <AdminDashboard />
    </>
  )
}
