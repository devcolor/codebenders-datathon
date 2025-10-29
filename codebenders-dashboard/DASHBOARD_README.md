# KCTCS Student Success Dashboard

## Overview

A modern, interactive dashboard for visualizing student success metrics and predictive analytics for KCTCS (Kentucky Community and Technical College System).

## Features

### 📊 Executive Dashboard (Home Page - `/`)

The main dashboard displays three key visualizations:

#### 1. **KPI Cards** (Top Row)
Four prominent metric cards showing:
- **Overall Retention Rate**: Actual retention percentage across all students
- **Avg Predicted Retention**: ML model's average retention probability prediction
- **Students at High/Critical Risk**: Count of students requiring immediate intervention
- **Avg Course Completion**: Average rate of credits earned vs attempted

#### 2. **Risk Alert Distribution** (Donut Chart)
Visual breakdown of students by risk alert level:
- 🟢 **LOW**: Students with minimal risk
- 🟡 **MODERATE**: Students with moderate intervention needs
- 🟠 **HIGH**: Students requiring significant support
- 🔴 **URGENT**: Students needing immediate intervention

Shows both counts and percentages for each category.

#### 3. **Retention Risk Funnel** (Horizontal Bar Chart)
Distribution of students across retention risk categories:
- **Critical Risk**: Highest priority students
- **High Risk**: Students at significant risk of not being retained
- **Moderate Risk**: Students requiring monitoring
- **Low Risk**: Students on track for retention

Color-coded from red (critical) to green (low risk).

### 🔍 SQL Query Interface (`/query`)

Advanced query interface for custom data analysis:
- Natural language to SQL conversion
- Support for multiple institutions (KCTCS, Bishop State, etc.)
- Direct database or API mode
- Interactive visualizations (line, bar, pie charts, tables)
- Query plan visualization

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Charts**: Recharts 2.15
- **Styling**: Tailwind CSS
- **Components**: Radix UI (shadcn/ui)
- **Database**: MySQL (via mysql2)
- **Icons**: Lucide React

## Project Structure

```
codebenders-dashboard/
├── app/
│   ├── page.tsx                          # Main dashboard (home)
│   ├── query/
│   │   └── page.tsx                      # SQL query interface
│   ├── api/
│   │   ├── dashboard/
│   │   │   ├── kpis/route.ts            # KPI metrics endpoint
│   │   │   ├── risk-alerts/route.ts     # Risk alert data endpoint
│   │   │   └── retention-risk/route.ts  # Retention risk data endpoint
│   │   ├── analyze/route.ts             # LLM-powered query analysis
│   │   └── execute-sql/route.ts         # Direct SQL execution
│   ├── layout.tsx                        # Root layout
│   └── globals.css                       # Global styles
├── components/
│   ├── kpi-card.tsx                     # Reusable KPI card component
│   ├── risk-alert-chart.tsx             # Risk alert donut chart
│   ├── retention-risk-chart.tsx         # Retention risk bar chart
│   ├── analysis-result.tsx              # Query result visualization
│   ├── query-plan-panel.tsx             # Query plan display
│   └── ui/                              # shadcn/ui components
├── lib/
│   ├── types.ts                         # TypeScript type definitions
│   ├── prompt-analyzer.ts               # Query analysis logic
│   ├── query-executor.ts                # SQL execution logic
│   └── utils.ts                         # Utility functions
└── package.json
```

## Database Schema

The dashboard queries the `student_predictions` table, which contains:

- **32,800 students** from KCTCS
- **Demographics**: Age, race, gender, first-gen status, etc.
- **Academic metrics**: GPA, credits earned, course completion rates
- **Enrollment data**: Cohort, term, program of study
- **Gateway courses**: Math and English completion status
- **ML Predictions**:
  - Retention probability and predictions
  - Risk scores and categories
  - At-risk alerts (LOW/MODERATE/HIGH/URGENT)
  - Predicted credential types and graduation years
  - Predicted GPA and performance categories

See `/kctcs_student_level_with_predictions_schema.json` for the complete schema.

## API Endpoints

### Dashboard APIs

#### `GET /api/dashboard/kpis`
Returns overall KPI metrics:
```json
{
  "overallRetentionRate": "XX.X",
  "avgPredictedRetention": "XX.X",
  "highCriticalRiskCount": 1234,
  "avgCourseCompletionRate": "XX.X",
  "totalStudents": 32800
}
```

#### `GET /api/dashboard/risk-alerts`
Returns risk alert distribution:
```json
{
  "data": [
    {
      "category": "LOW",
      "count": 4146,
      "percentage": 12.6
    },
    // ... more categories
  ]
}
```

#### `GET /api/dashboard/retention-risk`
Returns retention risk categories:
```json
{
  "data": [
    {
      "category": "Critical Risk",
      "count": 242,
      "percentage": 0.7
    },
    // ... more categories
  ]
}
```

### Query APIs

#### `POST /api/analyze`
Analyzes natural language prompts and generates SQL queries.

#### `POST /api/execute-sql`
Executes SQL queries directly against the database.

## Environment Variables

Create a `.env.local` file:

```env
# Database Configuration
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_PORT=3306
DB_NAME=pdp_analytics

# Optional: Enable LLM-powered query analysis
NEXT_PUBLIC_ENABLE_LLM=0

# If using LLM features
OPENAI_API_KEY=your-openai-key
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL database with `student_predictions` table

### Installation

1. Install dependencies:
```bash
cd codebenders-dashboard
npm install
```

2. Set up environment variables:
```bash
cp ../env.example .env.local
# Edit .env.local with your database credentials
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Viewing the Dashboard
1. Navigate to the home page (`/`)
2. View KPI cards at the top showing key metrics
3. Explore the Risk Alert Distribution donut chart
4. Analyze the Retention Risk Funnel bar chart
5. Click "SQL Query Interface" to access custom queries

### Running Custom Queries
1. Navigate to `/query` or click the "SQL Query Interface" button
2. Select an institution (default: KCTCS)
3. Enter a natural language prompt (e.g., "Show retention by cohort")
4. Click "Analyze" to generate and execute the query
5. View results as charts or tables

## Key Insights from Data

Based on the KCTCS dataset:

- **Top Risk Predictor**: Math placement (35.1% feature importance)
- **Risk Distribution**: 
  - 1.5% URGENT (487 students)
  - 25.4% HIGH (8,344 students)
  - 60.4% MODERATE (19,823 students)
  - 12.6% LOW (4,146 students)
- **Retention Categories**:
  - 0.7% Critical Risk
  - 48.0% High Risk
  - 46.3% Moderate Risk
  - 4.9% Low Risk

## Future Enhancements

See `/DASHBOARD_VISUALIZATIONS.md` for a comprehensive list of additional visualizations to implement:

- Retention rate by cohort (line chart)
- GPA performance distribution (box plot)
- Course completion vs retention (scatter plot)
- Demographics and equity analysis
- Geographic analysis (choropleth map)
- Intervention impact simulator

## References

- **Visualization Guide**: `/DASHBOARD_VISUALIZATIONS.md`
- **Schema Documentation**: `/kctcs_student_level_with_predictions_schema.json`
- **Project PRD**: `/AI_Powered_Student_Success_PRD.md`

## License

See `/LICENSE` for details.

## Support

For questions or issues, contact the development team or refer to the project documentation.

