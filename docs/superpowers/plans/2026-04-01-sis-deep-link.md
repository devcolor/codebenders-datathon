# SIS Deep-Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a FERPA-compliant "Open in SIS" button to the student detail page that constructs a deep-link URL server-side, keeping the SIS student ID out of the browser.

**Architecture:** A new `guid_sis_map` table maps anonymized GUIDs to SIS IDs. A new API route (`GET /api/students/[guid]/sis-link`) performs the lookup, builds the URL server-side, logs access, and returns only the constructed URL. The student detail page fetches this endpoint and renders the button accordingly.

**Tech Stack:** Next.js 16 (App Router), PostgreSQL (pg driver), shadcn/ui, Tailwind CSS, Python (psycopg2 for seed script)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `operations/seed_guid_sis_map.py` | Create | Create table + seed ~20 demo mappings |
| `codebenders-dashboard/.env.local` | Modify | Add `SIS_BASE_URL`, `SIS_ID_PARAM` |
| `codebenders-dashboard/app/api/students/[guid]/sis-link/route.ts` | Create | Server-side SIS URL builder + audit log |
| `codebenders-dashboard/app/students/[guid]/page.tsx` | Modify | Add "Open in SIS" button |

---

### Task 1: Create `guid_sis_map` Table and Seed Demo Data

**Files:**
- Create: `operations/seed_guid_sis_map.py`

- [ ] **Step 1: Write the seed script**

Create `operations/seed_guid_sis_map.py` using the existing `db_config` and `psycopg2` pattern from `operations/db_utils.py`:

```python
"""
Seed guid_sis_map Table
========================
Creates the guid_sis_map table and populates it with ~20 demo mappings
for POC/demo purposes. Maps real Student_GUIDs to fake SIS IDs.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from .db_config import DB_CONFIG


def seed_guid_sis_map():
    """Create guid_sis_map table and seed with demo data."""
    connection = psycopg2.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        dbname=DB_CONFIG['database'],
        port=DB_CONFIG['port'],
        cursor_factory=RealDictCursor
    )
    cursor = connection.cursor()

    # Create table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS guid_sis_map (
            student_guid TEXT PRIMARY KEY,
            sis_id       TEXT NOT NULL
        );
    """)
    print("✓ guid_sis_map table created/verified")

    # Pick ~20 random GUIDs from student_level_with_predictions
    cursor.execute("""
        SELECT "Student_GUID"
        FROM student_level_with_predictions
        ORDER BY RANDOM()
        LIMIT 20
    """)
    guids = [row['Student_GUID'] for row in cursor.fetchall()]

    if not guids:
        print("✗ No students found in student_level_with_predictions")
        cursor.close()
        connection.close()
        return False

    # Clear existing demo data and insert fresh mappings
    cursor.execute("DELETE FROM guid_sis_map")

    for i, guid in enumerate(guids, start=100001):
        sis_id = f"BSC-{i}"
        cursor.execute(
            "INSERT INTO guid_sis_map (student_guid, sis_id) VALUES (%s, %s)",
            (guid, sis_id)
        )

    connection.commit()
    print(f"✓ Seeded {len(guids)} GUID → SIS ID mappings (BSC-100001 .. BSC-{100000 + len(guids)})")

    # Verify
    cursor.execute("SELECT COUNT(*) AS count FROM guid_sis_map")
    count = cursor.fetchone()['count']
    print(f"✓ Verified: {count} records in guid_sis_map")

    cursor.close()
    connection.close()
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("SEEDING guid_sis_map TABLE")
    print("=" * 60)
    seed_guid_sis_map()
```

- [ ] **Step 2: Run the seed script**

Run:
```bash
cd /Users/william-meroxa/Development/codebenders-datathon
source venv/bin/activate
python -m operations.seed_guid_sis_map
```

Expected output:
```
============================================================
SEEDING guid_sis_map TABLE
============================================================
✓ Connected to database: postgres
✓ guid_sis_map table created/verified
✓ Seeded 20 GUID → SIS ID mappings (BSC-100001 .. BSC-100020)
✓ Verified: 20 records in guid_sis_map
```

- [ ] **Step 3: Commit**

```bash
git add operations/seed_guid_sis_map.py
git commit -m "feat(#78): add guid_sis_map seed script for SIS deep-link POC"
```

---

### Task 2: Add Environment Variables

**Files:**
- Modify: `codebenders-dashboard/.env.local` (append at end)

- [ ] **Step 1: Add SIS env vars to `.env.local`**

Append to the end of `codebenders-dashboard/.env.local`:

```env

# SIS Deep-Link Configuration (leave SIS_BASE_URL blank to disable)
SIS_BASE_URL=https://sis-demo.example.com/students
SIS_ID_PARAM=id
```

- [ ] **Step 2: Commit**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon
git add codebenders-dashboard/.env.local
git commit -m "feat(#78): add SIS deep-link env vars"
```

Note: `.env.local` is already gitignored. If it is, skip the commit for this file — the env vars are documented in the design spec and the API route defaults `SIS_ID_PARAM` to `"id"`.

---

### Task 3: Create SIS Link API Route

**Files:**
- Create: `codebenders-dashboard/app/api/students/[guid]/sis-link/route.ts`

- [ ] **Step 1: Create the API route**

Create `codebenders-dashboard/app/api/students/[guid]/sis-link/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { mkdir, appendFile } from "fs/promises"
import path from "path"
import { getPool } from "@/lib/db"
import type { Role } from "@/lib/roles"

const ALLOWED_ROLES: Role[] = ["admin", "advisor", "ir"]

const LOGS_DIR = path.join(process.cwd(), "logs")
const LOG_FILE = path.join(LOGS_DIR, "query-history.jsonl")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  // Feature disabled if SIS_BASE_URL is not configured
  const sisBaseUrl = process.env.SIS_BASE_URL
  if (!sisBaseUrl) {
    return NextResponse.json({ url: null }, { status: 404 })
  }

  // Role check
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { guid } = await params
  if (!guid) {
    return NextResponse.json({ error: "Missing student GUID" }, { status: 400 })
  }

  try {
    // Look up SIS ID from mapping table
    const pool = getPool()
    const result = await pool.query(
      "SELECT sis_id FROM guid_sis_map WHERE student_guid = $1 LIMIT 1",
      [guid]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ url: null }, { status: 404 })
    }

    // Build URL server-side — SIS ID never reaches the client
    const sisIdParam = process.env.SIS_ID_PARAM || "id"
    const sisId = result.rows[0].sis_id
    const url = `${sisBaseUrl}?${encodeURIComponent(sisIdParam)}=${encodeURIComponent(sisId)}`

    // Audit log — GUID and role only, never the SIS ID
    const logEntry = {
      event: "sis_link_accessed",
      guid,
      role,
      timestamp: new Date().toISOString(),
    }
    await mkdir(LOGS_DIR, { recursive: true })
    await appendFile(LOG_FILE, JSON.stringify(logEntry) + "\n", "utf8")

    return NextResponse.json({ url })
  } catch (error) {
    console.error("SIS link lookup error:", error)
    return NextResponse.json(
      { error: "Failed to look up SIS link" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verify the route loads**

Start the dev server and test the endpoint:

```bash
cd /Users/william-meroxa/Development/codebenders-datathon/codebenders-dashboard
npm run dev
```

Then in another terminal, test with curl (this will return 403 without auth headers, which confirms the route loads and the role check works):

```bash
curl -s http://localhost:3000/api/students/test-guid/sis-link | jq .
```

Expected: `{ "error": "Forbidden" }` with status 403.

- [ ] **Step 3: Commit**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon
git add codebenders-dashboard/app/api/students/\[guid\]/sis-link/route.ts
git commit -m "feat(#78): add SIS deep-link API route with audit logging"
```

---

### Task 4: Add "Open in SIS" Button to Student Detail Page

**Files:**
- Modify: `codebenders-dashboard/app/students/[guid]/page.tsx`

- [ ] **Step 1: Add SIS link state and fetch logic**

In `codebenders-dashboard/app/students/[guid]/page.tsx`, add imports for `ExternalLink` at the top alongside the existing lucide-react imports:

```typescript
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react"
```

Add a `Tooltip` import from shadcn/ui (if available) or we'll use the `title` attribute for the POC.

Add new state variables inside the `StudentDetailPage` component, after the existing `error` state:

```typescript
const [sisLink, setSisLink] = useState<string | null>(null)
const [sisStatus, setSisStatus] = useState<"loading" | "available" | "unavailable" | "hidden">("loading")
```

Add a second `useEffect` after the existing one that fetches student data, to fetch the SIS link:

```typescript
useEffect(() => {
  if (!guid) return
  fetch(`/api/students/${encodeURIComponent(guid)}/sis-link`)
    .then(r => {
      if (r.status === 403) {
        setSisStatus("hidden")
        return null
      }
      if (r.status === 404) {
        setSisStatus("unavailable")
        return null
      }
      if (!r.ok) {
        setSisStatus("hidden")
        return null
      }
      return r.json()
    })
    .then(data => {
      if (data?.url) {
        setSisLink(data.url)
        setSisStatus("available")
      }
    })
    .catch(() => setSisStatus("hidden"))
}, [guid])
```

- [ ] **Step 2: Add the button to the student header**

In the same file, find the badges `<div>` in the student header (the `<div className="flex items-center gap-2">` that contains the alert and readiness badges). Add the SIS button before the badges:

Replace this block (around line 181):
```tsx
<div className="flex items-center gap-2">
  {student.at_risk_alert && (
```

With:
```tsx
<div className="flex items-center gap-2">
  {sisStatus === "available" && sisLink && (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => window.open(sisLink, "_blank", "noopener,noreferrer")}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Open in SIS
    </Button>
  )}
  {sisStatus === "unavailable" && (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 opacity-50 cursor-not-allowed"
      disabled
      title="No SIS record linked for this student"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Open in SIS
    </Button>
  )}
  {student.at_risk_alert && (
```

- [ ] **Step 3: Verify in the browser**

1. Start the dev server: `npm run dev`
2. Navigate to a student detail page for a GUID that was seeded in `guid_sis_map`
3. Verify the "Open in SIS" button appears and clicking it opens the demo URL in a new tab
4. Navigate to a student NOT in `guid_sis_map`
5. Verify the button appears disabled with the tooltip text

To find a seeded GUID for testing:
```bash
cd /Users/william-meroxa/Development/codebenders-datathon
source venv/bin/activate
python -c "
import psycopg2
from operations.db_config import DB_CONFIG
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()
cur.execute('SELECT student_guid FROM guid_sis_map LIMIT 3')
for row in cur.fetchall():
    print(row[0])
cur.close()
conn.close()
"
```

- [ ] **Step 4: Verify audit log entry**

After clicking the button, check that an audit entry was written:

```bash
tail -1 codebenders-dashboard/logs/query-history.jsonl
```

Expected: a JSON line like:
```json
{"event":"sis_link_accessed","guid":"<some-guid>","role":"advisor","timestamp":"2026-04-01T..."}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon
git add codebenders-dashboard/app/students/\[guid\]/page.tsx
git commit -m "feat(#78): add Open in SIS button to student detail page"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run lint**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon/codebenders-dashboard
npm run lint
```

Expected: no new warnings or errors.

- [ ] **Step 2: Run build**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon/codebenders-dashboard
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 3: End-to-end walkthrough**

Verify all acceptance criteria from issue #78:

| Criterion | How to verify |
|-----------|---------------|
| `SIS_BASE_URL` controls button | Remove the env var, restart dev server, confirm button is hidden |
| Button only for admin/advisor/ir | Log in as a leadership/faculty user, confirm button is hidden |
| SIS ID never in public API | Check Network tab — `/sis-link` returns `{ url }` only, not the raw SIS ID |
| SIS ID never in student data | Check `/api/students/[guid]` response — no `sis_id` field |
| Deep-link access logged | Check `logs/query-history.jsonl` for `sis_link_accessed` entries |
| Graceful fallback | Visit a student without a mapping — disabled button with tooltip |
| Works with any SIS URL | Change `SIS_BASE_URL` in env, verify the URL changes |

- [ ] **Step 4: Final commit (if any lint/build fixes needed)**

```bash
git add -p
git commit -m "fix(#78): address lint/build issues"
```
