import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    
    # Database configuration
    DATABASE_URL = os.environ.get('DATABASE_URL')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_NAME = os.environ.get('DB_NAME', 'nutrition_tracker')
    DB_USER = os.environ.get('DB_USER', 'nutrify_user')
    DB_PASSWORD = os.environ.get('DB_PASSWORD')
    
    # Flask configuration
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    DEBUG = FLASK_ENV == 'development'
    
    @staticmethod
    def get_db_connection_params():
        """Get database connection parameters"""
        if Config.DATABASE_URL:
            return {'dsn': Config.DATABASE_URL}
        else:
            return {
                'host': Config.DB_HOST,
                'database': Config.DB_NAME,
                'user': Config.DB_USER,
                'password': Config.DB_PASSWORD
            }

    SQLALCHEMY_DATABASE_URI = 'sqlite:///site.db'  # Update with your database URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'  # Update with the correct API URL
    NUTRIENT_GOAL_DEFAULTS = {
        'calories': 2000,
        'protein': 50,
        'carbs': 300,
        'fats': 70
    }