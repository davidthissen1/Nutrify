#!/usr/bin/env python3
"""
Database initialization script for production deployment
"""
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection from environment variables"""
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return psycopg2.connect(database_url)
    else:
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'nutrition_tracker'),
            user=os.getenv('DB_USER', 'nutrify_user'),
            password=os.getenv('DB_PASSWORD')
        )

def init_database():
    """Initialize the database with required tables"""
    conn = get_db_connection()
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    try:
        # Create users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create user_tokens table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        """)
        
        # Create food_logs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS food_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                calories INTEGER DEFAULT 0,
                protein FLOAT DEFAULT 0,
                carbs FLOAT DEFAULT 0,
                fats FLOAT DEFAULT 0,
                date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create nutrition_goals table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS nutrition_goals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                calories INTEGER DEFAULT 2000,
                protein FLOAT DEFAULT 150,
                carbs FLOAT DEFAULT 200,
                fats FLOAT DEFAULT 70,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better performance
        cur.execute("CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, date_added)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        
        print("Database initialized successfully!")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    init_database() 