export type Role = "admin" | "advisor" | "ir" | "faculty" | "leadership"

export const ALL_ROLES: Role[] = ["admin", "advisor", "ir", "faculty", "leadership"]

// Route prefix → roles that may access it. Unmatched routes are public (/ and /methodology).
export const ROUTE_PERMISSIONS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/students",                 roles: ["admin", "advisor", "ir"] },
  { prefix: "/courses",                  roles: ["admin", "advisor", "ir", "faculty"] },
  { prefix: "/query",                    roles: ["admin", "advisor", "ir", "faculty"] },
  { prefix: "/api/students",             roles: ["admin", "advisor", "ir"] },
  { prefix: "/api/courses",             roles: ["admin", "advisor", "ir", "faculty"] },
  { prefix: "/api/query-summary", roles: ["admin", "advisor", "ir", "faculty"] },
  { prefix: "/api/query-history/export", roles: ["admin", "ir"] },
]

export function canAccess(pathname: string, role: Role): boolean {
  for (const { prefix, roles } of ROUTE_PERMISSIONS) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?")) {
      return roles.includes(role)
    }
  }
  return true // dashboard, methodology, and other pages are open to all roles
}

export const ROLE_LABELS: Record<Role, string> = {
  admin:      "Admin",
  advisor:    "Advisor",
  ir:         "IR",
  faculty:    "Faculty",
  leadership: "Leadership",
}

export const ROLE_COLORS: Record<Role, string> = {
  admin:      "bg-purple-100 text-purple-800 border-purple-200",
  advisor:    "bg-blue-100 text-blue-800 border-blue-200",
  ir:         "bg-indigo-100 text-indigo-800 border-indigo-200",
  faculty:    "bg-teal-100 text-teal-800 border-teal-200",
  leadership: "bg-amber-100 text-amber-800 border-amber-200",
}
