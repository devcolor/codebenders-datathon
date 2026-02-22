"use client"

import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ExportData {
  kpis: any
  riskAlerts: any[]
  retentionRisk: any[]
}

interface ExportButtonProps {
  data: ExportData
  disabled?: boolean
}

export function ExportButton({ data, disabled = false }: ExportButtonProps) {
  const exportToCSV = () => {
    // Safety check
    if (!data.kpis || !data.riskAlerts || !data.retentionRisk) {
      console.error("Missing data for export")
      return
    }
    
    // Combine all data into CSV format
    const rows: string[] = []
    
    // KPIs Section
    rows.push("STUDENT SUCCESS DASHBOARD - KPI SUMMARY")
    rows.push(`Generated: ${new Date().toLocaleString()}`)
    rows.push("")
    rows.push("Key Performance Indicators")
    rows.push("Metric,Value")
    rows.push(`Overall Retention Rate,${data.kpis?.overallRetentionRate}%`)
    rows.push(`Avg Predicted Retention,${data.kpis?.avgPredictedRetention}%`)
    rows.push(`Students at High/Critical Risk,${data.kpis?.highCriticalRiskCount}`)
    rows.push(`Avg Course Completion Rate,${data.kpis?.avgCourseCompletionRate}%`)
    rows.push(`Total Students,${data.kpis?.totalStudents}`)
    rows.push("")
    
    // Risk Alerts
    rows.push("Risk Alert Distribution")
    rows.push("Alert Level,Count,Percentage")
    data.riskAlerts.forEach(item => {
      rows.push(`${item.category},${item.count},${Number(item.percentage).toFixed(1)}%`)
    })
    rows.push("")
    
    // Retention Risk
    rows.push("Retention Risk Categories")
    rows.push("Risk Category,Count,Percentage")
    data.retentionRisk.forEach(item => {
      rows.push(`${item.category},${item.count},${Number(item.percentage).toFixed(1)}%`)
    })
    
    const csv = rows.join("\n")
    downloadFile(csv, "student-success-dashboard.csv", "text/csv")
  }

  const exportToJSON = () => {
    // Safety check
    if (!data.kpis || !data.riskAlerts || !data.retentionRisk) {
      console.error("Missing data for export")
      return
    }
    
    const exportData = {
      generated: new Date().toISOString(),
      institution: "Bishop State Community College",
      kpis: data.kpis,
      riskAlerts: data.riskAlerts,
      retentionRisk: data.retentionRisk,
      metadata: {
        dataSource: "student_predictions table",
        models: [
          "Model 1: XGBoost Retention Classifier (52.2% accuracy)",
          "Model 2: Composite Risk Score (Early Warning System)"
        ]
      }
    }
    
    const json = JSON.stringify(exportData, null, 2)
    downloadFile(json, "student-success-dashboard.json", "application/json")
  }

  const exportToMarkdown = () => {
    // Safety check
    if (!data.kpis || !data.riskAlerts || !data.retentionRisk) {
      console.error("Missing data for export")
      return
    }
    
    const md: string[] = []
    
    md.push("# Student Success Dashboard Report")
    md.push("")
    md.push(`**Generated:** ${new Date().toLocaleString()}`)
    md.push(`**Institution:** Bishop State Community College`)
    md.push(`**Data Source:** student_predictions table (${data.kpis?.totalStudents?.toLocaleString()} students)`)
    md.push("")
    md.push("---")
    md.push("")
    
    // Executive Summary
    md.push("## Executive Summary")
    md.push("")
    md.push("### Key Performance Indicators")
    md.push("")
    md.push("| Metric | Value |")
    md.push("|--------|-------|")
    md.push(`| Overall Retention Rate | ${data.kpis?.overallRetentionRate}% |`)
    md.push(`| Avg Predicted Retention | ${data.kpis?.avgPredictedRetention}% |`)
    md.push(`| Students at High/Critical Risk | ${data.kpis?.highCriticalRiskCount?.toLocaleString()} |`)
    md.push(`| Avg Course Completion | ${data.kpis?.avgCourseCompletionRate}% |`)
    md.push(`| Total Students Analyzed | ${data.kpis?.totalStudents?.toLocaleString()} |`)
    md.push("")
    
    // Risk Alerts
    md.push("## Risk Alert Distribution")
    md.push("")
    md.push("Students flagged for intervention based on composite risk scoring:")
    md.push("")
    md.push("| Alert Level | Count | Percentage |")
    md.push("|-------------|-------|------------|")
    data.riskAlerts.forEach(item => {
      md.push(`| **${item.category}** | ${item.count.toLocaleString()} | ${Number(item.percentage).toFixed(1)}% |`)
    })
    md.push("")
    md.push("### At-Risk Calculation")
    md.push("")
    md.push("Students are flagged as at-risk if they meet ANY of these conditions:")
    md.push("- Retention = 0 (not retained)")
    md.push("- Persistence = 0 (did not persist term-to-term)")
    md.push("- GPA < 2.0")
    md.push("- Course Completion Rate < 60%")
    md.push("")
    
    // Retention Risk
    md.push("## Retention Risk Categories")
    md.push("")
    md.push("Distribution based on ML-predicted retention probability:")
    md.push("")
    md.push("| Risk Category | Count | Percentage |")
    md.push("|---------------|-------|------------|")
    data.retentionRisk.forEach(item => {
      md.push(`| **${item.category}** | ${item.count.toLocaleString()} | ${Number(item.percentage).toFixed(1)}% |`)
    })
    md.push("")
    
    // Model Info
    md.push("## Predictive Models")
    md.push("")
    md.push("### Model 1: Retention Prediction")
    md.push("- **Algorithm:** XGBoost Classifier")
    md.push("- **Accuracy:** 52.2%")
    md.push("- **Features:** 31 (demographics, academic prep, course performance)")
    md.push("- **Top Predictors:** Math Placement (35.1%), Passing Rate (3.0%), GPA Year 1 (2.9%)")
    md.push("")
    md.push("### Model 2: Early Warning System")
    md.push("- **Type:** Composite Risk Score")
    md.push("- **Components:** Retention probability (50%), GPA (20%), Completion rate (20%), Credits (10%)")
    md.push("")
    
    // Recommendations
    md.push("## Recommended Actions")
    md.push("")
    const urgentCount = data.riskAlerts.find(r => r.category === "URGENT")?.count || 0
    const highCount = data.riskAlerts.find(r => r.category === "HIGH")?.count || 0
    md.push(`### URGENT Alerts (${urgentCount.toLocaleString()} students)`)
    md.push("- Immediate advisor outreach (within 48 hours)")
    md.push("- Financial aid review")
    md.push("- Tutoring referrals")
    md.push("- Course load adjustment")
    md.push("")
    md.push(`### HIGH Risk (${highCount.toLocaleString()} students)`)
    md.push("- Priority intervention within 1 week")
    md.push("- Academic skills workshops")
    md.push("- Peer mentoring programs")
    md.push("- Regular check-ins")
    md.push("")
    
    md.push("---")
    md.push("")
    md.push("*Report generated by Student Success Dashboard*")
    
    const markdown = md.join("\n")
    downloadFile(markdown, "student-success-report.md", "text/markdown")
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={disabled}>
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Download As</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          CSV Data File
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} className="gap-2">
          <FileJson className="h-4 w-4" />
          JSON Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToMarkdown} className="gap-2">
          <FileText className="h-4 w-4" />
          Markdown Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

