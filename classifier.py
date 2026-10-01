import os
import io
import mimetypes
import traceback
from pypdf import PdfReader
from google import genai
from google.genai import types

try:
    import docx
except ImportError:
    docx = None

# Use the working Flash Lite model
MODEL_NAME = "gemini-3.1-flash-lite"

TEXT_EXTS = {
    '.py', '.js', '.ts', '.html', '.css', '.sh', '.cpp', '.c', 
    '.java', '.sql', '.json', '.xml', '.yaml', '.yml', '.txt', '.md', '.csv'
}
DOCX_EXTS = {'.docx'}
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'}
VIDEO_AUDIO_EXTS = {'.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.m4a'}
PDF_EXTS = {'.pdf'}

def get_client():
    """Initialize the Gemini client."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

def clean_category(raw_text):
    if not raw_text:
        return "Miscellaneous"
    cleaned = raw_text.strip().replace(".", "").replace("*", "").replace("\n", "").replace('"', '').replace("'", "")
    return cleaned if cleaned else "Miscellaneous"

def classify_content(file_name, file_bytes, client):
    """Classifies any file format and logs any API exceptions to terminal."""
    _, ext = os.path.splitext(file_name.lower())
    mime_type, _ = mimetypes.guess_type(file_name)
    if not mime_type:
        mime_type = "application/octet-stream"

    base_prompt = (
        "Analyze the following file content and output ONLY a concise category name "
        "(1 to 3 words max in Title Case). Examples: Lecture Notes, Java Programming, "
        "Project Outline, Screenshot, Question Bank, Medical Invoice. "
        "Do not include explanation, punctuation, quotes, or markdown."
    )

    try:
        # 1. Plain Text and Code Scripts
        if ext in TEXT_EXTS:
            text = file_bytes.decode('utf-8', errors='ignore')[:4000]
            prompt = f"{base_prompt}\n\nFilename: {file_name}\nCode/Text Sample:\n{text}"
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            return clean_category(response.text)

        # 2. Word Documents (.docx)
        elif ext in DOCX_EXTS:
            if docx:
                doc = docx.Document(io.BytesIO(file_bytes))
                full_text = "\n".join([p.text for p in doc.paragraphs if p.text])[:4000]
            else:
                full_text = ""
            prompt = f"{base_prompt}\n\nFilename: {file_name}\nDocument Text:\n{full_text}"
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            return clean_category(response.text)

        # 3. PDF Documents
        elif ext in PDF_EXTS:
            extracted_text = ""
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages[:4]:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
            except Exception:
                extracted_text = ""

            # If selectable text is found, send text directly
            if len(extracted_text.strip()) > 30:
                prompt = f"{base_prompt}\n\nFilename: {file_name}\nDocument Text:\n{extracted_text[:4000]}"
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=prompt
                )
                return clean_category(response.text)
            else:
                # Scanned PDF: pass bytes to Gemini multimodal vision
                part = types.Part.from_bytes(data=file_bytes, mime_type="application/pdf")
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=[part, base_prompt]
                )
                return clean_category(response.text)

        # 4. Images
        elif ext in IMAGE_EXTS:
            part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=[part, base_prompt]
            )
            return clean_category(response.text)

        # 5. Media / Video
        elif ext in VIDEO_AUDIO_EXTS:
            if len(file_bytes) <= 20 * 1024 * 1024:
                part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=[part, base_prompt]
                )
                return clean_category(response.text)
            return "Large Media"

        # Fallback for unrecognized formats
        else:
            prompt = f"{base_prompt}\n\nFilename: {file_name}"
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            return clean_category(response.text)

    except Exception as e:
        # Prints the exact error into your VS Code terminal so it is visible
        print(f"❌ [Classifier Error] Failed on {file_name}: {e}")
        traceback.print_exc()
        return "Miscellaneous"