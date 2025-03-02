# Add this route to your existing user_routes.py file
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()


# Add this function at the top of your file, after the imports but before any route definitions

def get_db_connection():
    """Create and return a connection to the PostgreSQL database."""
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    conn.autocommit = True
    return conn
# Make sure this line is at the beginning of the file
user_routes = Blueprint('user_routes', __name__)
# Replace your get_user function with this one:

# Update your get_user function with this corrected SQL query:

@user_routes.route('/api/user', methods=['GET'])
def get_user():
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # First, check if the users table has a created_at column
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'created_at'
        """)
        
        has_created_at = cur.fetchone() is not None
        
        # Query based on available columns
        if has_created_at:
            cur.execute("""
                SELECT u.id, u.username, u.email, u.created_at 
                FROM users u
                JOIN user_tokens t ON u.id = t.user_id
                WHERE t.token = %s
            """, (token,))
        else:
            # Query without created_at column
            cur.execute("""
                SELECT u.id, u.username, u.email
                FROM users u
                JOIN user_tokens t ON u.id = t.user_id
                WHERE t.token = %s
            """, (token,))
        
        user = cur.fetchone()
        
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Return user data based on available columns
        user_data = {
            'id': user[0],
            'username': user[1],
            'email': user[2]
        }
        
        # Add created_at if it was in the query result
        if has_created_at:
            user_data['created_at'] = user[3].isoformat() if user[3] else None
        
        cur.close()
        conn.close()
        
        return jsonify(user_data)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())  # Print full error for debugging
        return jsonify({'error': str(e)}), 500

# Add these functions after your existing code

def generate_token(user_id):
    # In a real app, use JWT or another secure method
    # This is a simple placeholder
    import time
    import hashlib
    token = hashlib.sha256(f"{user_id}{time.time()}{os.environ.get('SECRET_KEY')}".encode()).hexdigest()
    
    # Store token in database
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # First, check if we have a user_tokens table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
            )
        """)
        
        cur.execute(
            "INSERT INTO user_tokens (user_id, token) VALUES (%s, %s) RETURNING token",
            (user_id, token)
        )
        
        token = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return token
    except Exception as e:
        print(f"Error storing token: {str(e)}")
        return None

@user_routes.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400
        
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id, username, password_hash FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user or not check_password_hash(user[2], password):
            return jsonify({'error': 'Invalid email or password'}), 401
            
        # Generate and store token
        token = generate_token(user[0])
        
        if not token:
            return jsonify({'error': 'Failed to generate authentication token'}), 500
        
        cur.close()
        conn.close()
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user[0],
                'username': user[1],
                'token': token
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_routes.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400
        
    password_hash = generate_password_hash(password,method='pbkdf2:sha256')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # First, ensure the users table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)
        
        # Check if user already exists
        cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        if cur.fetchone():
            return jsonify({'error': 'Username or email already exists'}), 409
            
        # Insert new user
        cur.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
            (username, email, password_hash)
        )
        
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'User registered successfully', 'user_id': user_id}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500