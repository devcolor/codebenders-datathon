# Product Requirements Document (PRD)

**Project Title:** AI-Powered Student Success Analytics  
**Hackathon Theme:** Data, AI/ML, and Visualization for Higher Education  

**Institutions Involved:**
- Kentucky Community & Technical College System (KCTCS)
- Bishop State Community College
- University of Akron

## 1. Overview

This project aims to create a unified AI-powered analytics and visualization platform that improves student readiness, retention, and institutional decision-making across diverse higher-education systems.

The solution will connect existing institutional data pipelines (PDP, AR files, and internal data warehouses) to produce real-time dashboards, predictive insights, and natural language query capabilities.

## 2. Problem Statement

| Institution | Primary Challenges |
|-------------|-------------------|
| KCTCS | - Underprepared students not visible in weekly enrollment reports.<br>- Limited insight into readiness metrics.<br>- Need to integrate PDP/AR data for proactive interventions. |
| Bishop State | - Fragmented data access (single PDP admin).<br>- Difficulty generating reports without IT intervention.<br>- Need for AI-assisted dashboards and chat interfaces for faculty and leadership. |
| University of Akron | - PDP dashboards underutilized.<br>- Data is siloed (SharePoint, PowerBI).<br>- Opportunity to use 8 years of PDP data for predictive modeling of student success and retention. |
## 3. Goals and Objectives

- **Data Integration:** Automate ingestion and harmonization of PDP, AR, and institutional datasets.
- **AI Insights:** Empower non-technical users to ask natural language questions and generate dashboards instantly.
- **Predictive Analytics:** Forecast retention rates and student outcomes based on historical and real-time data.
- **Accessibility:** Democratize access to institutional data for advisors, faculty, and leadership.
- **Impact:** Improve student retention by 5–15% and enable early intervention strategies.

## 4. Target Users

| Role | Needs |
|------|-------|
| Advisors | Identify at-risk students, access real-time dashboards, and personalize interventions. |
| Faculty | View course combinations linked to student drop/failure/withdraw rates. |
| Institutional Research Teams | Automate PDP validation, track submission errors, and monitor readiness metrics. |
| Leadership / Deans | Export insights and visualizations for board presentations and grant proposals. |
## 5. Key Features

### 5.1 AI-Powered Dashboard

- **Natural Language Query Interface:** Ask, e.g., "Show first-year students not passing gateway courses."
- **Instant Visualization:** Auto-generate PowerBI-style charts or graphs.
- **Weekly Refresh:** Integrate with institutional data warehouses for near-real-time updates.

### 5.2 Predictive Analytics Module

- **Retention Forecasting:** Predict which cohorts are at risk.
- **Readiness Scoring:** Quantify preparedness using DFWI and gateway completion data.
- **Trend Identification:** Analyze course combinations correlated with success/failure.

### 5.3 Data Integration Layer

- **Connectors:** PDP, AR, CSV, SharePoint, Oracle (PeopleSoft), AWS Data Warehouse.
- **Validation Script:** Python-based PDP file checker to ensure format compliance before submission.
- **Storage:** Unified schema in Supabase (PostgreSQL) for hackathon MVP.

### 5.4 Visualization and Reporting

- **Role-Based Dashboards:** Advisors, Leadership, IR teams.
- **Export Formats:** CSV, PDF, or embedded dashboards for presentations.

**KPI Examples:**
- Retention % by cohort
- Readiness Index by major
- Gateway course completion rate
- DFWI ratio by course sequence

## 6. Architecture Overview

**Data Flow:**

```
Institutional Systems (PDP, AR, Oracle, CSV)
         ↓
Data Ingestion Layer (ETL/Conduit/Custom Python Pipelines)
         ↓
Supabase (PostgreSQL + APIs)
         ↓
AI Query Engine (LangChain + OpenAI API)
         ↓
Visualization Layer (Streamlit/PowerBI/React Dashboard)
```

**Proposed Tools:**

- **Backend:** Supabase (data access + API endpoints + Auth)
- **Data Pipeline:** Conduit (Meroxa) or Airbyte
- **Database:** Supabase (Postgres)
- **Frontend:** React + PowerBI Embedded / Streamlit
- **ML/AI:** Scikit-Learn / Hugging Face Transformers / LangChain
- **Hosting:** AWS / Fly.io

## 7. Success Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Retention Prediction Accuracy | ML model accuracy predicting at-risk students | ≥ 85% |
| Dashboard Latency | Time to visualize query results | ≤ 5 seconds |
| Data Refresh Frequency | Automatic weekly refresh | 1x/week |
| User Adoption | Number of unique advisors/faculty using dashboards | +25% per semester |
| ROI Impact | Estimated revenue preserved from improved retention | ≥ $500K/year per institution |

## 8. Roadmap (24-Hour Sprint)

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 – Discovery & Setup | 3 hours | Data mapping, Supabase setup, schema design, MVP scope |
| Phase 2 – Data Pipeline & Dashboard | 8 hours | ETL pipeline, Supabase integration, basic dashboard prototype |
| Phase 3 – AI Layer & Analytics | 8 hours | Natural language querying, basic predictive model, visualizations |
| Phase 4 – Polish & Demo Prep | 5 hours | Bug fixes, presentation deck, live demo rehearsal, documentation |

## 9. Potential Extensions

- **Real-Time Alerts:** Weekly email alerts to advisors highlighting high-risk students.
- **Chatbot Interface:** "Ask your data" using a chat widget integrated into PowerBI.
- **Course Optimization Tool:** Suggest ideal course sequences to reduce DFWI rates.
- **Benchmark Dashboard:** Compare institution metrics against state or national averages.

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Data privacy (FERPA/PII) | Anonymize data before AI processing; use secure storage. |
| Inconsistent PDP formats | Use automated validation and schema mapping. |
| Limited hackathon time | Focus MVP on one institution dataset and scale post-demo. |
| Adoption resistance | Include faculty in pilot feedback loop; show time saved. |
## 11. Deliverables for Hackathon Presentation

- Live dashboard demo
- Short AI query walkthrough
- Sample predictive report
- Visual architecture diagram
- One-page ROI summary per institution