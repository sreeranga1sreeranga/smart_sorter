import os
import google.generativeai as genai

# Make sure your API key is still set in the terminal
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

print("Available models for this API key:")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error checking models: {e}")