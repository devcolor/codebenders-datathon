import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { NavHeader } from "@/components/nav-header"
import { createClient } from "@/lib/supabase/server"
import type { Role } from "@/lib/roles"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Bishop State Student Success Dashboard",
  description: "AI-Powered Student Success Analytics & Predictive Models for Bishop State Community College",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: Role | null = null
  if (user) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single()
    role = (data?.role ?? "leadership") as Role
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {user && role && (
          <NavHeader email={user.email ?? ""} role={role} />
        )}
        {children}
      </body>
    </html>
  )
}
