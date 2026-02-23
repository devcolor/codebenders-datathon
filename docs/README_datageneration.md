# DevColor Data Generation

This project contains scripts for setting up MariaDB databases and generating synthetic data for educational institutions using local or cloud-based LLMs.

## Project Structure Overview

This project is organized into four main components:

### **data/** - Seed Data
Contains original seed data files (Excel/CSV) used as templates for generating synthetic data. These files provide the structure and examples for cohort, course, and financial aid data.

### **dboperations/** - Database Operations
All database setup, management, and testing utilities:
- Database creation and table setup
- Record counting and summary generation
- Database testing and verification scripts
- Prediction table creation

### **llm/** - LLM Operations
Scripts for generating and managing LLM-based student recommendations:
- Student readiness assessments
- LLM recommendation table management
- Progress monitoring and viewing recommendations

### **generate_data/** - Data Generation
School-specific synthetic data generation scripts organized by institution:
- Individual school data generators (AL, CSUSB, KCTCS, KY, OH)
- Shared configuration and utilities
- Master scripts for bulk generation

## Prerequisites

### 1. Choose Your LLM Provider (Ollama or AWS Bedrock)

#### Option 1: Ollama (Recommended for local development)
**Installation:**
- **Windows:**
  1. Go to [ollama.ai](https://ollama.ai) and download the Windows installer
  2. Run the installer and follow setup instructions
  3. Alternative: `winget install Ollama.Ollama`

**Start Ollama Service:**
```bash
ollama serve
```

**Install Mistral Model:**
```bash
ollama pull mistral
```

**System Requirements:**
- RAM: At least 8GB (16GB recommended)
- Storage: 4-8GB for model files
- CPU: Any modern CPU (more cores = faster generation)

#### Option 2: AWS Bedrock (For production use)
**Requirements:**
- AWS account with Bedrock access
- IAM user with `bedrock:InvokeModel` permissions
- AWS CLI configured with valid credentials

**Environment Variables:**
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=your_region
```

### 2. MariaDB Database Setup

This project uses MariaDB as the database system. You can run it locally or connect to a remote instance.

#### Option 1: Local MariaDB Installation (Recommended for development)

**Windows:**
1. Download MariaDB from [mariadb.org](https://mariadb.org/download/)
2. Run the installer and follow setup instructions
3. Note the root password you set during installation
4. MariaDB will run as a Windows service

**Verify Installation:**
```bash
mysql --version
```

**Connect to MariaDB:**
```bash
mysql -u root -p
```

#### Option 2: Remote MariaDB/MySQL Server

Connect to an existing MariaDB or MySQL server by configuring the connection details in `.env`.

### 3. Python Environment Setup

**Create virtual environment:**
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Install required packages:**
```bash
pip install -r requirements.txt
```

**Configure database connection in `.env`:**
```
DB_HOST=localhost          # Use 'localhost' for local MariaDB or remote host IP
DB_USER=root               # Your database username
DB_PASSWORD=your_password  # Your database password
DB_PORT=3306              # Default MariaDB/MySQL port
```

---

## Development Environment Options

### Cloud Database vs Local Database

This project supports both local and cloud-based database development. Choose the option that best fits your development needs:

#### **Local Database Development (Recommended for Development)**

**Advantages:**
- **Fast Development Cycle**: No network latency for database operations
- **Offline Development**: Work without internet connectivity
- **Full Control**: Complete control over database configuration and data
- **Cost-Effective**: No cloud hosting costs during development
- **Privacy**: All data stays on your local machine

**Best For:**
- Initial development and testing
- Learning the codebase
- Experimenting with data generation
- Working with synthetic data only

**Setup:**
- Install MariaDB locally (see Prerequisites section)
- Use `DB_HOST=localhost` in your `.env` file
- All database operations run on your local machine

#### **Cloud Database Development (Recommended for Production/Team)**

**Advantages:**
- **Team Collaboration**: Shared database access for multiple developers
- **Production-Like Environment**: Test against cloud infrastructure
- **Scalability**: Handle larger datasets and concurrent users
- **Backup & Recovery**: Automated backups and disaster recovery
- **Remote Access**: Access from anywhere with internet

**Best For:**
- Team development projects
- Production deployments
- Working with large datasets
- Multi-developer collaboration
- Integration testing

**Setup:**
- Use a cloud MariaDB service (AWS RDS MariaDB, Google Cloud SQL MariaDB, etc.)
- Configure remote connection details in `.env`:
  ```
  DB_HOST=your-cloud-mariadb-host.com
  DB_USER=your_username
  DB_PASSWORD=your_password
  DB_PORT=3306
  ```
- Ensure proper security groups/firewall rules for database access

#### **Choosing Your Database Setup**

Choose **ONE** of the following options for your development environment:

**Option 1: Local MariaDB Server**
```bash
# In your .env file
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_PORT=3306
```

**Option 2: Cloud MariaDB Server**
```bash
# In your .env file
DB_HOST=your-cloud-mariadb-host.com
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=3306
```

All scripts and operations work identically with either setup.

---

## Database Operations

### Database Structure

The project manages 5 institutional databases:
- **Bishop_State_Community_College** (AL)
- **California_State_University_San_Bernardino** (CSUSB)
- **Kentucky_Community_and_Technical_College_System** (KCTCS)
- **Thomas_More_University** (KY)
- **University_of_Akron** (OH)

Each database contains core tables:
- `cohort` - Student cohort information
- `course` - Course enrollment data
- `financial_aid` - Financial aid records
- `llm_recommendations` - LLM-generated student recommendations
- `ar_*` - Analysis-ready tables (school-specific)

### Setup Commands

**Create all databases and tables:**
```bash
python dboperations/db_setup.py
```

**Test database connection:**
```bash
python dboperations/testing/test_db_connection.py
```

**Count records across all databases:**
```bash
python dboperations/count_records.py
```

**Generate Excel summary of all databases:**
```bash
python dboperations/generate_db_summary.py
```

**Create prediction tables:**
```bash
python dboperations/create_prediction_tables.py
```

**View database schemas:**
```bash
python dboperations/view_schema.py                    # View all databases
python dboperations/view_schema.py --database AL     # View specific database
python dboperations/view_schema.py --table cohort    # View specific table
python dboperations/view_schema.py --overview        # Overview only
```

See `dboperations/README.md` for complete documentation.

---

## Data Generation

### Structure

Data generation scripts are organized by school in `generate_data/schools/`:

```
generate_data/schools/
├── shared/
│   └── config.py                 # Shared database configuration
├── AL/                           # Bishop State Community College
│   ├── cohort.py
│   ├── course.py
│   ├── financial_aid.py
│   └── generate_all.py
├── CSUSB/                        # California State University San Bernardino
├── KCTCS/                        # Kentucky Community and Technical College System
├── KY/                           # Thomas More University
├── OH/                           # University of Akron
└── generate_all_schools.py       # Master script for all schools
```

### Generation Commands

**Generate data for all schools:**
```bash
cd generate_data/schools
python generate_all_schools.py
```

**Generate data for a specific school:**
```bash
cd generate_data/schools/AL
python generate_all.py
```

**Generate specific data types:**
```bash
cd generate_data/schools/AL
python cohort.py           # Cohort records
python course.py           # Course records
python financial_aid.py    # Financial aid records
```

### Data Generation Features
- Uses LLM (Ollama/Bedrock) for realistic synthetic data
- Falls back to rule-based generation if LLM unavailable
- All records marked with `dataset_type = 'S'` (Synthetic)
- Includes `school` column for cross-database joins

---

## LLM Operations

### Student Readiness Recommendations

Generate AI-powered student readiness assessments using LLM:

**Add LLM recommendations table to all databases:**
```bash
python llm/add_llm_table.py
```

**Generate student readiness recommendations:**
```bash
python llm/llm_student_readiness.py
```

**View recommendations:**
```bash
python llm/view_recommendations.py --database Kentucky_Community_and_Technical_College_System --limit 10
```

**Check generation progress:**
```bash
python llm/check_progress.py
```

### LLM Recommendation Features
- Analyzes student academic performance and risk factors
- Generates personalized readiness scores and recommendations
- Stores results in `llm_recommendations` table
- Tracks model version and prompt version for reproducibility

---

## Seed Data

The `data/` folder contains original seed data files used as templates:
- Excel files with cohort, course, and financial aid structures
- Analysis-ready file templates
- Prediction schema definitions

These files serve as the foundation for generating realistic synthetic data.

---

## Data Summary

**Current Population (Synthetic Data from seed_data01):**
- Total Cohorts: 21 (3-5 per school)
- Total Students: 21,153 (500-1,500 per cohort)
- Total Course Enrollments: 105,726 (4-6 per student)
- Total Financial Aid Records: 21,153 (1 per student)

**Grand Total: 126,900 records across all databases**

All records are marked with `dataset_type = 'S'` (Synthetic). Future real data will be marked with 'R'.

---

## Database Schema

For detailed table structures, column definitions, and relationships, see **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**.

### Table Relationships

**Student-Centric Connections:**
- Tables are linked through `student_id` or `Student_GUID` fields
- `financial_aid.student_id` connects student financial records
- `llm_recommendations.Student_GUID` links AI recommendations to students

**Institution-Centric Connections:**
- All tables include a `school` column (AL, CSUSB, KCTCS, KY, OH)
- `llm_recommendations.Institution_ID` provides institutional linking
- Cross-database joins possible using `school` column

**Example Joins:**
```sql
-- Get all data for a specific school
SELECT * FROM course c 
JOIN cohort co ON c.school = co.school 
WHERE c.school = 'AL';

-- Get student financial aid and recommendations
SELECT fa.*, lr.* FROM financial_aid fa
JOIN llm_recommendations lr ON fa.student_id = lr.Student_GUID
WHERE fa.school = 'AL';
```

---

## Complete File Structure

```
devcolor-data-gen/
├── .env                          # Database configuration
├── requirements.txt              # Python dependencies
├── DATABASE_SCHEMA.md            # Complete database schema documentation
├── data/                         # Seed data files
│   └── course_analysis_ready_file_template_Identified_01_27_25.xlsx
├── dboperations/                 # Database operations and utilities
│   ├── README.md                 # Database operations documentation
│   ├── db_setup.py               # Creates databases and tables
│   ├── count_records.py          # Counts records in all tables
│   ├── generate_db_summary.py    # Generates Excel summary of databases
│   ├── view_schema.py            # View database schemas and table structures
│   ├── create_complete_seed_structure.py  # Seed data structure creation
│   ├── create_prediction_tables.py        # Create prediction tables
│   ├── create_kctcs_prediction_tables.py  # KCTCS-specific prediction tables
│   └── testing/                  # Database testing and verification
│       ├── test_db_connection.py # Tests database connection
│       ├── verify_*.py           # Various verification scripts
│       └── display_schema.py     # Display database schemas
├── llm/                          # LLM-related operations
│   ├── add_llm_table.py          # Add LLM recommendations table
│   ├── llm_student_readiness.py  # Generate student readiness recommendations
│   ├── view_recommendations.py   # View LLM recommendations
│   ├── check_progress.py         # Check recommendation progress
│   └── alter_add_school_column.py  # Add school column to tables
└── generate_data/                # Synthetic data generation scripts
    ├── schools/                  # School-based generation scripts
    │   ├── shared/config.py      # Shared configuration
    │   ├── AL/                   # Bishop State Community College
    │   ├── CSUSB/                # California State University San Bernardino
    │   ├── KCTCS/                # Kentucky Community and Technical College System
    │   ├── KY/                   # Thomas More University
    │   ├── OH/                   # University of Akron
    │   └── generate_all_schools.py
    └── archive/                  # Old data-type-based scripts (for reference)
```
