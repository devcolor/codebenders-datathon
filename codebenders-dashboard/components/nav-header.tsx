"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"
import { ROLE_COLORS, ROLE_LABELS, type Role } from "@/lib/roles"

interface NavHeaderProps {
  email: string
  role: Role
}

const NAV_LINKS = [
  { href: "/",          label: "Dashboard" },
  { href: "/courses",   label: "Courses"   },
  { href: "/students",  label: "Students"  },
]

export function NavHeader({ email, role }: NavHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto px-4 h-12 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground shrink-0">
          <GraduationCap className="h-4 w-4" />
          <span>Bishop State SSA</span>
        </div>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  active
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side: role badge + email + logout */}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border shrink-0 ${ROLE_COLORS[role]}`}
          >
            {ROLE_LABELS[role]}
          </span>
          <span className="text-xs text-muted-foreground truncate hidden md:block">
            {email}
          </span>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" className="gap-1 shrink-0">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>

      </div>
    </header>
  )
}
