import os
import google.generativeai as genai

# Put your API key directly here for testing
API_KEY = "AIzaSyA6OSUVUVZ3XWXvBQgFfYWHVquAoUvcFnw"  

try:
    print(f"Testing API key: {API_KEY[:4]}...{API_KEY[-4:] if len(API_KEY) > 8 else ''}")
    
    # Configure the Gemini API with REST transport to avoid gRPC connection issues
    genai.configure(api_key=API_KEY, transport='rest')
    
    # Try listing models
    models = genai.list_models()
    print("Available models:")
    for model in models:
        print(f"- {model.name}")
    
    # Try a simple generation
    model = genai.GenerativeModel('models/gemini-1.5-pro')
    response = model.generate_content("Hello, I'm testing the Gemini API.")
    print("\nResponse from Gemini:")
    print(response.text)
    
    print("\nAPI key works successfully!")
    
except Exception as e:
    print(f"\nError: {str(e)}")
    print("\nTroubleshooting steps:")
    print("1. Make sure you created an API key from AI Studio (not regular Google Cloud)")
    print("2. Verify the API is enabled in your Google Cloud project")
    print("3. Set up billing even for the free tier")
    print("4. Check for any network restrictions")