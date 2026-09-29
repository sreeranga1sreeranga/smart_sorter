import os
import streamlit as st
from pypdf import PdfReader
from google import genai
import shutil

st.set_page_config(page_title="Smart Sorter", page_icon="📁", layout="centered")

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    st.error("GEMINI_API_KEY environment variable is missing. Set it in your terminal first.")
    st.stop()

client = genai.Client(api_key=api_key)

def extract_text_from_pdf(uploaded_file):
    try:
        reader = PdfReader(uploaded_file)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text.strip()
    except Exception:
        return ""

def get_dynamic_category(text):
    if not text:
        return "Unreadable or Scanned"
    
    truncated_text = text[:3000]
    prompt = f"""
    Analyze the following document text and determine a concise, descriptive category for it.
    Examples: Resume, College Transcript, Utility Bill, Rental Agreement, Medical Report, Bank Statement, Tax Document.

    Rules:
    1. Respond with ONLY the category name (1 to 3 words max).
    2. Use Title Case (e.g., 'Health Insurance').
    3. Do not include punctuation, quotes, or markdown.

    Document text:
    {truncated_text}
    """
    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt
        )
        return response.text.strip().replace(".", "").replace("*", "")
    except Exception:
        return "Unknown"

# --- UI ---
st.title("📁 Smart Document Sorter")
st.write("Upload PDF files. Gemini will classify them and organize them directly into folders on your computer.")

uploaded_files = st.file_uploader("Upload PDF files", type=["pdf"], accept_multiple_files=True)

if uploaded_files:
    if st.button("🚀 Sort & Classify Files", type="primary"):
        results = []
        progress_bar = st.progress(0)
        
        output_dir = "organized_files"
        os.makedirs(output_dir, exist_ok=True)

        for i, file in enumerate(uploaded_files):
            with st.spinner(f"Analyzing {file.name}..."):
                text = extract_text_from_pdf(file)
                category = get_dynamic_category(text)
                
                # Create category folder locally
                target_folder = os.path.join(output_dir, category)
                os.makedirs(target_folder, exist_ok=True)
                
                # Save file into the category folder
                target_path = os.path.join(target_folder, file.name)
                with open(target_path, "wb") as f:
                    f.write(file.getbuffer())
                
                results.append({"File": file.name, "Folder": category})
            
            progress_bar.progress((i + 1) / len(uploaded_files))

        st.success("✅ Files organized successfully!")
        st.table(results)
        st.info(f"📂 Saved to: `{os.path.abspath(output_dir)}`")

if st.button("🗑️ Reset & Delete All Sorted Files"):
    if os.path.exists("organized_files"):
        shutil.rmtree("organized_files")
        st.success("All sorted folders and files have been deleted!")       