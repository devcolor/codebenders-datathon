import type { Metadata } from "next"
import Link from "next/link"
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"
import styles from "./page.module.css"

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
})

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "AASCU Gap Analysis — Brief",
  description: "Two-page condensation of the AASCU intermediary discovery session and the issues filed against the dashboard backlog.",
}

const ISSUE_BASE = "https://github.com/devcolor/codebenders-datathon/issues"

const ISSUES: Array<{
  num: number
  title: string
  desc: string
  pri: "p0" | "p1" | "p2"
  shipped?: { pr?: number; note?: string }
}> = [
  { num: 105, pri: "p0", title: "Metric definitions glossary with IPEDS / state cross-walks", desc: "Hover tooltips on every KPI · centralized /glossary page · markdown source-of-truth.", shipped: { pr: 135 } },
  { num: 106, pri: "p0", title: "Presentation-ready chart export (PNG / PDF)", desc: "Title, definition, source, date stamp baked in. Eliminates the manual Excel rebuild.", shipped: { pr: 137 } },
  { num: 107, pri: "p0", title: "Data lineage view — “where did this number come from”", desc: "Click any number → source rows, upload event, transformations, timestamps. Highest-leverage gap.", shipped: { pr: 139 } },
  { num: 108, pri: "p1", title: "AI Transparency Page", desc: "Per-model disclosure — features, training data, provider, data flow, retention. Reviewable independently.", shipped: { pr: 128 } },
  { num: 109, pri: "p1", title: "Sensitive-population safeguards", desc: "Per-institution feature exclusion · low-sample-size context warnings · audit log entries.", shipped: {} },
  { num: 110, pri: "p1", title: "Upload validation report — diff vs. last upload", desc: "Row-level errors, coercions, dedup decisions, dropped-campus flags. Readable by non-technical IR staff.", shipped: { pr: 138 } },
  { num: 111, pri: "p2", title: "Submission runbook generator", desc: "Capture what worked → printable runbook · replayable on new files · survives staff turnover." },
  { num: 112, pri: "p2", title: "Datathon institution grouping (SIS + goal)", desc: "Operational artifact — cross-reference AASCU's SIS list with stated goals; output cohort matrix." },
]

const FOLLOWUPS: Array<{ num: number; title: string; desc: string; shipped?: { pr?: number } }> = [
  { num: 125, title: "Docs drift — 6 ML models + 3 OpenAI surfaces", desc: "Authoring the transparency page surfaced doc inaccuracies. CLAUDE.md + README updated.", shipped: { pr: 130 } },
  { num: 126, title: "FORCE_DIRECT_DB hardening flag", desc: "Block external data API for institutions that require fully on-prem NLQ.", shipped: { pr: 133 } },
  { num: 127, title: "FERPA runtime guard for NLQ-generated SQL", desc: "Static check that LLM-produced SQL never SELECTs Student_GUID.", shipped: { pr: 132 } },
  { num: 129, title: "FERPA-audit Claude Code skill", desc: "Repeatable static + DB read-time leak detection. Catches the same gaps proactively on every PR.", shipped: { pr: 134 } },
]

const COVERAGE: Array<{
  lbl: string
  title: string
  desc: string
  status: "done" | "partial" | "gap"
}> = [
  { lbl: "A · Data accuracy", status: "done", title: "Numbers don’t add up; PDP pulls from wrong dataset", desc: "Lineage view (#107) makes every number provable; validation report (#110) catches errors at upload time. PDP-side accuracy is out of scope." },
  { lbl: "B · Definitions", status: "done", title: "Metrics undefined in-context; mismatch with IPEDS / state", desc: "Glossary with IPEDS + state cross-walks shipped (#105); deep-linked from charts (#136)." },
  { lbl: "C · Visualization", status: "done", title: "Wrong chart types in PDP; ours are sane", desc: "Recharts components, types chosen per metric." },
  { lbl: "C · Export", status: "done", title: "Presentation-ready PNG / PDF chart export with definitions baked in", desc: "Shipped (#106) on top of the existing CSV path (#15)." },
  { lbl: "D · FERPA", status: "done", title: "RBAC, audit log, identity resolution, NLQ runtime guard", desc: "Original FERPA work (#67, #75, #77, #78) plus runtime SQL guard (#127) and the FERPA-audit skill (#129) for ongoing PR-time enforcement." },
  { lbl: "D · AI governance", status: "done", title: "Transparency page, lineage view, sensitive-population safeguards", desc: "AI Transparency (#108), data lineage (#107), sensitive-population safeguards (#109) — all shipped. SHAP narrator (#97-#103) still in flight." },
  { lbl: "E · Process", status: "partial", title: "Knowledge siloed; submission rituals vary per campus", desc: "Self-service upload (#86) and validation report (#110) help. Submission runbook (#111) would close the loop — not yet shipped." },
]

const statClass = (s: "done" | "partial" | "gap") =>
  s === "done" ? styles.statDone : s === "partial" ? styles.statPartial : styles.statGap

const priClass = (p: "p0" | "p1" | "p2") =>
  p === "p0" ? styles.pri0 : p === "p1" ? styles.pri1 : styles.pri2

export default function AASCUBriefPage() {
  return (
    <div className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} ${styles.doc}`}>
      <div className={styles.inner}>

        <header className={styles.header}>
          <div className={styles.kicker}>AASCU Discovery · Gap Analysis · Brief</div>
          <h1 className={styles.h1}>What the tool already does, what it&rsquo;s missing, what to build next.</h1>
          <p className={styles.lede}>
            A two-page condensation of the AASCU intermediary discovery session and the eight issues filed against the codebenders-dashboard backlog.
          </p>
          <div className={styles.meta}>
            <span><b>2026·04·29</b></span>
            <span>2 intermediaries</span>
            <span>21 min source</span>
            <span>8 filed · 6 shipped</span>
          </div>
        </header>

        <section className={styles.section}>
          <h2 className={styles.h2}>The take · update</h2>
          <div className={styles.tldr}>
            <p>
              Intermediaries described pain in three layers: <strong>PDP dashboard quality</strong>, <strong>AI &amp; data governance</strong>, and <strong>institutional process</strong>. Six of the eight issues filed against the codebase have shipped — including the four named &ldquo;biggest unaddressed gaps&rdquo; in this brief&rsquo;s first publication.
            </p>
            <p>
              <strong>Shipped:</strong> definitions glossary with IPEDS / state cross-walks, presentation-ready chart export, data-lineage view, AI transparency page, sensitive-population safeguards, upload validation report. <strong>Outstanding:</strong> submission runbook generator (#111), datathon institution-grouping spike (#112).
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Pain × Coverage</h2>
          {COVERAGE.map((row) => (
            <div key={row.lbl} className={styles.item}>
              <div>
                <div className={styles.lbl}>{row.lbl}</div>
                <h3 className={styles.itemH}>{row.title}</h3>
                <p className={styles.itemP}>{row.desc}</p>
              </div>
              <span className={`${styles.stat} ${statClass(row.status)}`}>
                {row.status === "done" ? "Done" : row.status === "partial" ? "Partial" : "Gap"}
              </span>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Issues filed (#105 — #112)</h2>
          {ISSUES.map((iss) => (
            <a
              key={iss.num}
              className={styles.issue}
              href={`${ISSUE_BASE}/${iss.num}`}
              target="_blank"
              rel="noreferrer"
            >
              <div className={styles.issueNum}>#{iss.num}</div>
              <div>
                <h3 className={styles.issueH}>{iss.title}</h3>
                <p className={styles.issueP}>{iss.desc}</p>
              </div>
              <div className={styles.pillStack}>
                {iss.shipped ? (
                  <span className={`${styles.pri} ${styles.shipped}`}>
                    {iss.shipped.pr ? `Shipped · PR #${iss.shipped.pr}` : "Shipped"}
                  </span>
                ) : (
                  <span className={`${styles.pri} ${priClass(iss.pri)}`}>{iss.pri.toUpperCase()}</span>
                )}
              </div>
            </a>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Follow-ups discovered during implementation</h2>
          <p className={styles.followNote}>
            Building #108 (transparency page) surfaced four hardening gaps that weren&rsquo;t visible from the original discovery session. All four are now shipped.
          </p>
          {FOLLOWUPS.map((iss) => (
            <a
              key={iss.num}
              className={styles.issue}
              href={`${ISSUE_BASE}/${iss.num}`}
              target="_blank"
              rel="noreferrer"
            >
              <div className={styles.issueNum}>#{iss.num}</div>
              <div>
                <h3 className={styles.issueH}>{iss.title}</h3>
                <p className={styles.issueP}>{iss.desc}</p>
              </div>
              <div className={styles.pillStack}>
                <span className={`${styles.pri} ${styles.shipped}`}>
                  {iss.shipped?.pr ? `Shipped · PR #${iss.shipped.pr}` : "Shipped"}
                </span>
              </div>
            </a>
          ))}
        </section>

        <footer className={styles.footer}>
          <span>Brief · Bishop State CC · Codebenders Datathon</span>
          <span>
            Full report → <Link href="/discovery/aascu/full">aascu / full</Link>
          </span>
        </footer>

      </div>
    </div>
  )
}
