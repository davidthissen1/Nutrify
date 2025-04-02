import os
import base64
import google.generativeai as genai
from PIL import Image
from io import BytesIO
import json
import re

class GeminiService:
    def __init__(self, api_key=None):
        """Initialize the Gemini Service with API key"""
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is required")
        
        # Configure the Gemini API
        genai.configure(api_key=self.api_key)
    
    def test_api_key(self):
        """Test if the API key is valid by making a simple request"""
        try:
            # List available models as a simple test
            models = genai.list_models()
            model_names = [model.name for model in models]
            print(f"Available models: {model_names}")
            return True
        except Exception as e:
            print(f"API key test failed: {str(e)}")
            return False
            
    def analyze_food_text(self, food_description):
        """Analyze a text description of food and return nutritional information"""
        try:
            # Create a prompt that asks for nutritional analysis with explicitly structured vitamins/minerals
            prompt = f"""
            Based on this food description: "{food_description}"
            
            Provide detailed nutritional information in JSON format.
            Include:
            - Food name (string)
            - Portion size (string)
            - Calories (number)
            - Macronutrients: protein (string with g unit), carbs (string with g unit), fat (string with g unit)
            - vitamins_and_minerals: Please include key vitamins (A, B1, B2, B3, B5, B6, B9, B12, C, D, E, K) and minerals 
              (calcium, iron, magnesium, phosphorus, potassium, sodium, zinc) as individual key-value pairs with their amounts and units.
            - potential_allergens (array of strings)
            
            Format as VALID JSON with the following exact structure:
            {{
              "food_name": "string",
              "portion_size": "string",
              "calories": number,
              "protein": "string",
              "carbohydrates": "string",
              "fat": "string",
              "fiber": "string",
              "vitamins_and_minerals": {{
                "vitamin_a": "string",
                "vitamin_c": "string",
                "calcium": "string",
                "iron": "string",
                ... (other vitamins/minerals)
              }},
              "potential_allergens": ["string", "string", ...]
            }}
            
            Use null for unknown values, never use placeholder values.
            """
            
            # Use text-only model for this request
            text_model = genai.GenerativeModel('models/gemini-1.5-pro')
            
            # Generate response from Gemini
            response = text_model.generate_content(prompt)
            
            # Extract the response text
            response_text = response.text
            
            # Clean up the response to extract only valid JSON
            # Remove markdown code blocks if present
            clean_text = re.sub(r'```(?:json)?\s*(.*?)\s*```', r'\1', response_text, flags=re.DOTALL)
            
            # Find the first occurrence of '{' and the last occurrence of '}'
            start_idx = clean_text.find('{')
            end_idx = clean_text.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                json_text = clean_text[start_idx:end_idx+1]
                
                # Replace any remaining {object} placeholders with null
                json_text = re.sub(r'\{\s*object\s*\}', 'null', json_text)
                
                # Add additional cleaning for object notation
                json_text = re.sub(r'\[object Object\]', 'null', json_text)
                
                # Parse JSON to validate it
                parsed_data = json.loads(json_text)
                
                return {
                    "success": True,
                    "data": json_text
                }
            else:
                return {
                    "success": False,
                    "error": "Could not extract valid JSON from response"
                }
                
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"JSON parsing error: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        
    def analyze_food_image(self, image_file):
        """Analyze an image of food and return nutritional information"""
        try:
            # Open the image file
            img = Image.open(image_file)
            
            # Create prompt with explicit structure for vitamins and minerals
            prompt = """
            Analyze this food image and provide detailed nutritional information in JSON format.
            Include:
            - Food name (string)
            - Portion size (string)
            - Calories (number)
            - Macronutrients: protein, carbs, fat (all as strings with units)
            - vitamins_and_minerals: Include key vitamins (A, B complex, C, D, E, K) and minerals 
              (calcium, iron, magnesium, phosphorus, potassium, sodium, zinc) as individual key-value pairs.
            - potential_allergens (array of strings)
            
            Format as VALID JSON with the following exact structure:
            {
              "food_name": "string",
              "portion_size": "string",
              "calories": number,
              "protein": "string",
              "carbohydrates": "string",
              "fat": "string",
              "fiber": "string",
              "vitamins_and_minerals": {
                "vitamin_a": "string",
                "vitamin_c": "string",
                "calcium": "string",
                "iron": "string",
                ... (other vitamins/minerals)
              },
              "potential_allergens": ["string", "string", ...]
            }
            
            Use null for unknown values, never use placeholder values.
            """
            
            # Use vision-capable model
            vision_model = genai.GenerativeModel('models/gemini-1.5-flash')
            
            # Generate response
            response = vision_model.generate_content([prompt, img])
            
            # Extract response text
            response_text = response.text
            
            # Clean up the response to extract only valid JSON
            # Remove markdown code blocks if present
            clean_text = re.sub(r'```(?:json)?\s*(.*?)\s*```', r'\1', response_text, flags=re.DOTALL)
            
            # Find the first occurrence of '{' and the last occurrence of '}'
            start_idx = clean_text.find('{')
            end_idx = clean_text.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                json_text = clean_text[start_idx:end_idx+1]
                
                # Replace any remaining {object} placeholders with null
                json_text = re.sub(r'\{\s*object\s*\}', 'null', json_text)
                
                # Parse JSON to validate it
                parsed_data = json.loads(json_text)
                
                return {
                    "success": True,
                    "data": json_text
                }
            else:
                return {
                    "success": False,
                    "error": "Could not extract valid JSON from response"
                }
                
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"JSON parsing error: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }