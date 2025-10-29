# Quick Start Guide

## What Was Built

### ✅ New Home Page (`/`)
The main dashboard now displays three key visualizations:

1. **KPI Cards** - Four metrics cards showing:
   - Overall Retention Rate
   - Avg Predicted Retention Probability
   - Students at High/Critical Risk
   - Avg Course Completion Rate

2. **Risk Alert Distribution** - Donut chart showing students by risk level (LOW/MODERATE/HIGH/URGENT)

3. **Retention Risk Funnel** - Horizontal bar chart showing retention risk categories (Critical/High/Moderate/Low)

### ✅ SQL Query Interface (`/query`)
The previous prompt-based query interface has been moved to `/query` for advanced analysis.

### ✅ API Endpoints
Three new dashboard API endpoints:
- `GET /api/dashboard/kpis` - Overall metrics
- `GET /api/dashboard/risk-alerts` - Risk alert distribution
- `GET /api/dashboard/retention-risk` - Retention risk categories

## Running the Dashboard

### 1. Set Up Environment Variables

Make sure your `.env.local` file has the correct database credentials:

```bash
cd codebenders-dashboard
cp ../.env.example .env.local
```

Edit `.env.local`:
```env
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_PORT=3306
DB_NAME=pdp_analytics
```

### 2. Install Dependencies (if not already done)

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Open Your Browser

Navigate to [http://localhost:3000](http://localhost:3000)

You should see:
- Four KPI cards at the top
- A donut chart showing risk alert distribution
- A horizontal bar chart showing retention risk funnel
- A button to access the SQL Query Interface

## Troubleshooting

### "Failed to fetch dashboard data"
- Check that your database credentials in `.env.local` are correct
- Verify the `kcts_student_predictions` table exists in your database
- Check the browser console (F12) for detailed error messages

### Charts show "No data available"
- Verify the database queries are returning data
- Check the API endpoints directly:
  - http://localhost:3000/api/dashboard/kpis
  - http://localhost:3000/api/dashboard/risk-alerts
  - http://localhost:3000/api/dashboard/retention-risk

### Table doesn't exist error
The APIs expect a table named `kcts_student_predictions` with the schema defined in `/kctcs_student_level_with_predictions_schema.json`.

Key columns used:
- `Retention` (0 or 1)
- `retention_probability` (0-1)
- `at_risk_alert` (LOW/MODERATE/HIGH/URGENT)
- `retention_risk_category` (Critical Risk/High Risk/Moderate Risk/Low Risk)
- `course_completion_rate` (0-1)

## Next Steps

To implement additional visualizations from `/DASHBOARD_VISUALIZATIONS.md`:

1. **Retention by Cohort** (Line chart)
2. **GPA Performance Distribution** (Box plot)
3. **Course Completion vs Retention** (Scatter plot)
4. **Demographics Analysis**
5. **Geographic Analysis**

Each follows the same pattern:
1. Create API endpoint in `/app/api/dashboard/`
2. Create chart component in `/components/`
3. Add to home page or create new page

## File Structure

```
New/Modified Files:
├── app/
│   ├── page.tsx                         ← Completely rebuilt with dashboard
│   ├── query/page.tsx                   ← New: SQL query interface
│   ├── layout.tsx                       ← Updated metadata
│   └── api/dashboard/                   ← New API routes
│       ├── kpis/route.ts
│       ├── risk-alerts/route.ts
│       └── retention-risk/route.ts
├── components/
│   ├── kpi-card.tsx                     ← New
│   ├── risk-alert-chart.tsx             ← New
│   └── retention-risk-chart.tsx         ← New
├── DASHBOARD_README.md                  ← New: Full documentation
└── QUICKSTART.md                        ← This file
```

## Tips

- Use the **SQL Query Interface** (`/query`) for ad-hoc analysis
- KPI cards refresh automatically on page load
- All charts are interactive (hover for details)
- Data is fetched in parallel for fast loading

## Support

See `/DASHBOARD_README.md` for comprehensive documentation or `/DASHBOARD_VISUALIZATIONS.md` for the full visualization roadmap.

