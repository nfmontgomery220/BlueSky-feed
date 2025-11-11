import { AdminDashboard } from "@/components/admin-dashboard"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  const isAuthenticated = true // In production, check session/cookie

  if (!isAuthenticated) {
    redirect("/admin/login")
  }

  return <AdminDashboard />
}
