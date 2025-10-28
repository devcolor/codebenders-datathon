"""
Database Configuration for MariaDB
===================================
Credentials for Kentucky Community and Technical College System database
"""

# MariaDB Connection Settings
DB_CONFIG = {
    'host': 'devcolor00.czqeeakaypfi.us-west-2.rds.amazonaws.com',
    'user': 'admin',
    'password': 'devcolor2025',
    'database': 'Kentucky_Community_and_Technical_College_System',
    'port': 3306
}

# Table names
TABLES = {
    'student_predictions': 'kctcs_student_level_with_predictions',
    'course_predictions': 'kctcs_merged_with_predictions',
    'model_performance': 'ml_model_performance'
}
