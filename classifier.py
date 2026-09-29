import os
import shutil
from pypdf import PdfReader
from google import genai

# Setup Gemini API Client using the new SDK
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def extract_text_from_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text.strip()

def classify_text(text):
    truncated_text = text[:3000] 
    prompt = f"""
    Analyze the following extracted text from a file and classify it into exactly ONE of these categories:
    - INVOICE
    - RESUME
    - CONTRACT
    - UNKNOWN

    Reply with ONLY the category name. Do not include any formatting or punctuation.

    Text to classify:
    {truncated_text}
    """
    
    # Using a fast, modern model explicitly available to your account
    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=prompt
    )
    return response.text.strip()

def move_file(file_path, category):
    if not os.path.exists(category):
        os.makedirs(category)
    
    file_name = os.path.basename(file_path)
    destination = os.path.join(category, file_name)
    shutil.move(file_path, destination)
    print(f"Moved {file_name} to the '{category}' folder.")

if __name__ == "__main__":
    target_file = "sample.pdf"

    if not os.path.exists(target_file):
        print(f"Error: Could not find '{target_file}'. Please place a PDF in this folder named 'sample.pdf'.")
    else:
        print(f"Extracting text from {target_file}...")
        document_text = extract_text_from_pdf(target_file)

        if document_text:
            print("Sending to Gemini AI for classification...")
            category = classify_text(document_text)
            print(f"Classification: {category}")
            
            move_file(target_file, category)