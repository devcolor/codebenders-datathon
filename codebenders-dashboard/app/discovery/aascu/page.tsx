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
}> = [
  { num: 105, pri: "p0", title: "Metric definitions glossary with IPEDS / state cross-walks", desc: "Hover tooltips on every KPI · centralized /glossary page · markdown source-of-truth." },
  { num: 106, pri: "p0", title: "Presentation-ready chart export (PNG / PDF)", desc: "Title, definition, source, date stamp baked in. Eliminates the manual Excel rebuild." },
  { num: 107, pri: "p0", title: "Data lineage view — “where did this number come from”", desc: "Click any number → source rows, upload event, transformations, timestamps. Highest-leverage gap." },
  { num: 108, pri: "p1", title: "AI Transparency Page", desc: "Per-model disclosure — features, training data, provider, data flow, retention. Reviewable independently." },
  { num: 109, pri: "p1", title: "Sensitive-population safeguards", desc: "Per-institution feature exclusion · low-sample-size context warnings · audit log entries." },
  { num: 110, pri: "p1", title: "Upload validation report — diff vs. last upload", desc: "Row-level errors, coercions, dedup decisions, dropped-campus flags. Readable by non-technical IR staff." },
  { num: 111, pri: "p2", title: "Submission runbook generator", desc: "Capture what worked → printable runbook · replayable on new files · survives staff turnover." },
  { num: 112, pri: "p2", title: "Datathon institution grouping (SIS + goal)", desc: "Operational artifact — cross-reference AASCU's SIS list with stated goals; output cohort matrix." },
]

const COVERAGE: Array<{
  lbl: string
  title: string
  desc: string
  status: "done" | "partial" | "gap"
}> = [
  { lbl: "A · Data accuracy", status: "partial", title: "Numbers don’t add up; PDP pulls from wrong dataset", desc: "Validation report on upload addresses the institutional side; PDP-side accuracy is out of scope." },
  { lbl: "B · Definitions", status: "gap", title: "Metrics undefined in-context; mismatch with IPEDS / state", desc: "Tooltip primitive exists. Centralized glossary and cross-walks not yet built." },
  { lbl: "C · Visualization", status: "done", title: "Wrong chart types in PDP; ours are sane", desc: "Recharts components, types chosen per metric. Done." },
  { lbl: "C · Export", status: "partial", title: "CSV from dashboard; no presentation-ready chart export", desc: "CSV shipped (#15). PNG/PDF export with embedded definitions is the next step." },
  { lbl: "D · FERPA", status: "done", title: "RBAC, audit log, FERPA-compliant identity resolution", desc: "Issues #67, #75, #77, #78 closed. FERPA basics covered." },
  { lbl: "D · AI governance", status: "gap", title: "Transparency page, lineage view, sensitive-population safeguards", desc: "Methodology page exists. SHAP narrator in flight. Lineage and transparency disclosures unbuilt." },
  { lbl: "E · Process", status: "partial", title: "Knowledge siloed; submission rituals vary per campus", desc: "Self-service upload (#86) helps. Runbook generator would close the loop." },
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
            <span>8 issues filed</span>
          </div>
        </header>

        <section className={styles.section}>
          <h2 className={styles.h2}>The take</h2>
          <div className={styles.tldr}>
            <p>
              Intermediaries describe pain in three layers: <strong>PDP dashboard quality</strong> (charts, definitions, exports, accuracy), <strong>AI &amp; data governance</strong> (lineage, transparency, sensitive populations), and <strong>institutional process</strong> (knowledge silos, inconsistent submission rituals).
            </p>
            <p>
              The tool already addresses meaningful parts of layer one and is in-flight on layer two via the SHAP narrator. The biggest unaddressed gaps are <strong>a definitions glossary, presentation-ready chart export, a data-lineage view, and AI transparency + sensitive-population safeguards</strong>.
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
              <span className={`${styles.pri} ${priClass(iss.pri)}`}>{iss.pri.toUpperCase()}</span>
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
