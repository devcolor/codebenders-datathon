"""
Database Utilities for MariaDB
===============================
Helper functions for database operations
"""

import pandas as pd
import pymysql
from sqlalchemy import create_engine, text
from .db_config import DB_CONFIG, TABLES
import warnings
warnings.filterwarnings('ignore')


def get_connection():
    """Create a PyMySQL connection to MariaDB"""
    try:
        connection = pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            port=DB_CONFIG['port'],
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        print(f"✓ Connected to database: {DB_CONFIG['database']}")
        return connection
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        raise


def get_sqlalchemy_engine():
    """Create SQLAlchemy engine for pandas operations"""
    try:
        connection_string = (
            f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
            f"@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
        )
        engine = create_engine(connection_string, pool_pre_ping=True)
        print(f"✓ SQLAlchemy engine created")
        return engine
    except Exception as e:
        print(f"✗ Engine creation failed: {e}")
        raise


def save_dataframe_to_db(df, table_name, if_exists='replace', chunksize=1000):
    """
    Save pandas DataFrame to MariaDB table
    
    Parameters:
    -----------
    df : pandas.DataFrame
        DataFrame to save
    table_name : str
        Name of the table
    if_exists : str
        How to behave if table exists: 'fail', 'replace', 'append'
    chunksize : int
        Number of rows to insert at a time
    """
    try:
        engine = get_sqlalchemy_engine()
        
        print(f"\nSaving {len(df):,} records to table '{table_name}'...")
        
        # Save to database
        df.to_sql(
            name=table_name,
            con=engine,
            if_exists=if_exists,
            index=False,
            chunksize=chunksize,
            method='multi'
        )
        
        print(f"✓ Successfully saved to '{table_name}'")
        print(f"  - Records: {len(df):,}")
        print(f"  - Columns: {len(df.columns)}")
        
        # Verify the save
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) as count FROM {table_name}"))
            count = result.fetchone()[0]
            print(f"  - Verified: {count:,} records in database")
        
        engine.dispose()
        return True
        
    except Exception as e:
        print(f"✗ Failed to save to database: {e}")
        return False


def create_model_performance_table():
    """Create table to store model performance metrics"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS ml_model_performance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            model_name VARCHAR(100) NOT NULL,
            model_type VARCHAR(50) NOT NULL,
            accuracy FLOAT,
            precision_score FLOAT,
            recall_score FLOAT,
            f1_score FLOAT,
            auc_roc FLOAT,
            rmse FLOAT,
            mae FLOAT,
            r2_score FLOAT,
            training_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            INDEX idx_model_name (model_name),
            INDEX idx_training_date (training_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        
        cursor.execute(create_table_sql)
        connection.commit()
        print(f"✓ Model performance table created/verified")
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"✗ Failed to create performance table: {e}")
        return False


def save_model_performance(model_name, model_type, metrics, notes=""):
    """
    Save model performance metrics to database
    
    Parameters:
    -----------
    model_name : str
        Name of the model (e.g., 'Retention Prediction')
    model_type : str
        Type of model (e.g., 'classification', 'regression')
    metrics : dict
        Dictionary of performance metrics
    notes : str
        Additional notes about the model
    """
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        insert_sql = """
        INSERT INTO ml_model_performance 
        (model_name, model_type, accuracy, precision_score, recall_score, 
         f1_score, auc_roc, rmse, mae, r2_score, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = (
            model_name,
            model_type,
            metrics.get('accuracy'),
            metrics.get('precision'),
            metrics.get('recall'),
            metrics.get('f1'),
            metrics.get('auc_roc'),
            metrics.get('rmse'),
            metrics.get('mae'),
            metrics.get('r2_score'),
            notes
        )
        
        cursor.execute(insert_sql, values)
        connection.commit()
        
        print(f"✓ Saved performance metrics for '{model_name}'")
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"✗ Failed to save model performance: {e}")
        return False


def test_connection():
    """Test database connection"""
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"✓ MariaDB version: {version}")
        
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"✓ Existing tables: {len(tables)}")
        for table in tables:
            print(f"  - {list(table.values())[0]}")
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"✗ Connection test failed: {e}")
        return False


if __name__ == "__main__":
    # Test the connection
    print("=" * 80)
    print("TESTING DATABASE CONNECTION")
    print("=" * 80)
    test_connection()
