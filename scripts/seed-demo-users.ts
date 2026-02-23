/**
 * Seed five demo users (one per role) into Supabase Auth and the user_roles table.
 *
 * Usage:
 *   SUPABASE_URL=https://<project>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   npx tsx scripts/seed-demo-users.ts
 *
 * The service role key is available in Supabase → Project Settings → API.
 * Never commit it to source control.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY " +
    "(or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)"
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_USERS = [
  { email: "admin@bscc.edu",      password: "BishopState2025!", role: "admin"      },
  { email: "advisor@bscc.edu",    password: "BishopState2025!", role: "advisor"    },
  { email: "ir@bscc.edu",         password: "BishopState2025!", role: "ir"         },
  { email: "faculty@bscc.edu",    password: "BishopState2025!", role: "faculty"    },
  { email: "leadership@bscc.edu", password: "BishopState2025!", role: "leadership" },
]

async function seed() {
  console.log("Seeding demo users…\n")

  for (const demo of DEMO_USERS) {
    // Create or look up user
    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email:            demo.email,
        password:         demo.password,
        email_confirm:    true,
      })

    if (createError && !createError.message.includes("already been registered")) {
      console.error(`  ✗ ${demo.email}: ${createError.message}`)
      continue
    }

    // If user already existed, fetch their ID
    let userId = createData?.user?.id
    if (!userId) {
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(u => u.email === demo.email)
      userId = existing?.id
    }

    if (!userId) {
      console.error(`  ✗ ${demo.email}: could not resolve user ID`)
      continue
    }

    // Upsert role
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: demo.role }, { onConflict: "user_id" })

    if (roleError) {
      console.error(`  ✗ ${demo.email} role: ${roleError.message}`)
    } else {
      console.log(`  ✓ ${demo.email}  →  ${demo.role}`)
    }
  }

  console.log("\nDone. Demo credentials:")
  console.log("  Password for all accounts: BishopState2025!")
  DEMO_USERS.forEach(u => console.log(`  ${u.role.padEnd(12)} ${u.email}`))
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
