"""
Test Database Connection
=========================
Simple script to test MariaDB connection and verify credentials
"""

from .db_utils import test_connection, create_model_performance_table
from .db_config import DB_CONFIG

print("=" * 80)
print("TESTING MARIADB CONNECTION")
print("=" * 80)
print(f"\nDatabase: {DB_CONFIG['database']}")
print(f"Host: {DB_CONFIG['host']}")
print(f"Port: {DB_CONFIG['port']}")
print(f"User: {DB_CONFIG['user']}")
print("\n" + "-" * 80)

# Test connection
if test_connection():
    print("\n✓ Connection successful!")
    print("\nCreating model performance table...")
    if create_model_performance_table():
        print("✓ Table created/verified successfully")
    else:
        print("✗ Failed to create table")
else:
    print("\n✗ Connection failed!")
    print("\nPlease check:")
    print("  1. Database credentials in db_config.py")
    print("  2. Network connectivity")
    print("  3. Database server is running")
    print("  4. Firewall settings")

print("\n" + "=" * 80)
