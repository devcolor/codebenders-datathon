import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, BookOpen, FlaskConical, GraduationCap, ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "Readiness Methodology — Bishop State Student Success Dashboard",
}

const CITATIONS = [
  {
    id: 1,
    authors: "National Student Clearinghouse",
    title: "Postsecondary Data Partnership Metrics",
    url: "https://www.studentclearinghouse.org/academy/courses/postsecondary-data-partnership-an-introduction/lessons/the-postsecondary-data-partnership-metrics/",
    year: "2024",
  },
  {
    id: 2,
    authors: "Community College Research Center (CCRC)",
    title: "Modernizing College Course Placement by Using Multiple Measures",
    url: "https://ccrc.tc.columbia.edu/publications/modernizing-college-course-placement-multiple-measures.html",
    year: "2023",
  },
  {
    id: 3,
    authors: "CCRC / Center for the Analysis of Postsecondary Readiness (CAPR)",
    title: "Lessons From Two Experimental Studies of Multiple Measures Assessment",
    url: "https://ccrc.tc.columbia.edu/publications/multiple-measures-assessment-lessons-capr.html",
    year: "2022",
  },
  {
    id: 4,
    authors: "Bird, Castleman, Mabel & Song",
    title: "Bringing Transparency to Predictive Analytics: A Systematic Comparison of Predictive Modeling Methods in Higher Education",
    url: "https://journals.sagepub.com/doi/full/10.1177/23328584211037630",
    year: "2021",
  },
  {
    id: 5,
    authors: "Achieving the Dream",
    title: "Postsecondary Data Partnership (PDP)",
    url: "https://achievingthedream.org/innovation/postsecondary-data-partnership-pdp/",
    year: "2024",
  },
]

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-4xl">
        {/* Header */}
        <div className="border-b border-border pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Readiness Assessment Methodology
          </h1>
          <p className="text-muted-foreground mt-2">
            How student readiness scores are calculated, the research behind the approach, and its alignment with the Postsecondary Data Partnership (PDP) framework.
          </p>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline">Version: rules_v1</Badge>
          </div>
        </div>

        {/* Research Foundation */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Research Foundation</h2>
          </div>
          <p className="text-muted-foreground">
            The scoring methodology is grounded in three bodies of research from leading higher education institutions:
          </p>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Postsecondary Data Partnership (PDP)</CardTitle>
                <CardDescription>National Student Clearinghouse [1][5]</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                The PDP defines <strong>leading indicators</strong> (early momentum metrics) and <strong>lagging indicators</strong> (outcomes) for community college student success.
                Our academic sub-score directly incorporates the PDP&apos;s five key momentum metrics: gateway math and English completion, credit completion ratio, the 12-credit Year 1 milestone, and enrollment intensity.
                The PDP framework itself uses explicit metric thresholds — validating a rule-based approach over black-box ML for institutional reporting contexts.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Multiple Measures Assessment</CardTitle>
                <CardDescription>Community College Research Center (CCRC) / CAPR [2][3]</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                CCRC and CAPR experimental studies found that combining multiple academic indicators — GPA, placement level, course completion, and gateway outcomes —
                significantly outperforms single-measure assessment. Students placed via multiple measures pass gateway courses at equal or higher rates,
                and the effects persist for 3+ semesters. Our scoring is explicitly a multiple-measures system.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transparency in Predictive Analytics</CardTitle>
                <CardDescription>Bird, Castleman, Mabel & Song (2021) [4]</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                This study found that advisors distrusted and underused opaque machine learning predictions in higher education settings.
                Transparent, rule-based scoring with human-readable explanations improves advisor adoption and student intervention rates.
                Every readiness score in this system is fully traceable to its inputs.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Scoring Formula */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Scoring Formula</h2>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="font-mono text-sm bg-muted p-4 rounded-lg">
                readiness_score = (academic_score &times; <strong>0.40</strong>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (engagement_score &times; <strong>0.30</strong>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (ml_score &times; <strong>0.30</strong>)
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-semibold text-green-700">&ge; 0.65</div>
                  <div className="text-green-600">High Readiness</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="font-semibold text-yellow-700">0.40 &ndash; 0.64</div>
                  <div className="text-yellow-600">Medium Readiness</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-semibold text-red-700">&lt; 0.40</div>
                  <div className="text-red-600">Low Readiness</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-scores */}
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Academic Sub-Score</CardTitle>
                  <Badge>Weight: 40%</Badge>
                </div>
                <CardDescription>Average of 5 equally-weighted components (PDP-aligned)</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Component</th>
                      <th className="text-left py-1">Input</th>
                      <th className="text-left py-1">Calculation</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-1.5">GPA</td><td className="py-1.5">GPA Year 1</td><td className="py-1.5">min(gpa / 4.0, 1.0)</td></tr>
                    <tr className="border-b"><td className="py-1.5">Course completion</td><td className="py-1.5">Completion rate</td><td className="py-1.5">direct (0.0–1.0)</td></tr>
                    <tr className="border-b"><td className="py-1.5">Passing rate</td><td className="py-1.5">Passing rate</td><td className="py-1.5">direct (0.0–1.0)</td></tr>
                    <tr className="border-b"><td className="py-1.5">Gateway completion</td><td className="py-1.5">Math &amp; English Year 1</td><td className="py-1.5">0.5 + 0.25 per gateway</td></tr>
                    <tr>
                      <td className="py-1.5 font-medium text-foreground">
                        Credit momentum{" "}
                        <Badge variant="outline" className="ml-1 text-xs">PDP</Badge>
                      </td>
                      <td className="py-1.5">Credits earned Year 1</td>
                      <td className="py-1.5">&ge;12&rarr;1.0, &ge;6&rarr;0.6, &lt;6&rarr;0.3</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Engagement Sub-Score</CardTitle>
                  <Badge>Weight: 30%</Badge>
                </div>
                <CardDescription>Average of 3 equally-weighted components</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Component</th>
                      <th className="text-left py-1">Input</th>
                      <th className="text-left py-1">Calculation</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-1.5">Enrollment intensity</td><td className="py-1.5">First term status</td><td className="py-1.5">FT&rarr;1.0, PT&rarr;0.5, unknown&rarr;0.3</td></tr>
                    <tr className="border-b"><td className="py-1.5">Courses enrolled</td><td className="py-1.5">Total courses</td><td className="py-1.5">min(courses / 10, 1.0)</td></tr>
                    <tr><td className="py-1.5 font-medium text-foreground">Math placement</td><td className="py-1.5">Placement level</td><td className="py-1.5">College&rarr;1.0, Non-placed&rarr;0.5, Remedial&rarr;0.2</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">ML Risk Sub-Score</CardTitle>
                  <Badge>Weight: 30%</Badge>
                </div>
                <CardDescription>Inverted ML risk signal — higher retention probability = higher readiness</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Component</th>
                      <th className="text-left py-1">Input</th>
                      <th className="text-left py-1">Calculation</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-1.5">Retention probability</td><td className="py-1.5">ML Model 1 output</td><td className="py-1.5">direct (0.0–1.0)</td></tr>
                    <tr><td className="py-1.5">At-risk alert</td><td className="py-1.5">Risk tier</td><td className="py-1.5">URGENT&rarr;0.1, HIGH&rarr;0.3, MODERATE&rarr;0.6, LOW&rarr;0.9</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Worked Examples */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-semibold">Worked Examples</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Two hypothetical students illustrate how the same formula produces very different outcomes based on academic momentum and engagement signals.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* High Readiness Example */}
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Maria T.</CardTitle>
                  <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">High Readiness</Badge>
                </div>
                <CardDescription>First-generation student, part-time enrollment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Inputs */}
                <div>
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Inputs</p>
                  <table className="w-full text-xs">
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-1">GPA (Year 1)</td><td className="py-1 text-right font-mono">3.2</td></tr>
                      <tr className="border-b"><td className="py-1">Course completion</td><td className="py-1 text-right font-mono">0.83</td></tr>
                      <tr className="border-b"><td className="py-1">Passing rate</td><td className="py-1 text-right font-mono">0.78</td></tr>
                      <tr className="border-b"><td className="py-1">Gateways completed</td><td className="py-1 text-right font-mono">1 of 2 (Math)</td></tr>
                      <tr className="border-b"><td className="py-1">Credits earned</td><td className="py-1 text-right font-mono">9</td></tr>
                      <tr className="border-b"><td className="py-1">Enrollment intensity</td><td className="py-1 text-right font-mono">Part-time</td></tr>
                      <tr className="border-b"><td className="py-1">Courses enrolled</td><td className="py-1 text-right font-mono">5</td></tr>
                      <tr className="border-b"><td className="py-1">Math placement</td><td className="py-1 text-right font-mono">College-level</td></tr>
                      <tr className="border-b"><td className="py-1">Retention probability</td><td className="py-1 text-right font-mono">0.72</td></tr>
                      <tr><td className="py-1">At-risk alert</td><td className="py-1 text-right font-mono">MODERATE</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Sub-scores */}
                <div className="space-y-2">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Calculation</p>
                  <div className="bg-muted rounded-md p-3 space-y-2 font-mono text-xs">
                    <div>
                      <p className="text-muted-foreground">Academic (avg of 5)</p>
                      <p>0.80 + 0.83 + 0.78 + 0.75 + 0.60</p>
                      <p className="font-semibold">= 0.752 &times; 0.40 = 0.301</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Engagement (avg of 3)</p>
                      <p>0.50 + 0.50 + 1.00</p>
                      <p className="font-semibold">= 0.667 &times; 0.30 = 0.200</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ML Risk (avg of 2)</p>
                      <p>0.72 + 0.60</p>
                      <p className="font-semibold">= 0.660 &times; 0.30 = 0.198</p>
                    </div>
                  </div>
                </div>

                {/* Final score */}
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center">
                  <p className="text-xs text-green-700 mb-0.5">0.301 + 0.200 + 0.198</p>
                  <p className="text-2xl font-bold text-green-700">0.699</p>
                  <p className="text-sm font-medium text-green-600">High Readiness</p>
                </div>
              </CardContent>
            </Card>

            {/* Low Readiness Example */}
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Jordan M.</CardTitle>
                  <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Low Readiness</Badge>
                </div>
                <CardDescription>Remedial-track student, part-time enrollment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Inputs */}
                <div>
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Inputs</p>
                  <table className="w-full text-xs">
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-1">GPA (Year 1)</td><td className="py-1 text-right font-mono">1.8</td></tr>
                      <tr className="border-b"><td className="py-1">Course completion</td><td className="py-1 text-right font-mono">0.55</td></tr>
                      <tr className="border-b"><td className="py-1">Passing rate</td><td className="py-1 text-right font-mono">0.50</td></tr>
                      <tr className="border-b"><td className="py-1">Gateways completed</td><td className="py-1 text-right font-mono">0 of 2</td></tr>
                      <tr className="border-b"><td className="py-1">Credits earned</td><td className="py-1 text-right font-mono">4</td></tr>
                      <tr className="border-b"><td className="py-1">Enrollment intensity</td><td className="py-1 text-right font-mono">Part-time</td></tr>
                      <tr className="border-b"><td className="py-1">Courses enrolled</td><td className="py-1 text-right font-mono">3</td></tr>
                      <tr className="border-b"><td className="py-1">Math placement</td><td className="py-1 text-right font-mono">Remedial</td></tr>
                      <tr className="border-b"><td className="py-1">Retention probability</td><td className="py-1 text-right font-mono">0.38</td></tr>
                      <tr><td className="py-1">At-risk alert</td><td className="py-1 text-right font-mono">HIGH</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Sub-scores */}
                <div className="space-y-2">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Calculation</p>
                  <div className="bg-muted rounded-md p-3 space-y-2 font-mono text-xs">
                    <div>
                      <p className="text-muted-foreground">Academic (avg of 5)</p>
                      <p>0.45 + 0.55 + 0.50 + 0.50 + 0.30</p>
                      <p className="font-semibold">= 0.460 &times; 0.40 = 0.184</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Engagement (avg of 3)</p>
                      <p>0.50 + 0.30 + 0.20</p>
                      <p className="font-semibold">= 0.333 &times; 0.30 = 0.100</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ML Risk (avg of 2)</p>
                      <p>0.38 + 0.30</p>
                      <p className="font-semibold">= 0.340 &times; 0.30 = 0.102</p>
                    </div>
                  </div>
                </div>

                {/* Final score */}
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-center">
                  <p className="text-xs text-red-700 mb-0.5">0.184 + 0.100 + 0.102</p>
                  <p className="text-2xl font-bold text-red-700">0.386</p>
                  <p className="text-sm font-medium text-red-600">Low Readiness</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FERPA */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">FERPA Compliance</h2>
          </div>
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
              <p>
                Readiness scores are computed from a stripped profile with <strong>no PII</strong>: student identifiers and zip code are excluded before processing.
                Only aggregate behavioral metrics (GPA group, completion rate, placement level, enrollment type) are retained.
              </p>
              <p>
                When LLM narrative enrichment is enabled, only the FERPA-safe profile is transmitted to the LLM provider — never the student identifier, name, date of birth, or address.
                This satisfies FERPA §99.31(a)(1) for legitimate educational interest use.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Cross-link to AI Transparency */}
        <section className="space-y-2 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">See also</h2>
          <p className="text-sm text-muted-foreground">
            For an inventory of every AI surface in this dashboard — what it is, where it runs,
            what data flows where, and what is retained — see the{" "}
            <Link href="/ai-transparency" className="text-blue-600 hover:underline">
              AI Transparency page
            </Link>
            .
          </p>
        </section>

        {/* Citations */}
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">References</h2>
          <ul className="space-y-2">
            {CITATIONS.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium">[{c.id}]</span>{" "}
                {c.authors} ({c.year}).{" "}
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
