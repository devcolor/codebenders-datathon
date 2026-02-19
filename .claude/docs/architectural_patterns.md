# Architectural Patterns

This document describes architectural patterns used consistently across this codebase.

## API Design Patterns

### Route Structure
All Next.js API routes export explicit HTTP method handlers. See:
- `codebenders-dashboard/app/api/analyze/route.ts:82-87`
- `codebenders-dashboard/app/api/dashboard/kpis/route.ts:22`
- `codebenders-dashboard/app/api/execute-sql/route.ts:33`

### Error Response Standardization
Consistent error structure: `{ error: string, details?: string }` with appropriate HTTP status codes (400 for bad requests, 404 for not found, 500 for server errors). See:
- `codebenders-dashboard/app/api/dashboard/kpis/route.ts:54-59`
- `codebenders-dashboard/app/api/execute-sql/route.ts:72-78`
- `codebenders-dashboard/app/api/analyze/route.ts:212-218`

### Console Logging with Prefixes
Debug logs use module prefixes for traceability (e.g., `[analyze]`, `[v0]`). See:
- `codebenders-dashboard/app/api/analyze/route.ts:83-211`
- `codebenders-dashboard/lib/query-executor.ts:11-72`

## Database Access Patterns

### Connection Pooling (TypeScript)
Lazy-initialized singleton pg Pool prevents connection exhaustion:
- `codebenders-dashboard/lib/db.ts` - `getPool()` singleton

Key config: `max: 10`, pool error handler registered on init

### Connection Pooling (Python)
psycopg2 with connection pooling via SQLAlchemy:
- `operations/db_utils.py` - `get_connection()`, `get_sqlalchemy_engine()`
- `operations/db_config.py` - Centralized DB_CONFIG

### Parameterized Queries
All dynamic queries use `$1`, `$2` placeholders (Postgres style) with params arrays to prevent SQL injection:
- `codebenders-dashboard/app/api/dashboard/readiness/route.ts:47-96`

### Bulk Data Insertion
Chunked DataFrame insertion (1000 records/batch) with progress tracking:
- `operations/db_utils.py:49-117` - `save_dataframe_to_db()`

## React/Next.js Patterns

### Independent State Variables
Multiple `useState` hooks for different data domains instead of single state object:
- `codebenders-dashboard/app/page.tsx:51-58`
- `codebenders-dashboard/app/query/page.tsx:27-32`

### Parallel Data Fetching
`Promise.all()` for concurrent API calls:
- `codebenders-dashboard/app/page.tsx:67-81`

### Component Loading States
Three-state rendering pattern: loading skeleton → error message → content:
- `codebenders-dashboard/components/kpi-card.tsx:19-59`
- `codebenders-dashboard/components/risk-alert-chart.tsx:47-84`

## ML Pipeline Patterns

### Feature Engineering Pipeline
Sequential stages: data loading → feature engineering → preprocessing → training → evaluation → storage:
- `ai_model/complete_ml_pipeline.py:91-179` - Target variable calculation
- `ai_model/complete_ml_pipeline.py:189-223` - Feature set definitions

### Preprocessing with Label Encoding
Centralized preprocessing: median imputation for numeric, "Unknown" for categorical, LabelEncoder for object types:
- `ai_model/complete_ml_pipeline.py:232-256` - `preprocess_features()`

### Model Performance Tracking
Metrics saved to `ml_model_performance` table after each training run:
- `operations/db_utils.py:159-210` - `save_model_performance()`

## Component Patterns

### TypeScript Props Interfaces
All components define explicit prop interfaces with optional loading/error fields:
- `codebenders-dashboard/components/kpi-card.tsx:5-16`
- `codebenders-dashboard/components/risk-alert-chart.tsx:13-17`

### Chart Color Mapping
Centralized color dictionaries mapping semantic values to hex colors:
- `codebenders-dashboard/components/risk-alert-chart.tsx:19-24`
- `codebenders-dashboard/components/retention-risk-chart.tsx:19-24`

Colors: LOW=#22c55e (green), MODERATE=#eab308 (yellow), HIGH=#f97316 (orange), URGENT=#ef4444 (red)

### Multi-Format Export
Single component handles CSV, JSON, Markdown exports via `downloadFile()` utility:
- `codebenders-dashboard/components/export-button.tsx:25-209`

## Configuration Patterns

### Environment Variable Hierarchy
ENV vars with fallback defaults for development:
- `codebenders-dashboard/app/api/dashboard/readiness/route.ts:4-10`

### Schema Configuration Constants
Database schema metadata as constants for multi-institution support:
- `codebenders-dashboard/app/api/analyze/route.ts:22-79` - SCHEMA_INFO
- `codebenders-dashboard/lib/prompt-analyzer.ts:4-28` - SCHEMA_CONFIG

## Error Handling Patterns

### Try-Catch with Typed Errors
All API routes wrap operations in try-catch, return structured errors with stack traces logged:
- `codebenders-dashboard/app/api/analyze/route.ts:209-220`
- `codebenders-dashboard/app/api/execute-sql/route.ts:65-79`

### Python Status Reporting
Visual status indicators with `print()` statements:
- `operations/db_utils.py` - Uses `✓` for success, `✗` for failure
- Section headers with `"=" * 80`

## Data Transformation Patterns

### JSON Field Parsing
Parse JSON columns from DB, aggregate values, handle parse errors gracefully:
- `codebenders-dashboard/app/api/dashboard/readiness/route.ts:119-157`

### Query Plan to SQL Conversion
Semantic query plans translated to SQL using schema-aware column mapping:
- `codebenders-dashboard/lib/prompt-analyzer.ts:30-174`
