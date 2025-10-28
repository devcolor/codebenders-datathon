# Operations Package

Database utilities and configuration for the KCTCS ML Pipeline.

## 📁 Files

### `db_config.py`
Database configuration and credentials for MariaDB.

**Configuration:**
- Host: `devcolor00.czqeeakaypfi.us-west-2.rds.amazonaws.com`
- Database: `Kentucky_Community_and_Technical_College_System`
- Port: `3306`

**Tables:**
- `student_predictions` - Student-level predictions
- `course_predictions` - Course-level predictions
- `ml_model_performance` - Model performance metrics

### `db_utils.py`
Database utility functions for saving data and managing connections.

**Functions:**
- `get_connection()` - Create PyMySQL connection
- `get_sqlalchemy_engine()` - Create SQLAlchemy engine
- `save_dataframe_to_db()` - Save DataFrame to database in batches (10k records per batch)
- `create_model_performance_table()` - Create performance tracking table
- `save_model_performance()` - Save model metrics
- `test_connection()` - Test database connectivity

### `test_db_connection.py`
Script to test database connection and verify credentials.

**Usage:**
```bash
python -m operations.test_db_connection
```

## 🚀 Usage

### Import in Python Scripts

```python
from operations.db_utils import save_dataframe_to_db, test_connection
from operations.db_config import DB_CONFIG, TABLES

# Test connection
if test_connection():
    print("Connected!")

# Save data
save_dataframe_to_db(df, TABLES['student_predictions'])
```

### Test Connection

```bash
# From project root
python -m operations.test_db_connection
```

## 📊 Batch Processing

Data is saved in batches of **10,000 records** with progress tracking:

```
Saving 500,000 records to table 'course_predictions'...
Processing in 50 batches of 10,000 records each
  Batch 1/50: Saved 10,000/500,000 records (2.0%)
  Batch 2/50: Saved 20,000/500,000 records (4.0%)
  ...
```

## 🔒 Security

- Database credentials are stored in `db_config.py`
- Do not commit sensitive credentials to version control
- Use environment variables for production deployments

## 📝 Notes

- All database operations include error handling and fallback to CSV
- Connection pooling is enabled via SQLAlchemy
- Batch size can be adjusted in `save_dataframe_to_db()` function
