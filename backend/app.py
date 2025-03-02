from flask import Flask, render_template
from .config import Config  # Use relative import
from .services.gemini_service import GeminiService  # Use relative import
from dotenv import load_dotenv
import os

# Load .env file directly in app.py to ensure it's loaded
load_dotenv()

def create_app():
    app = Flask(__name__, 
                static_folder='../frontend/static',
                template_folder='../frontend/templates')
    app.config.from_object(Config)
    
    # Print environment variables for debugging
    env_api_key = os.environ.get('GEMINI_API_KEY')
    config_api_key = app.config.get('GEMINI_API_KEY')
    
    print(f"Env API key: {env_api_key[:4]}...{env_api_key[-4:] if env_api_key and len(env_api_key) > 8 else 'None'}")
    print(f"Config API key: {config_api_key[:4]}...{config_api_key[-4:] if config_api_key and len(config_api_key) > 8 else 'None'}")
    
    # Use the API key directly from environment instead of config
    api_key = os.environ.get('GEMINI_API_KEY')
    
    # Test Gemini API key
    print(f"Testing Gemini API key...")
    gemini_service = GeminiService(api_key)
    gemini_service.test_api_key()
    
    # Import and register blueprints
    from .routes.food_routes import food_routes
    from .routes.user_routes import user_routes
    
    app.register_blueprint(food_routes)
    app.register_blueprint(user_routes)
    
    return app