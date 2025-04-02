from flask import Blueprint, request, jsonify, current_app, render_template
from backend.services.gemini_service import GeminiService
import os
from datetime import datetime, timedelta
from functools import wraps

food_routes = Blueprint('food_routes', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            # Get database connection
            conn = get_db_connection()
            cur = conn.cursor()
            
            # Get user from token
            cur.execute("""
                SELECT users.id, users.username, users.email
                FROM users
                JOIN user_tokens ON users.id = user_tokens.user_id
                WHERE user_tokens.token = %s
            """, (token,))
            
            user = cur.fetchone()
            if not user:
                return jsonify({'error': 'Invalid token'}), 401
                
            current_user = {
                'id': user[0],
                'username': user[1],
                'email': user[2]
            }
            
            return f(current_user, *args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
        finally:
            if cur:
                cur.close()
            if conn:
                conn.close()
    
    return decorated

# Simplified routes without database dependencies
@food_routes.route('/api/food/analyze-text', methods=['POST'])
def analyze_text():
    """Endpoint to analyze food based on text description"""
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({"error": "No text description provided"}), 400
    
    food_description = data['text']
    
    # Get API key from config
    api_key = current_app.config.get('GEMINI_API_KEY')
    
    # Initialize Gemini service
    try:
        gemini_service = GeminiService(api_key)
        result = gemini_service.analyze_food_text(food_description)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify({"error": result["error"]}), 500
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@food_routes.route('/api/food/analyze-image', methods=['POST'])
def analyze_image():
    """Endpoint to analyze food from an uploaded image"""
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "No image selected"}), 400
    
    # Make sure it's an image file
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
        return jsonify({"error": "File must be an image"}), 400
        
    # Get API key from environment
    api_key = os.environ.get('GEMINI_API_KEY')
    
    # Initialize Gemini service
    try:
        gemini_service = GeminiService(api_key)
        result = gemini_service.analyze_food_image(file)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify({"error": result["error"]}), 500
    
    except Exception as e:
        print(f"Error analyzing image: {str(e)}")
        return jsonify({"error": str(e)}), 500
    


@food_routes.route('/capture', methods=['GET'])
def capture():
    """Render the food capture page with camera functionality"""
    return render_template('food_capture.html')

from datetime import datetime

@food_routes.route('/')
def index():
    """Render the main food analyzer page"""
    return render_template('index.html')

@food_routes.route('/dashboard')
def dashboard():
    """Render the user dashboard page"""
    today = datetime.now().strftime('%Y-%m-%d')
    return render_template('dashboard.html', today=today)

@food_routes.route('/account')
def account():
    """Render the user account page"""
    today = datetime.now().strftime('%Y-%m-%d')
    return render_template('account.html', today=today)

@food_routes.route('/analytics')
def analytics():
    return render_template('analytics.html')

@food_routes.route('/api/nutrition-history')
@token_required
def get_nutrition_history(current_user):
    range_param = request.args.get('range', 'week')
    
    # Calculate date range
    end_date = datetime.now()
    if range_param == 'week':
        start_date = end_date - timedelta(days=7)
    else:  # month
        start_date = end_date - timedelta(days=30)
    
    # Query food logs within date range
    query = """
        SELECT DATE(date_added) as log_date,
               SUM(calories) as total_calories,
               SUM(protein) as total_protein,
               SUM(carbs) as total_carbs,
               SUM(fats) as total_fat
        FROM food_logs
        WHERE user_id = %s 
        AND date_added BETWEEN %s AND %s
        GROUP BY DATE(date_added)
        ORDER BY log_date ASC
    """
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(query, (current_user['id'], start_date, end_date))
        results = cur.fetchall()
        
        # Prepare data for charts
        dates = []
        calories = []
        protein = []
        carbs = []
        fat = []
        
        # Fill in missing dates with zeros
        current_date = start_date
        results_dict = {row[0].strftime('%Y-%m-%d'): row for row in results}
        
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            dates.append(date_str)
            
            if date_str in results_dict:
                row = results_dict[date_str]
                calories.append(float(row[1]) if row[1] else 0)
                protein.append(float(row[2]) if row[2] else 0)
                carbs.append(float(row[3]) if row[3] else 0)
                fat.append(float(row[4]) if row[4] else 0)
            else:
                calories.append(0)
                protein.append(0)
                carbs.append(0)
                fat.append(0)
            
            current_date += timedelta(days=1)
        
        return jsonify({
            'dates': dates,
            'calories': calories,
            'protein': protein,
            'carbs': carbs,
            'fat': fat
        })
        
    except Exception as e:
        print(f"Error in nutrition history: {str(e)}")
        return jsonify({'error': str(e)}), 500
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

    # Add this route to handle food logging

from flask import request, jsonify
import os
import traceback

# Make sure we have a database connection function
def get_db_connection():
    """Create and return a connection to the PostgreSQL database."""
    import psycopg2
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    conn.autocommit = True
    return conn

# Update your food_logs function:

# Update the food_logs function to use the correct column names

@food_routes.route('/api/food-logs', methods=['POST', 'GET'])
def food_logs():
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401
    
    token = auth_header.split(' ')[1]
    conn = None
    cur = None
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get user ID from token
        cur.execute("""
            SELECT user_id FROM user_tokens WHERE token = %s
        """, (token,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'Invalid token'}), 401
            
        user_id = result[0]
        
        # First, check if food_logs table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'food_logs'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        # Create the table if it doesn't exist
        if not table_exists:
            print("Creating food_logs table...")
            cur.execute("""
                CREATE TABLE food_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    calories INTEGER,
                    protein FLOAT,
                    carbs FLOAT,
                    fats FLOAT, 
                    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
        
        # Get the column names from the table
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'food_logs'
        """)
        
        columns = [row[0] for row in cur.fetchall()]
        print(f"Available columns in food_logs: {columns}")
        
        # For POST requests (adding new food log)
        if request.method == 'POST':
            print("Processing POST request to /api/food-logs")
            # Get food data from request
            data = request.get_json()
            print(f"Received data: {data}")
            
            # Map request data to database column names
            # Use the column names that exist in the table
            name_column = 'name' if 'name' in columns else 'food_name'
            protein_column = 'protein' if 'protein' in columns else 'protein_g'
            carbs_column = 'carbs' if 'carbs' in columns else 'carbs_g'
            fats_column = 'fats' if 'fats' in columns else 'fat_g'
            date_column = 'date_added' if 'date_added' in columns else 'log_date'
            
            # Build the insert query dynamically based on available columns
            insert_columns = ['user_id', name_column, 'calories', protein_column, carbs_column, fats_column]
            values_placeholders = ['%s', '%s', '%s', '%s', '%s', '%s']
            
            if date_column in columns:
                insert_columns.append(date_column)
                values_placeholders.append('COALESCE(%s, NOW())')
            
            insert_query = f"""
                INSERT INTO food_logs 
                ({', '.join(insert_columns)}) 
                VALUES ({', '.join(values_placeholders)})
                RETURNING id
            """
            
            query_params = [
                user_id, 
                data.get('food_name', 'Unknown Food'),
                data.get('calories', 0),
                data.get('protein_g', 0),
                data.get('carbs_g', 0),
                data.get('fat_g', 0)
            ]
            
            if date_column in columns:
                query_params.append(data.get('log_date'))
                
            print(f"Executing insert: {insert_query} with params: {query_params}")
            cur.execute(insert_query, query_params)
            
            log_id = cur.fetchone()[0]
            conn.commit()
            
            print(f"Food log created with ID: {log_id}")
            
            # Return success response
            return jsonify({
                'message': 'Food logged successfully',
                'log_id': log_id
            }), 201
            
        # For GET requests (fetching food logs)
        else:
            # Get date parameter from request
            selected_date = request.args.get('date')
            
            # Construct the query based on available columns
            name_column = 'name' if 'name' in columns else 'food_name'
            protein_column = 'protein' if 'protein' in columns else 'protein_g'
            carbs_column = 'carbs' if 'carbs' in columns else 'carbs_g'
            fats_column = 'fats' if 'fats' in columns else 'fat_g'
            date_column = 'date_added' if 'date_added' in columns else 'log_date'
            
            # Build the select query with the correct column names and date filtering
            query = f"""
                SELECT id, 
                       {name_column} AS food_name, 
                       calories, 
                       {protein_column} AS protein_g, 
                       {carbs_column} AS carbs_g, 
                       {fats_column} AS fat_g, 
                       {date_column} AS log_date
                FROM food_logs 
                WHERE user_id = %s
            """
            
            query_params = [user_id]
            
            # Add date filtering if a date was provided
            if selected_date:
                query += f" AND DATE({date_column}) = %s"
                query_params.append(selected_date)
            
            query += " ORDER BY log_date DESC"
            
            cur.execute(query, query_params)
            logs = cur.fetchall()
            
            # Convert to list of dictionaries
            log_list = []
            for log in logs:
                log_dict = {
                    'id': log[0],
                    'food_name': log[1],
                    'calories': log[2],
                    'protein_g': log[3],
                    'carbs_g': log[4],
                    'fat_g': log[5],
                    'log_date': log[6].isoformat() if log[6] else None
                }
                log_list.append(log_dict)
            
            return jsonify({'logs': log_list}), 200
            
    except Exception as e:
        import traceback
        print(f"Error in food_logs endpoint: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@food_routes.route('/api/food-logs/<int:log_id>', methods=['DELETE'])
def delete_food_log(log_id):
    """Delete a specific food log entry"""
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401
    
    token = auth_header.split(' ')[1]
    conn = None
    cur = None
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get user ID from token
        cur.execute("""
            SELECT user_id FROM user_tokens WHERE token = %s
        """, (token,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'Invalid token'}), 401
            
        user_id = result[0]
        
        # Delete the food log entry, but only if it belongs to the user
        cur.execute("""
            DELETE FROM food_logs 
            WHERE id = %s AND user_id = %s
            RETURNING id
        """, (log_id, user_id))
        
        deleted = cur.fetchone()
        conn.commit()
        
        if not deleted:
            return jsonify({'error': 'Food log entry not found or unauthorized'}), 404
        
        return jsonify({'message': 'Food log deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error deleting food log: {str(e)}")
        return jsonify({'error': str(e)}), 500
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()