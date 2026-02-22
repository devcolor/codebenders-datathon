# DevColor Schools API

A RESTful API for accessing educational institution data across multiple schools and databases. This service provides standardized access to student, course, and financial aid information.

## Features

- **Multiple Institution Support**: Access data from multiple educational institutions through a unified API
- **Standardized Endpoints**: Consistent API structure across all institutions
- **Pagination**: Built-in support for large datasets
- **Filtering**: Query specific data subsets using query parameters
 - **Data Uploads**: Upload CSV/Excel to append data with dynamic column mapping (see Data Upload section)
 - **New Datasets**: Access LLM recommendations and analysis-ready tables across all databases

## Prerequisites

- Python 3.8+
- MySQL/MariaDB
- pip (Python package manager)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/syntex-data/devcolor-backend-schools.git
   cd devcolor-backend-schools
   ```

2. **Set up a virtual environment**
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1  # Windows
   source venv/bin/activate      # Linux/Mac
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Copy `.env.example` to `.env` and update with your database credentials:
   ```
   DB_HOST=your_database_host
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_PORT=3306
   ```

## Running the API

Start the development server:
```bash
uvicorn api.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Available Endpoints

### Institution Endpoints

- `GET /` - List all available institutions
- `GET /{institution_code}/` - Get institution details

### Data Endpoints

### Supported Institutions

| Code  | Full Name | Database Name |
|-------|-----------|---------------|
| AL    | Bishop State Community College | `Bishop_State` |
| CSUSB | California State University, San Bernardino | `CSUSB` |
| KCTCS | Kentucky Community and Technical College System | `KCTCS` |
| KY    | Thomas More University | `Thomas_More` |
| OH    | University of Akron | `Akron` |

For each institution, the following endpoints are available:

#### Cohorts
- `GET /{institution_code}/cohorts` - List cohorts
- `GET /{institution_code}/cohort/count` - Get count of cohorts

#### Courses
- `GET /{institution_code}/courses` - List courses
- `GET /{institution_code}/course/count` - Get count of courses

#### Financial Aid
- `GET /{institution_code}/financial-aid` - List financial aid records
- `GET /{institution_code}/financial_aid/count` - Get count of financial aid records

#### LLM Recommendations
- `GET /{institution_code}/llm-recommendations` - List LLM recommendation records
- `GET /{institution_code}/llm_recommendations/count` - Get count of LLM recommendation records

#### Analysis-Ready Data
- `GET /{institution_code}/analysis-ready` - List analysis-ready records
- `GET /{institution_code}/ar_{institution_code}/count` - Get count of analysis-ready records

## Data Upload Feature

- Quick start: see `QUICKSTART_UPLOAD.md`
- Full documentation: see `UPLOAD_FEATURE_README.md`
- Endpoints are available under `/upload` in Swagger UI.

## Query Parameters

### Pagination
- `limit`: Number of records to return (default: 100, max: 1000)
- `offset`: Number of records to skip (default: 0)

Example:
```
/AL/cohorts?limit=10&offset=20
```

## Response Format

All endpoints return JSON responses with the following structure:

```json
{
  "data": [
    // Array of records
  ],
  "count": 123,  // Total number of records
  "page": 1,     // Current page
  "total_pages": 13  // Total number of pages
}
```

## Error Handling

Standard HTTP status codes are used to indicate success or failure:

- `200 OK`: Request was successful
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Docker Setup

### Building the Docker Image

### Using Docker

1. **Build the Docker image:**
```bash
docker build -f docker/Dockerfile -t devcolor-backend:latest .
```

2. **Run the container:**
```bash
docker run -p 8000:8000 --env-file .env devcolor-backend:latest
```

### Using Docker Compose

1. **Run with Docker Compose:**
```bash
docker-compose -f docker/docker-compose.yml up -d
```

2. **Stop the services:**
```bash
docker-compose -f docker/docker-compose.yml down
```

## CI/CD with GitHub Actions

This project includes automated Docker image building and deployment using GitHub Actions.

### Setting up GitHub Actions

1. **Create the workflow directory:**
```bash
mkdir -p .github/workflows
```

2. **Create the GitHub Actions workflow file** `.github/workflows/docker-build.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: \\\{\\\{ secrets.DOCKER_USERNAME \\\\}\\\\}
        password: \\\{\\\{ secrets.DOCKER_PASSWORD \\\\}\\\\}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: \\\{\\\{ secrets.DOCKER_USERNAME \\\\}\\\\}/devcolor-backend:prod
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

### Required GitHub Secrets

Add the following secrets to your GitHub repository settings:

- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub access token

### Workflow Triggers

The workflow runs automatically on:
- Pushes to `main` or `develop` branches
- Pull requests to the `main` branch

The Docker image will be tagged and pushed to Docker Hub (or your configured registry).

**Install required packages:**
```bash
pip install -r requirements.txt
```

**Configure database connection in `.env`:**
```
DB_HOST=your_database_host
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=3306
```

## Database Structure

Each database in this project contains the following three tables:
- `financial_aid`: Contains financial aid information for students
- `course`: Contains course-related data
- `cohort`: Contains cohort information for tracking student groups

## Database Setup

### 1. Create Databases and Tables
```bash
python db_operations/db_setup.py
```

This creates 5 databases with 3 tables each:
- Bishop_State_Community_College (AL)
- California_State_University_San_Bernardino (CSUSB)
- Kentucky_Community_and_Technical_College_System (KCTCS)
- Thomas_More_University (KY)
- University_of_Akron (OH)

## Data Summary

**Per Database:**
- Course Records: 200
- Financial Aid Records: 100
- Total per school: 350 records

**Grand Total: 1,750 records across all databases**


## Join-Ready Structure

All tables include a `school` column with matching acronyms (AL, CSUSB, KCTCS, KY, OH) for easy joins across:
- course <-> cohort <-> financial_aid

**Table Relationships:**
- Each table has an auto-incrementing `id` field (PRIMARY KEY) for unique record identification
- Tables can be joined using the `school` column to relate data across institutions
- The `id` fields serve as primary keys for referential integrity when creating relationships
- Example join: `SELECT * FROM course c JOIN cohort co ON c.school = co.school WHERE c.school = 'AL'`

## Fallback Generation

If Ollama is not available or fails, scripts automatically use rule-based synthetic data generation to ensure data is always created.

## Project Structure

```
devcolor-backend/
├── api/
│   ├── __init__.py
│   ├── main.py                   # FastAPI app and router registration
│   ├── schemas.py                # Pydantic models
│   └── routers/
│       ├── __init__.py
│       ├── al.py                 # AL endpoints (incl. new endpoints)
│       ├── csusb.py              # CSUSB endpoints (incl. new endpoints)
│       ├── kctcs.py              # KCTCS endpoints (incl. new endpoints)
│       ├── ky.py                 # KY endpoints (incl. new endpoints)
│       ├── oh.py                 # OH endpoints (incl. new endpoints)
│       └── upload.py             # Data upload endpoints
├── db_operations/
│   ├── __init__.py
│   ├── connection.py             # DB connection utilities
│   ├── db_setup.py               # Database setup and table creation
│   ├── add_dynamic_columns.py    # Migration for dynamic upload columns
│   ├── upload_handler.py         # Upload processing logic
│   └── generate_db_summary.py    # Database summary generation
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── testscripts/
│   ├── check_databases.py
│   ├── check_schema.py
│   ├── check_tables.py
│   ├── count_records.py
│   └── test_new_endpoints.py
├── requirements.txt              # Python dependencies
├── README.md                     # This file
├── QUICKSTART_UPLOAD.md          # Upload quick start
├── UPLOAD_FEATURE_README.md      # Upload feature docs
└── NEW_ENDPOINTS_SUMMARY.md      # Summary of new endpoints
