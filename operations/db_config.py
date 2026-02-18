"""
Database Configuration for PostgreSQL (Supabase)
==================================================
Credentials for Bishop State student success prediction database
"""

import os

# --- Legacy MariaDB Connection Settings (preserved for reference) ---
# DB_CONFIG = {
#     'host': 'devcolor00.czqeeakaypfi.us-west-2.rds.amazonaws.com',
#     'user': 'admin',
#     'password': 'devcolor2025',
#     'database': 'Kentucky_Community_and_Technical_College_System',
#     'port': 3306
# }

# PostgreSQL Connection Settings (local Supabase defaults)
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', '127.0.0.1'),
    'user': os.environ.get('DB_USER', 'postgres'),
    'password': os.environ.get('DB_PASSWORD', 'postgres'),
    'database': os.environ.get('DB_NAME', 'postgres'),
    'port': int(os.environ.get('DB_PORT', '54332'))
}

# Table names
TABLES = {
    'student_predictions': 'student_level_with_predictions',
    'course_predictions': 'course_predictions',
    'model_performance': 'ml_model_performance'
}
