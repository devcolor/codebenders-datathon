import type { Metadata } from "next"
import { Fraunces, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google"
import styles from "./page.module.css"

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
})

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
})

const jbMono = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "AASCU Intermediary Discovery — Gap Analysis",
  description: "Editorial report on the AASCU intermediary discovery session: pain points, what the tool already addresses, and gaps filed as issues.",
}

const ISSUE_BASE = "https://github.com/devcolor/codebenders-datathon/issues"

const PAINS = [
  {
    tag: "A · Data accuracy & trust",
    h: "Numbers that don’t add up",
    items: [
      <>Incorrect cohort sizes; campuses missing from dashboard dropdowns.</>,
      <>Dashboard <strong>pulls from the wrong dataset</strong> intermittently.</>,
      <>Submission-time processing corrupts otherwise-clean institutional data.</>,
      <>No cross-source verification — intermediaries and institutions take each other&rsquo;s word.</>,
    ],
  },
  {
    tag: "B · Definitions & terminology",
    h: "The glossary that isn’t there",
    items: [
      <>“Completion at 3/4/5 years” and retention metrics undefined in-context.</>,
      <>Definitions live in <strong>external documentation</strong>, not the dashboard.</>,
      <>Terms diverge from IPEDS and state-compliance vocabulary IR staff already use.</>,
    ],
  },
  {
    tag: "C · Visualization & export",
    h: "Charts you can’t show your boss",
    items: [
      <>Wrong chart types — line graph for independent cohorts where bar is correct.</>,
      <>Charts <strong>not presentation-ready</strong>; IR staff rebuild in Excel by hand.</>,
      <>No data download from dashboard. Analysis-ready file is a <strong>$20K paywall</strong>.</>,
    ],
  },
  {
    tag: "D · AI & governance",
    h: "FERPA is the floor, not the ceiling",
    items: [
      <>“Weaponizing data” risk to under-resourced campuses via context-free AI inference.</>,
      <>Sensitive populations — immigrant, undocumented, public-aid — need explicit care.</>,
      <>Demand for full <strong>data lineage</strong>, model transparency, storage disclosure.</>,
    ],
  },
  {
    tag: "E · Institutional process",
    h: "One person knows; one person retires",
    items: [
      <>Submission knowledge silos with one IR staffer per institution.</>,
      <>Each campus has wildly different submission rituals — some delist + re-upload everything every cycle.</>,
      <>“Best edit resolution” loses to <strong>people-and-process bottlenecks</strong>.</>,
    ],
  },
  {
    tag: "F · Datathon coordination",
    h: "Group by goal, not just SIS",
    items: [
      <>AASCU has SIS-by-institution list — can rank by commonality or by need.</>,
      <>Last datathon: wildly different institutional incomes ate most of the day.</>,
      <>Recommend grouping by <strong>shared SIS + shared goal</strong> (e.g., advising).</>,
    ],
  },
]

const COVERAGE: Array<{
  pp: string
  name: string
  ev: React.ReactNode
  status: "done" | "partial"
  statusLabel: string
}> = [
  { pp: "C · Export", name: "CSV export wired into dashboard", ev: <><code>components/export-button.tsx</code> · issue #15</>, status: "done", statusLabel: "Done" },
  { pp: "C · Visualization", name: "Recharts components, types chosen per metric", ev: <><code>retention-risk-chart.tsx</code>, <code>risk-alert-chart.tsx</code>, <code>readiness-assessment-chart.tsx</code></>, status: "done", statusLabel: "Done" },
  { pp: "B · Definitions", name: "Tooltip primitive exists; no centralized glossary yet", ev: <><code>components/info-popover.tsx</code></>, status: "partial", statusLabel: "Partial" },
  { pp: "D · Methodology", name: "How predictions are made — surfaced in-app", ev: <><code>app/methodology/</code> route</>, status: "done", statusLabel: "Done" },
  { pp: "D · FERPA", name: "RBAC, audit log, FERPA-compliant identity resolution", ev: <>Issues #67, #75, #77, #78 (closed)</>, status: "done", statusLabel: "Done" },
  { pp: "D · Automation", name: "Self-service upload (PDP, AR, student, course)", ev: <>Issue #86 (closed) · <code>components/upload/</code></>, status: "done", statusLabel: "Done" },
  { pp: "D · Explainability", name: "SHAP narrator — fine-tuning epic in progress", ev: <>Issues #97 — #103 · branch <code>fine-tuning/97-shap-narrator-task-type</code></>, status: "partial", statusLabel: "In flight" },
  { pp: "A · Validation", name: "Upload exists; human-readable validation report missing", ev: <>Addressed by new issue #110</>, status: "partial", statusLabel: "Partial" },
  { pp: "C · Filtering", name: "By cohort, term, demographic, credential type", ev: <>Issues #66, #81 (closed)</>, status: "done", statusLabel: "Done" },
  { pp: "C · Query", name: "Natural-language query against the data", ev: <><code>lib/prompt-analyzer.ts</code> · issues #17, #61, #88, #90</>, status: "done", statusLabel: "Done" },
  { pp: "E · Knowledge", name: "Self-service upload reduces single-person dependency", ev: <>In-app submission runbook missing — addressed by #111</>, status: "partial", statusLabel: "Partial" },
]

const TIERS: Array<{
  pri: "p0" | "p1" | "p2"
  pillLabel: string
  h: React.ReactNode
  twoCol?: boolean
  cards: Array<{ num: number; tag: string; title: string; body: React.ReactNode }>
}> = [
  {
    pri: "p0",
    pillLabel: "P0 · Differentiators",
    h: <>Match the loudest complaints. <em>Datathon-eligible.</em></>,
    cards: [
      { num: 105, tag: "Pain B · Definitions", title: "Metric definitions glossary with IPEDS & state-compliance cross-walks", body: <>Every KPI surfaces a tooltip with PDP, IPEDS, and state-compliance equivalents. Centralized <code>/glossary</code> page indexed by metric. Markdown source-of-truth, versioned with the code.</> },
      { num: 106, tag: "Pain C · Export", title: "Presentation-ready chart export (PNG / PDF)", body: <>Every chart exports as a polished image with title, definition, source, and date stamp baked in. Eliminates the manual Excel-rebuild workflow IR staff perform daily.</> },
      { num: 107, tag: "Pain A + D · Lineage", title: "Data lineage view — “where did this number come from”", body: <>Click any number → see source rows, upload event, transformations, and timestamps. The single highest-leverage gap from the session: directly answers trust + governance + differentiation in one feature.</> },
    ],
  },
  {
    pri: "p1",
    pillLabel: "P1 · Governance hardening",
    h: <>Table-stakes for institutional adoption.</>,
    cards: [
      { num: 108, tag: "Pain D · Transparency", title: "AI Transparency Page", body: <>Per-model disclosure: features used, training data source, homegrown vs. third-party, where data flows when invoked, retention policy. Reviewable independently by institutional IT &amp; legal.</> },
      { num: 109, tag: "Pain D · Sensitive populations", title: "Sensitive-population safeguards", body: <>Per-institution feature-exclusion lists. Context warnings on small sub-populations. Audit log entries for any query touching flagged groups. Demoable, not just claimed.</> },
      { num: 110, tag: "Pain A + E · Validation", title: "Upload validation report — diff vs. last upload", body: <>Row-level errors, field coercions, dedup decisions, anomaly flags (&ldquo;3 campuses dropped from this upload&rdquo;). Readable by non-technical IR staff. Survives the &ldquo;person retires&rdquo; scenario.</> },
    ],
  },
  {
    pri: "p2",
    pillLabel: "P2 · Process & institutional fit",
    h: <>Lower urgency, higher institutional gratitude.</>,
    twoCol: true,
    cards: [
      { num: 111, tag: "Pain E · Process", title: "Submission runbook generator", body: <>Tool records the upload steps + field mappings that worked, then generates a printable runbook so a successor can replicate without tribal knowledge. Replayable on new files.</> },
      { num: 112, tag: "Pain F · Datathon coordination", title: "Institution-grouping helper — shared SIS + shared goal", body: <>Operational artifact, not a user feature: cross-reference AASCU&rsquo;s SIS list with stated institutional goals; output a candidate cohort matrix for the fall datathon.</> },
    ],
  },
]

const pillClass = (pri: "p0" | "p1" | "p2") =>
  pri === "p0" ? styles.pill0 : pri === "p1" ? styles.pill1 : styles.pill2

const statClass = (s: "done" | "partial") =>
  s === "done" ? styles.statDone : styles.statPartial

export default function AASCUFullPage() {
  return (
    <div className={`${fraunces.variable} ${plexSans.variable} ${jbMono.variable} ${styles.doc}`}>
      <div className={styles.inner}>

        <header className={styles.mast}>
          <div className={styles.lockup}>
            Codebenders Datathon · <b>Discovery Report №&nbsp;01</b> · Bishop&nbsp;State&nbsp;CC
          </div>
          <div className={styles.mastMeta}>
            Filed&nbsp;2026·04·29<br />
            Source: 21-min&nbsp;recording + notes<br />
            Status: Stakeholder review
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>AASCU Intermediary Discovery — Gap Analysis</div>
          <h1 className={styles.h1}>The data they have <em>isn&rsquo;t</em> the data they trust.</h1>
          <p className={styles.lede}>
            Two AASCU intermediaries described, in their own words, why the Postsecondary Data Partnership dashboard fails the institutions they support — and where a tool built around <em>provable</em>, <em>presentable</em>, <em>governed</em> outputs would land.
          </p>
          <dl className={styles.strip}>
            <div><dt>Recording</dt><dd>20:58<small>minutes of testimony</small></dd></div>
            <div><dt>Voices</dt><dd>2<small>intermediaries · IR + data&#8209;eng</small></dd></div>
            <div><dt>Pain themes</dt><dd>6<small>mapped across stack</small></dd></div>
            <div><dt>Issues filed</dt><dd>8<small>#105 — #112</small></dd></div>
          </dl>
        </section>

        <section className={styles.chapter}>
          <div className={styles.chapHead}>
            <div className={styles.chapNum}>01<span>Executive summary</span></div>
            <div>
              <h2 className={styles.chapTitle}>A tool worth adopting is one that <em>institutions can defend</em> — to legal, to leadership, to themselves.</h2>
              <p className={styles.chapKicker}>The intermediaries don&rsquo;t need another dashboard. They need outputs they can present upward, prove the provenance of, and govern responsibly when sensitive student populations are involved.</p>
            </div>
          </div>
          <div className={styles.summary}>
            <aside>
              <h5>Three layers of pain</h5>
              <ul>
                <li data-n="01">PDP dashboard quality</li>
                <li data-n="02">AI &amp; data governance</li>
                <li data-n="03">Institutional process</li>
              </ul>
            </aside>
            <div className="body">
              <p>Two AASCU intermediaries described pain in three layers: <strong>PDP dashboard quality</strong> — inaccurate cohort numbers, buried definitions, wrong chart types, no data export — forcing IR staff into manual Excel rebuilds; <strong>AI/governance requirements</strong> — FERPA-plus expectations including data lineage, transparency, and explicit safeguards for sensitive student populations; and <strong>institutional process gaps</strong> — submission knowledge that lives with one person and varies wildly across campuses.</p>
              <p>Our tool already addresses a meaningful share of layer one — CSV export, sane chart types, NLQ, methodology page — and is in-flight on layer two via the SHAP-narrator work. The biggest unaddressed gaps are <em>a definitions glossary with IPEDS / state-compliance cross-walks, presentation-ready chart export, a data-lineage view that proves where each number came from, and AI transparency + sensitive-population safeguards as a precondition for institutional adoption.</em></p>
            </div>
          </div>
        </section>

        <section className={styles.chapter}>
          <div className={styles.chapHead}>
            <div className={styles.chapNum}>02<span>What we heard</span></div>
            <div>
              <h2 className={styles.chapTitle}>Six themes — <em>raised independently</em> by both intermediaries.</h2>
              <p className={styles.chapKicker}>Andres (IR-focused) and Dr. Prateek (data-engineering-focused) emphasized different layers, but converged on a common diagnosis: institutions can&rsquo;t trust, can&rsquo;t present, and can&rsquo;t govern what PDP gives them today.</p>
            </div>
          </div>

          <div className={styles.pains}>
            {PAINS.map((p) => (
              <div key={p.tag} className={styles.pain}>
                <div className={styles.painTag}>{p.tag}</div>
                <h3 className={styles.painH}>{p.h}</h3>
                <ul className={styles.painList}>
                  {p.items.map((it, i) => <li key={i}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.pq}>
          <blockquote>Why on earth would they invest any time in learning this new tool?</blockquote>
          <cite>— Intermediary, on PDP&rsquo;s compounding friction · 21-min recording, 03:42</cite>
        </div>

        <section className={styles.chapter}>
          <div className={styles.chapHead}>
            <div className={styles.chapNum}>03<span>What the tool already does</span></div>
            <div>
              <h2 className={styles.chapTitle}>A meaningful share of the pain is <em>already addressed</em> in <code>codebenders-dashboard</code>.</h2>
              <p className={styles.chapKicker}>Mapping each pain point to the closed PRs and shipped components. Status reflects the state of the codebase as of this report.</p>
            </div>
          </div>

          <div>
            <div className={`${styles.row} ${styles.rowHead}`}>
              <div>Pain point</div>
              <div>Capability</div>
              <div>Evidence</div>
              <div>Status</div>
            </div>
            {COVERAGE.map((row, i) => (
              <div key={i} className={styles.row}>
                <div className={styles.pp}>{row.pp}</div>
                <div className={styles.name}>{row.name}</div>
                <div className={styles.ev}>{row.ev}</div>
                <div>
                  <span className={`${styles.stat} ${statClass(row.status)}`}>
                    {row.statusLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.pq}>
          <blockquote>I just went by each data point and copied that number into the Excel spreadsheet.</blockquote>
          <cite>— Dr. Prateek, on rebuilding PDP outputs by hand · 04:58</cite>
        </div>

        <section className={styles.chapter}>
          <div className={styles.chapHead}>
            <div className={styles.chapNum}>04<span>Gaps — issues filed</span></div>
            <div>
              <h2 className={styles.chapTitle}>Eight issues, three priority tiers, one through-line: <em>provable, presentable, governed</em>.</h2>
              <p className={styles.chapKicker}>Each issue links back to a specific quote or recurring complaint from the discovery session. Out-of-scope items are listed at the end and intentionally not filed.</p>
            </div>
          </div>

          {TIERS.map((tier) => (
            <div key={tier.pri} className={styles.tier}>
              <div className={styles.tierHead}>
                <span className={`${styles.tierPill} ${pillClass(tier.pri)}`}>{tier.pillLabel}</span>
                <h3 className={styles.tierH}>{tier.h}</h3>
              </div>
              <div className={`${styles.cards} ${tier.twoCol ? styles.cardsTwo : ""}`}>
                {tier.cards.map((c) => (
                  <a
                    key={c.num}
                    className={styles.card}
                    href={`${ISSUE_BASE}/${c.num}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className={styles.cardNum}>
                      <span>Issue</span>
                      <b>#{c.num}</b>
                    </div>
                    <div className={styles.cardTag}>{c.tag}</div>
                    <h4 className={styles.cardH}>{c.title}</h4>
                    <p className={styles.cardP}>{c.body}</p>
                    <div className={styles.cardLink}>Open issue</div>
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div className={styles.scope}>
            <h6>Intentionally<br />out of scope</h6>
            <ul>
              <li>PDP-side cohort accuracy and dropdown completeness — that&rsquo;s PDP&rsquo;s bug to fix; we shouldn&rsquo;t build around it.</li>
              <li>The $20K analysis-ready file paywall — pricing decision by PDP; not addressable here.</li>
              <li>Vendor over-promising on &ldquo;full automation&rdquo; — competitive-positioning concern, not a feature.</li>
            </ul>
          </div>
        </section>

        <footer className={styles.colophon}>
          <div>
            <b>AASCU Intermediary Discovery</b> · Gap Analysis<br />
            Set in Fraunces &amp; IBM Plex Sans · Filed 2026·04·29
          </div>
          <div>
            Codebenders&nbsp;Datathon · <b>Bishop&nbsp;State&nbsp;CC</b>
          </div>
        </footer>

      </div>
    </div>
  )
}
