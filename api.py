import os
import io
import csv
import shutil
import sqlite3
import random
import secrets
import hashlib
import zipfile
import mimetypes
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

# ---------------------------------------------------------
# CONSTANTS & CONFIGURATION
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "documents.db")
ORGANIZED_DIR = os.path.join(BASE_DIR, "organized_files")
CREATOR_EMAIL = "noragamiarota@gmail.com"

SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "noragamiarota@gmail.com")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

os.makedirs(ORGANIZED_DIR, exist_ok=True)

# ---------------------------------------------------------
# DATABASE INITIALIZATION & SCHEMA MIGRATION
# ---------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_and_migrate_db():
    conn = get_db()
    c = conn.cursor()
    
    # 1. Users Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            account_status TEXT DEFAULT 'Active'
        );
    """)

    # 2. Document History Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS document_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            category TEXT NOT NULL,
            summary TEXT DEFAULT '',
            file_hash TEXT DEFAULT '',
            file_path TEXT,
            size_kb REAL DEFAULT 0.0,
            is_starred INTEGER DEFAULT 0,
            share_token TEXT DEFAULT '',
            status TEXT DEFAULT 'Active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
    """)

    # 3. System Logs Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            username TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT
        );
    """)

    # 4. OTP Codes Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            otp TEXT NOT NULL,
            expires_at DATETIME NOT NULL
        );
    """)

    # Migration Safety: Users table columns
    c.execute("PRAGMA table_info(users);")
    user_cols = [col["name"] for col in c.fetchall()]
    if "account_status" not in user_cols:
        c.execute("ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'Active';")

    # Migration Safety: Document History table columns
    c.execute("PRAGMA table_info(document_history);")
    doc_cols = [col["name"] for col in c.fetchall()]
    if "file_path" not in doc_cols:
        c.execute("ALTER TABLE document_history ADD COLUMN file_path TEXT DEFAULT '';")
    if "size_kb" not in doc_cols:
        c.execute("ALTER TABLE document_history ADD COLUMN size_kb REAL DEFAULT 0.0;")
    if "status" not in doc_cols:
        c.execute("ALTER TABLE document_history ADD COLUMN status TEXT DEFAULT 'Active';")
    if "created_at" not in doc_cols:
        c.execute("ALTER TABLE document_history ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;")
    if "summary" not in doc_cols:
        c.execute("ALTER TABLE document_history ADD COLUMN summary TEXT DEFAULT '';")
    if "file_hash" not in doc_cols:
        c.execute("ALTER TABLE document_history ADD COLUMN file_hash TEXT DEFAULT '';")
    if "is_starred" not in doc_cols:
        c.execute("ALTER TABLE document_history ADD COLUMN is_starred INTEGER DEFAULT 0;")
    if "share_token" not in doc_cols:
        c.execute("ALTER TABLE document_history ADD COLUMN share_token TEXT DEFAULT '';")

    conn.commit()
    conn.close()

init_and_migrate_db()

# ---------------------------------------------------------
# FASTAPI APPLICATION & CORS MIDDLEWARE
# ---------------------------------------------------------
app = FastAPI(title="SmartSorter API", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# PYDANTIC SCHEMAS & HELPERS
# ---------------------------------------------------------
class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    invite_key: Optional[str] = None

class LoginSchema(BaseModel):
    email: str
    password: str

class RequestOtpSchema(BaseModel):
    email: str

class VerifyOtpSchema(BaseModel):
    email: str
    otp: str

class ResetPasswordSchema(BaseModel):
    email: str
    otp: str
    new_password: str

class CategoryOverrideSchema(BaseModel):
    new_category: str

class AskDocumentSchema(BaseModel):
    question: str

class AskFolderSchema(BaseModel):
    user_id: int
    category: str
    question: str

class UserStatusUpdateSchema(BaseModel):
    account_status: str

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_pw(plain: str, stored: str) -> bool:
    return stored == plain or stored == hash_pw(plain)

def send_otp_email(receiver_email: str, username: str, otp_code: str) -> bool:
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"⚠️ [SMTP NOT CONFIGURED] OTP for {receiver_email}: {otp_code}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"SmartSorter Password Recovery Code: {otp_code}"
        msg["From"] = f"SmartSorter Security <{SMTP_EMAIL}>"
        msg["To"] = receiver_email

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
            <h2 style="color: #3b82f6; margin-top: 0;">SmartSorter Security</h2>
            <p>Hello <strong>{username}</strong>,</p>
            <p>Use the following 6-digit verification code to reset your SmartSorter password. This code expires in <strong>3 minutes</strong>:</p>
            <div style="background: #1e293b; padding: 16px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; border-radius: 8px; color: #38bdf8; margin: 20px 0;">
                {otp_code}
            </div>
            <p style="font-size: 12px; color: #94a3b8;">If you did not request this password reset, please ignore this email.</p>
        </div>
        """
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, receiver_email, msg.as_string())
        return True
    except Exception as e:
        print(f"❌ [SMTP Error]: {e}")
        return False

def generate_ai_summary(filename: str, contents: bytes, category: str) -> str:
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if api_key and ext in ["txt", "md", "py", "js", "html", "css", "java", "sql", "json", "csv"]:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            snippet = contents[:3000].decode("utf-8", errors="ignore")
            prompt = (
                f"Summarize this '{filename}' ({category}) file in ONE short sentence "
                f"(maximum 12 words). No quotes:\n\n{snippet}"
            )
            resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
            if resp and resp.text:
                clean_sum = resp.text.strip().replace("\n", " ")
                return clean_sum[:110]
        except Exception as e:
            print(f"[Summary Fallback for {filename}]: {e}")

    if ext in ["txt", "md", "py", "js", "html", "css", "java", "sql", "csv"]:
        text_preview = contents[:1000].decode("utf-8", errors="ignore").strip()
        lines = [line.strip() for line in text_preview.splitlines() if line.strip() and not line.strip().startswith(("#", "//", "/*"))]
        if lines:
            first_line = lines[0][:85]
            return f"Snippet: {first_line}..." if len(lines[0]) > 85 else f"Content: {first_line}"

    base_title = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ")
    if ext == "pdf":
        return f"PDF document sorted under {category} ({base_title[:45]})"
    elif ext in ["png", "jpg", "jpeg", "webp"]:
        return f"Visual image asset indexed in {category}"
    elif ext in ["doc", "docx", "ppt", "pptx"]:
        return f"Office presentation/document for {category}"
    return f"Indexed {ext.upper() or 'binary'} resource under {category}"

# ---------------------------------------------------------
# AUTHENTICATION & 3-STEP OTP RECOVERY ENDPOINTS
# ---------------------------------------------------------
@app.post("/api/auth/register")
def register_user(payload: RegisterSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        clean_email = payload.email.strip().lower()
        role = "admin" if clean_email == CREATOR_EMAIL.lower() else "user"

        c.execute("SELECT id FROM users WHERE LOWER(email) = ?", (clean_email,))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Account with this email already exists.")

        pwd_hash = hash_pw(payload.password)
        c.execute(
            "INSERT INTO users (username, email, password_hash, role, account_status) VALUES (?, ?, ?, ?, 'Active')",
            (payload.name.strip(), clean_email, pwd_hash, role)
        )
        user_id = c.lastrowid

        c.execute(
            "INSERT INTO system_logs (timestamp, username, action, details) VALUES (datetime('now'), ?, 'User Registered', ?)",
            (payload.name.strip(), f"New account created with role '{role}'")
        )
        conn.commit()

        return {
            "message": "Account created successfully",
            "user": {
                "id": user_id,
                "name": payload.name.strip(),
                "email": clean_email,
                "role": role
            }
        }
    finally:
        conn.close()

@app.post("/api/auth/login")
def login_user(payload: LoginSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        clean_email = payload.email.strip().lower()
        c.execute(
            "SELECT id, username, email, password_hash, COALESCE(role, 'user') as role, COALESCE(account_status, 'Active') as account_status FROM users WHERE LOWER(email) = ?",
            (clean_email,)
        )
        user = c.fetchone()

        if not user or not verify_pw(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        if user["account_status"] == "Suspended" and clean_email != CREATOR_EMAIL.lower():
            raise HTTPException(status_code=403, detail="Your account has been suspended by the Creator Administrator.")

        role = user["role"]
        if clean_email == CREATOR_EMAIL.lower() and role.lower() != "admin":
            role = "admin"
            c.execute("UPDATE users SET role = 'admin', account_status = 'Active' WHERE id = ?", (user["id"],))

        c.execute(
            "INSERT INTO system_logs (timestamp, username, action, details) VALUES (datetime('now'), ?, 'User Login', ?)",
            (user["username"], f"Signed in to {clean_email}")
        )
        conn.commit()

        return {
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "name": user["username"],
                "email": user["email"],
                "role": role
            }
        }
    finally:
        conn.close()

@app.post("/api/auth/request-otp")
def request_password_otp(payload: RequestOtpSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        clean_email = payload.email.strip().lower()
        c.execute("SELECT username FROM users WHERE LOWER(email) = ?", (clean_email,))
        user = c.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="No account registered with this email address.")

        otp_code = str(random.randint(100000, 999999))
        expires_at = (datetime.utcnow() + timedelta(minutes=3)).strftime("%Y-%m-%d %H:%M:%S")

        c.execute("DELETE FROM otp_codes WHERE LOWER(email) = ?", (clean_email,))
        c.execute("INSERT INTO otp_codes (email, otp, expires_at) VALUES (?, ?, ?)", (clean_email, otp_code, expires_at))

        c.execute(
            "INSERT INTO system_logs (timestamp, username, action, details) VALUES (datetime('now'), ?, 'OTP Dispatched', ?)",
            (user["username"], f"Dispatched 3-minute recovery OTP to {clean_email}")
        )
        conn.commit()

        email_sent = send_otp_email(clean_email, user["username"], otp_code)

        print(f"\n==========================================")
        print(f"🔑 [SMARTSORTER 3-MIN OTP]: {otp_code} for {clean_email} (Email Sent: {email_sent})")
        print(f"==========================================\n")

        return {
            "message": f"6-digit verification code sent to {clean_email}. Valid for 3 minutes.",
            "expires_in_seconds": 180
        }
    finally:
        conn.close()

@app.post("/api/auth/verify-otp")
def verify_password_otp(payload: VerifyOtpSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        clean_email = payload.email.strip().lower()
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        c.execute(
            "SELECT id, expires_at FROM otp_codes WHERE LOWER(email) = ? AND otp = ?",
            (clean_email, payload.otp.strip())
        )
        record = c.fetchone()
        if not record:
            raise HTTPException(status_code=400, detail="Invalid OTP code. Please check your email and try again.")

        if record["expires_at"] <= now_str:
            raise HTTPException(status_code=400, detail="OTP has expired (3-minute limit). Please click Resend OTP.")

        return {"message": "OTP verified successfully! Please enter your new password."}
    finally:
        conn.close()

@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        clean_email = payload.email.strip().lower()
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        c.execute(
            "SELECT id FROM otp_codes WHERE LOWER(email) = ? AND otp = ? AND expires_at > ?",
            (clean_email, payload.otp.strip(), now_str)
        )
        record = c.fetchone()
        if not record:
            raise HTTPException(status_code=400, detail="OTP session expired or invalid. Please request a new OTP.")

        new_hash = hash_pw(payload.new_password)
        c.execute("UPDATE users SET password_hash = ? WHERE LOWER(email) = ?", (new_hash, clean_email))
        c.execute("DELETE FROM otp_codes WHERE LOWER(email) = ?", (clean_email,))

        c.execute(
            "INSERT INTO system_logs (timestamp, username, action, details) VALUES (datetime('now'), ?, 'Password Reset', ?)",
            (clean_email, "Password successfully updated via OTP verification")
        )
        conn.commit()

        return {"message": "Password successfully updated! You can now sign in."}
    finally:
        conn.close()

# ---------------------------------------------------------
# DOCUMENT UPLOAD WITH SHA-256 DUPLICATE DETECTION
# ---------------------------------------------------------
@app.post("/api/documents/upload")
async def upload_and_classify_documents(
    user_id: int = Form(...),
    files: List[UploadFile] = File(...)
):
    conn = get_db()
    c = conn.cursor()
    saved_records = []
    skipped_duplicates = []

    try:
        c.execute("SELECT username FROM users WHERE id = ?", (user_id,))
        user_row = c.fetchone()
        username = user_row["username"] if user_row else f"User_{user_id}"

        for file in files:
            contents = await file.read()
            size_kb = round(len(contents) / 1024, 2)
            filename = file.filename

            file_hash = hashlib.sha256(contents).hexdigest()

            c.execute(
                "SELECT id, filename, category FROM document_history WHERE user_id = ? AND file_hash = ? AND status = 'Active'",
                (user_id, file_hash)
            )
            existing_doc = c.fetchone()
            if existing_doc:
                skipped_duplicates.append({
                    "filename": filename,
                    "matched_with": existing_doc["filename"],
                    "category": existing_doc["category"]
                })
                c.execute("""
                    INSERT INTO system_logs (timestamp, username, action, details)
                    VALUES (datetime('now'), ?, 'Duplicate Blocked', ?)
                """, (username, f"SHA-256 matched '{filename}' with existing '{existing_doc['filename']}'"))
                continue

            category = "Miscellaneous"
            try:
                import classifier
                category = classifier.classify_file(filename, contents)
            except Exception as e:
                print(f"[Classifier Fallback for {filename}]: {e}")
                ext = filename.split(".")[-1].lower() if "." in filename else ""
                if ext in ["pdf", "doc", "docx"]:
                    category = "Lecture Notes"
                elif ext in ["py", "js", "html", "css", "java", "sql"]:
                    category = "Classroom Instruction"
                elif ext in ["png", "jpg", "jpeg", "webp"]:
                    category = "Question Bank"
                elif ext in ["txt", "md"]:
                    category = "Chat Transcript"
                else:
                    category = "Miscellaneous"

            summary_text = generate_ai_summary(filename, contents, category)

            user_target_dir = os.path.join(ORGANIZED_DIR, f"user_{user_id}", category)
            os.makedirs(user_target_dir, exist_ok=True)
            disk_path = os.path.join(user_target_dir, filename)

            with open(disk_path, "wb") as f_out:
                f_out.write(contents)

            c.execute("""
                INSERT INTO document_history (user_id, filename, category, summary, file_hash, file_path, size_kb, is_starred, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'Active', datetime('now'))
            """, (user_id, filename, category, summary_text, file_hash, disk_path, size_kb))
            doc_id = c.lastrowid

            c.execute("""
                INSERT INTO system_logs (timestamp, username, action, details)
                VALUES (datetime('now'), ?, 'Files Sorted', ?)
            """, (username, f"Classified '{filename}' under '{category}' ({size_kb} KB)"))

            saved_records.append({
                "id": doc_id,
                "filename": filename,
                "category": category,
                "summary": summary_text,
                "file_hash": file_hash[:12],
                "file_path": disk_path,
                "size_kb": size_kb,
                "is_starred": 0,
                "status": "Active"
            })

        conn.commit()
        return {
            "message": f"Processed {len(saved_records)} file(s), skipped {len(skipped_duplicates)} duplicate(s).",
            "files": saved_records,
            "skipped_duplicates": skipped_duplicates
        }

    except Exception as err:
        conn.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        conn.close()

@app.get("/api/documents")
def list_documents(
    user_id: int,
    search: Optional[str] = "",
    status_filter: Optional[str] = "Active"
):
    conn = get_db()
    c = conn.cursor()
    try:
        query = "SELECT * FROM document_history WHERE user_id = ?"
        params = [user_id]

        if status_filter and status_filter != "All":
            query += " AND status = ?"
            params.append(status_filter)

        if search and search.strip():
            query += " AND (filename LIKE ? OR category LIKE ? OR summary LIKE ?)"
            s_param = f"%{search.strip()}%"
            params.extend([s_param, s_param, s_param])

        query += " ORDER BY is_starred DESC, id DESC"
        c.execute(query, params)
        rows = c.fetchall()

        docs = []
        for r in rows:
            rk = r.keys()
            docs.append({
                "id": r["id"],
                "filename": r["filename"],
                "category": r["category"],
                "summary": r["summary"] if "summary" in rk and r["summary"] else f"Sorted under {r['category']}",
                "file_hash": r["file_hash"][:10] if "file_hash" in rk and r["file_hash"] else "",
                "file_path": r["file_path"] if "file_path" in rk else "",
                "size_kb": r["size_kb"] if "size_kb" in rk else 0.0,
                "is_starred": bool(r["is_starred"]) if "is_starred" in rk else False,
                "share_token": r["share_token"] if "share_token" in rk and r["share_token"] else "",
                "status": r["status"] if "status" in rk else "Active",
                "created_at": r["created_at"] if "created_at" in rk else ""
            })
        return {"documents": docs}
    finally:
        conn.close()

# ---------------------------------------------------------
# v5.0 UPGRADE 1: "ASK FOLDER AI" MULTI-DOCUMENT SYNTHESIS
# ---------------------------------------------------------
@app.post("/api/folders/ask")
def ask_folder_ai(payload: AskFolderSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        question = payload.question.strip()
        category = payload.category.strip()
        if not question:
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        if category == "All":
            c.execute("SELECT * FROM document_history WHERE user_id = ? AND status = 'Active'", (payload.user_id,))
        else:
            c.execute(
                "SELECT * FROM document_history WHERE user_id = ? AND category = ? AND status = 'Active'",
                (payload.user_id, category)
            )
        docs = c.fetchall()
        if not docs:
            raise HTTPException(status_code=404, detail=f"No active files found in '{category}'.")

        compiled_context = []
        for d in docs[:15]:
            rk = d.keys()
            fname = d["filename"]
            fcat = d["category"]
            fsum = d["summary"] if "summary" in rk and d["summary"] else ""
            fpath = d["file_path"] if "file_path" in rk and d["file_path"] else os.path.join(
                ORGANIZED_DIR, f"user_{payload.user_id}", fcat, fname
            )
            ext = fname.split(".")[-1].lower() if "." in fname else ""
            snippet = ""
            if os.path.exists(fpath) and ext in ["txt", "md", "py", "js", "ts", "html", "css", "java", "sql", "json", "csv"]:
                try:
                    with open(fpath, "rb") as f:
                        snippet = f.read(1500).decode("utf-8", errors="ignore").strip()
                except Exception:
                    snippet = ""
            compiled_context.append(
                f"File: {fname} (Category: {fcat}, Size: {d['size_kb']} KB)\nSummary: {fsum}\nExcerpt: {snippet[:500]}"
            )

        context_blob = "\n\n---\n\n".join(compiled_context)
        api_key = os.environ.get("GEMINI_API_KEY", "")
        answer = None

        if api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                prompt = (
                    f"You are SmartSorter Folder Synthesis AI. Analyze the following {len(docs)} files "
                    f"inside the '{category}' workspace folder and answer the user's request clearly.\n\n"
                    f"Folder Files Context:\n{context_blob}\n\nUser Request: {question}"
                )
                resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                if resp and resp.text:
                    answer = resp.text.strip()
            except Exception as e:
                print(f"[Folder AI Fallback]: {e}")

        if not answer:
            bullet_list = "\n".join(
                f"• {d['filename']} ({d['size_kb']} KB) — {d['summary'] if 'summary' in d.keys() and d['summary'] else d['category']}"
                for d in docs[:10]
            )
            answer = (
                f"📚 Multi-Document Synthesis for '{category}' ({len(docs)} active files):\n\n"
                f"Indexed Documents Overview:\n{bullet_list}\n\n"
                f"Key Synthesis & Study Guide:\n"
                f"1. Combined Scope: Covers {len(docs)} curated resources totaling {round(sum(d['size_kb'] for d in docs), 1)} KB.\n"
                f"2. Core Themes: Consolidated materials across {category} ready for revision and export.\n"
                f"3. Recommended Action: Use 'Save Notes (.md)' to download this synthesis or export the folder as a ZIP bundle."
            )

        c.execute("SELECT username FROM users WHERE id = ?", (payload.user_id,))
        u = c.fetchone()
        uname = u["username"] if u else f"User_{payload.user_id}"

        c.execute("""
            INSERT INTO system_logs (timestamp, username, action, details)
            VALUES (datetime('now'), ?, 'Folder AI Synthesis', ?)
        """, (uname, f"Synthesized {len(docs)} files in '{category}': {question[:40]}"))
        conn.commit()

        return {"answer": answer, "category": category, "file_count": len(docs)}
    finally:
        conn.close()

# ---------------------------------------------------------
# v5.0 UPGRADE 2: STAR / PIN PRIORITY FILES
# ---------------------------------------------------------
@app.post("/api/documents/{doc_id}/star")
def toggle_star_document(doc_id: int):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT id, filename, is_starred FROM document_history WHERE id = ?", (doc_id,))
        doc = c.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        rk = doc.keys()
        current_star = int(doc["is_starred"]) if "is_starred" in rk and doc["is_starred"] else 0
        new_star = 0 if current_star == 1 else 1

        c.execute("UPDATE document_history SET is_starred = ? WHERE id = ?", (new_star, doc_id))
        conn.commit()
        return {"id": doc_id, "is_starred": bool(new_star)}
    finally:
        conn.close()

# ---------------------------------------------------------
# v5.0 UPGRADE 3: INTERACTIVE ADMIN ACCOUNT STATUS TOGGLE
# ---------------------------------------------------------
@app.put("/api/admin/users/{target_user_id}/status")
def toggle_user_account_status(target_user_id: int, payload: UserStatusUpdateSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        new_status = payload.account_status.strip()
        if new_status not in ["Active", "Suspended"]:
            raise HTTPException(status_code=400, detail="Status must be 'Active' or 'Suspended'.")

        c.execute("SELECT id, username, email, role FROM users WHERE id = ?", (target_user_id,))
        u = c.fetchone()
        if not u:
            raise HTTPException(status_code=404, detail="User account not found.")

        if u["email"].lower() == CREATOR_EMAIL.lower():
            raise HTTPException(status_code=400, detail="Cannot suspend the Creator Admin account.")

        c.execute("UPDATE users SET account_status = ? WHERE id = ?", (new_status, target_user_id))
        c.execute("""
            INSERT INTO system_logs (timestamp, username, action, details)
            VALUES (datetime('now'), 'Creator Admin', 'Account Status Changed', ?)
        """, (f"Set {u['username']} ({u['email']}) status to {new_status}",))
        conn.commit()

        return {"message": f"Account {u['email']} status updated to {new_status}", "status": new_status}
    finally:
        conn.close()

# ---------------------------------------------------------
# v5.0 UPGRADE 4: ONE-CLICK SHAREABLE FILE LINKS
# ---------------------------------------------------------
@app.post("/api/documents/{doc_id}/share")
def generate_share_link(doc_id: int):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM document_history WHERE id = ?", (doc_id,))
        doc = c.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        rk = doc.keys()
        token = doc["share_token"] if "share_token" in rk and doc["share_token"] else ""
        if not token:
            token = secrets.token_hex(8)
            c.execute("UPDATE document_history SET share_token = ? WHERE id = ?", (token, doc_id))

            c.execute("SELECT username FROM users WHERE id = ?", (doc["user_id"],))
            u = c.fetchone()
            uname = u["username"] if u else f"User_{doc['user_id']}"

            c.execute("""
                INSERT INTO system_logs (timestamp, username, action, details)
                VALUES (datetime('now'), ?, 'Share Link Created', ?)
            """, (uname, f"Generated share link for '{doc['filename']}'"))
            conn.commit()

        share_url = f"http://localhost:8000/api/share/{token}"
        return {"share_token": token, "share_url": share_url, "filename": doc["filename"]}
    finally:
        conn.close()

@app.get("/api/share/{token}")
def access_shared_file(token: str, download: bool = Query(False)):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM document_history WHERE share_token = ? AND status = 'Active'", (token.strip(),))
        doc = c.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Shared link is invalid or file has been removed.")

        rk = doc.keys()
        disk_path = doc["file_path"] if "file_path" in rk and doc["file_path"] else os.path.join(
            ORGANIZED_DIR, f"user_{doc['user_id']}", doc["category"], doc["filename"]
        )
        if not os.path.exists(disk_path):
            raise HTTPException(status_code=404, detail="Physical file missing on disk.")

        mime_type, _ = mimetypes.guess_type(doc["filename"])
        mime_type = mime_type or "application/octet-stream"
        disposition = "attachment" if download else "inline"

        return FileResponse(
            path=disk_path,
            media_type=mime_type,
            headers={"Content-Disposition": f'{disposition}; filename="{doc["filename"]}"'}
        )
    finally:
        conn.close()

# ---------------------------------------------------------
# SINGLE DOCUMENT "ASK GEMINI" Q&A ENDPOINT
# ---------------------------------------------------------
@app.post("/api/documents/{doc_id}/ask")
def ask_document_question(doc_id: int, payload: AskDocumentSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        question = payload.question.strip()
        if not question:
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        c.execute("SELECT * FROM document_history WHERE id = ?", (doc_id,))
        doc = c.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        rk = doc.keys()
        filename = doc["filename"]
        category = doc["category"]
        summary = doc["summary"] if "summary" in rk and doc["summary"] else ""
        disk_path = doc["file_path"] if "file_path" in rk and doc["file_path"] else os.path.join(
            ORGANIZED_DIR, f"user_{doc['user_id']}", category, filename
        )

        contents = b""
        if os.path.exists(disk_path):
            with open(disk_path, "rb") as f:
                contents = f.read()

        ext = filename.split(".")[-1].lower() if "." in filename else ""
        api_key = os.environ.get("GEMINI_API_KEY", "")
        answer = None

        if api_key and contents:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=api_key)

                if ext in ["txt", "md", "py", "js", "ts", "html", "css", "java", "sql", "json", "csv"]:
                    text_data = contents[:15000].decode("utf-8", errors="ignore")
                    prompt = (
                        f"You are SmartSorter AI Assistant. The user is viewing '{filename}' "
                        f"(Category: {category}). Answer their question concisely.\n\n"
                        f"File Content:\n{text_data}\n\nUser Question: {question}"
                    )
                    resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                    if resp and resp.text:
                        answer = resp.text.strip()
                elif ext in ["pdf", "png", "jpg", "jpeg", "webp"]:
                    mime_type, _ = mimetypes.guess_type(filename)
                    mime_type = mime_type or "application/pdf"
                    part = types.Part.from_bytes(data=contents, mime_type=mime_type)
                    prompt = (
                        f"You are SmartSorter AI Assistant analyzing '{filename}' ({category}). "
                        f"Answer the user's question concisely: {question}"
                    )
                    resp = client.models.generate_content(model="gemini-2.5-flash", contents=[part, prompt])
                    if resp and resp.text:
                        answer = resp.text.strip()
            except Exception as e:
                print(f"[Gemini Q&A Fallback for {filename}]: {e}")

        if not answer:
            if ext in ["txt", "md", "py", "js", "ts", "html", "css", "java", "sql", "json", "csv"] and contents:
                text_str = contents.decode("utf-8", errors="ignore")
                lines = [l.strip() for l in text_str.splitlines() if l.strip()]
                word_count = len(text_str.split())
                preview_lines = "\n".join(f"• {l[:90]}" for l in lines[:5])
                if "quiz" in question.lower() or "question" in question.lower():
                    answer = (
                        f"📝 Study Quiz for '{filename}' ({category}):\n"
                        f"1. What is the primary purpose of {filename} within {category}?\n"
                        f"2. Explain the key logic or structure starting with: '{lines[0][:60] if lines else filename}'.\n"
                        f"3. How can the concepts in this {doc['size_kb']} KB file be applied practically?"
                    )
                else:
                    answer = (
                        f"📄 Analysis of '{filename}' ({category}):\n"
                        f"• Stats: {len(lines)} non-empty lines, ~{word_count} words ({doc['size_kb']} KB).\n"
                        f"• Summary: {summary}\n"
                        f"• Key Excerpts:\n{preview_lines}"
                    )
            else:
                if "quiz" in question.lower():
                    answer = (
                        f"📝 Review Questions for '{filename}' ({category}):\n"
                        f"1. What are the core topics covered in {os.path.splitext(filename)[0]}?\n"
                        f"2. How does this {ext.upper()} resource relate to your {category} coursework?\n"
                        f"3. Summarize the primary takeaways from this {doc['size_kb']} KB document."
                    )
                else:
                    answer = (
                        f"📌 Document Insights for '{filename}':\n"
                        f"• Category: {category}\n"
                        f"• AI Summary: {summary or 'Indexed multimodal asset'}\n"
                        f"• Footprint: {doc['size_kb']} KB ({ext.upper()} format)\n"
                        f"• Integrity Hash: {doc['file_hash'][:12] if 'file_hash' in rk and doc['file_hash'] else 'Verified'}"
                    )

        c.execute("SELECT username FROM users WHERE id = ?", (doc["user_id"],))
        u = c.fetchone()
        uname = u["username"] if u else f"User_{doc['user_id']}"

        c.execute("""
            INSERT INTO system_logs (timestamp, username, action, details)
            VALUES (datetime('now'), ?, 'AI Document Q&A', ?)
        """, (uname, f"Asked Gemini about '{filename}': {question[:45]}"))
        conn.commit()

        return {"answer": answer, "filename": filename}
    finally:
        conn.close()

# ---------------------------------------------------------
# FILE PREVIEW, ZIP EXPORT, CATEGORY OVERRIDE & AUDIT CSV
# ---------------------------------------------------------
@app.get("/api/documents/{doc_id}/file")
def serve_document_file(doc_id: int, download: bool = Query(False)):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM document_history WHERE id = ?", (doc_id,))
        doc = c.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document record not found.")

        rk = doc.keys()
        disk_path = doc["file_path"] if "file_path" in rk and doc["file_path"] else os.path.join(
            ORGANIZED_DIR, f"user_{doc['user_id']}", doc["category"], doc["filename"]
        )

        if not os.path.exists(disk_path):
            raise HTTPException(status_code=404, detail="Physical file not found on disk.")

        mime_type, _ = mimetypes.guess_type(doc["filename"])
        if not mime_type:
            mime_type = "application/octet-stream"

        disposition = "attachment" if download else "inline"
        return FileResponse(
            path=disk_path,
            media_type=mime_type,
            headers={"Content-Disposition": f'{disposition}; filename="{doc["filename"]}"'}
        )
    finally:
        conn.close()

@app.get("/api/documents/export-zip")
def export_category_zip(user_id: int = Query(...), category: str = Query("All")):
    conn = get_db()
    c = conn.cursor()
    try:
        if category == "All":
            c.execute("SELECT * FROM document_history WHERE user_id = ? AND status = 'Active'", (user_id,))
        else:
            c.execute("SELECT * FROM document_history WHERE user_id = ? AND category = ? AND status = 'Active'", (user_id, category))
        rows = c.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No active files found to export.")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for r in rows:
                rk = r.keys()
                disk_path = r["file_path"] if "file_path" in rk and r["file_path"] else os.path.join(
                    ORGANIZED_DIR, f"user_{user_id}", r["category"], r["filename"]
                )
                if os.path.exists(disk_path):
                    arcname = os.path.join(r["category"], r["filename"]) if category == "All" else r["filename"]
                    zip_file.write(disk_path, arcname=arcname)

        c.execute("SELECT username FROM users WHERE id = ?", (user_id,))
        u = c.fetchone()
        uname = u["username"] if u else f"User_{user_id}"

        c.execute("""
            INSERT INTO system_logs (timestamp, username, action, details)
            VALUES (datetime('now'), ?, 'ZIP Archive Export', ?)
        """, (uname, f"Exported '{category}' folder as ZIP ({len(rows)} files)"))
        conn.commit()

        zip_buffer.seek(0)
        safe_cat = category.replace(" ", "_")
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="SmartSorter_{safe_cat}.zip"'}
        )
    finally:
        conn.close()

@app.put("/api/documents/{doc_id}/category")
def override_document_category(doc_id: int, payload: CategoryOverrideSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        new_cat = payload.new_category.strip()
        if not new_cat:
            raise HTTPException(status_code=400, detail="New category cannot be empty.")

        c.execute("SELECT * FROM document_history WHERE id = ?", (doc_id,))
        doc = c.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        old_cat = doc["category"]
        user_id = doc["user_id"]
        filename = doc["filename"]
        rk = doc.keys()

        old_path = doc["file_path"] if "file_path" in rk and doc["file_path"] else os.path.join(
            ORGANIZED_DIR, f"user_{user_id}", old_cat, filename
        )

        new_dir = os.path.join(ORGANIZED_DIR, f"user_{user_id}", new_cat)
        os.makedirs(new_dir, exist_ok=True)
        new_path = os.path.join(new_dir, filename)

        if os.path.exists(old_path) and old_path != new_path:
            shutil.move(old_path, new_path)

        c.execute(
            "UPDATE document_history SET category = ?, file_path = ? WHERE id = ?",
            (new_cat, new_path, doc_id)
        )

        c.execute("SELECT username FROM users WHERE id = ?", (user_id,))
        u = c.fetchone()
        uname = u["username"] if u else f"User_{user_id}"

        c.execute("""
            INSERT INTO system_logs (timestamp, username, action, details)
            VALUES (datetime('now'), ?, 'Category Override', ?)
        """, (uname, f"Moved '{filename}' from '{old_cat}' to '{new_cat}'"))

        conn.commit()
        return {"message": f"Moved '{filename}' to {new_cat}", "new_category": new_cat, "file_path": new_path}
    finally:
        conn.close()

@app.get("/api/admin/export-audit-csv")
def export_audit_logs_csv():
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT id, timestamp, username, action, details FROM system_logs ORDER BY id DESC")
        rows = c.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Log ID", "UTC Timestamp", "Username", "Event Action", "Execution Metadata"])

        for r in rows:
            writer.writerow([r["id"], r["timestamp"], r["username"], r["action"], r["details"] or ""])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="SmartSorter_Audit_Log.csv"'}
        )
    finally:
        conn.close()

# ---------------------------------------------------------
# DOCUMENT DELETION & RESTORATION ENDPOINTS
# ---------------------------------------------------------
@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, permanent: bool = Query(False)):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM document_history WHERE id = ?", (doc_id,))
        doc = c.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        user_id = doc["user_id"]
        filename = doc["filename"]
        category = doc["category"]

        c.execute("SELECT username FROM users WHERE id = ?", (user_id,))
        u = c.fetchone()
        uname = u["username"] if u else f"User_{user_id}"

        if permanent:
            c.execute("DELETE FROM document_history WHERE id = ?", (doc_id,))
            file_disk = doc["file_path"] if "file_path" in doc.keys() and doc["file_path"] else os.path.join(ORGANIZED_DIR, f"user_{user_id}", category, filename)
            if os.path.exists(file_disk):
                try:
                    os.remove(file_disk)
                except Exception as e:
                    print(f"Could not delete physical file: {e}")

            c.execute("""
                INSERT INTO system_logs (timestamp, username, action, details)
                VALUES (datetime('now'), ?, 'Permanent Purge', ?)
            """, (uname, f"Purged '{filename}' permanently from SQLite & storage"))
        else:
            c.execute("UPDATE document_history SET status = 'Deleted' WHERE id = ?", (doc_id,))
            c.execute("""
                INSERT INTO system_logs (timestamp, username, action, details)
                VALUES (datetime('now'), ?, 'File Soft Deleted', ?)
            """, (uname, f"Moved '{filename}' to trash"))

        conn.commit()
        return {"message": "Document updated successfully"}
    finally:
        conn.close()

@app.post("/api/documents/{doc_id}/restore")
def restore_document(doc_id: int):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM document_history WHERE id = ?", (doc_id,))
        doc = c.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        c.execute("UPDATE document_history SET status = 'Active' WHERE id = ?", (doc_id,))
        c.execute("""
            INSERT INTO system_logs (timestamp, username, action, details)
            VALUES (datetime('now'), (SELECT username FROM users WHERE id = ?), 'File Restored', ?)
        """, (doc["user_id"], f"Restored '{doc['filename']}' to active workspace"))

        conn.commit()
        return {"message": "Document restored successfully"}
    finally:
        conn.close()

@app.post("/api/documents/soft-delete")
def soft_delete_all_documents(user_id: int = Query(...)):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("UPDATE document_history SET status = 'Deleted' WHERE user_id = ? AND status = 'Active'", (user_id,))
        c.execute("""
            INSERT INTO system_logs (timestamp, username, action, details)
            VALUES (datetime('now'), (SELECT username FROM users WHERE id = ?), 'Batch Soft Delete', 'Moved all active files to trash')
        """, (user_id,))
        conn.commit()
        return {"message": "All active files moved to trash"}
    finally:
        conn.close()

@app.post("/api/documents/hard-delete-all")
def hard_delete_all_documents(user_id: int = Query(...)):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM document_history WHERE user_id = ?", (user_id,))
        user_folder = os.path.join(ORGANIZED_DIR, f"user_{user_id}")
        if os.path.exists(user_folder):
            shutil.rmtree(user_folder, ignore_errors=True)

        c.execute("""
            INSERT INTO system_logs (timestamp, username, action, details)
            VALUES (datetime('now'), (SELECT username FROM users WHERE id = ?), 'Complete Purge', 'Wiped all document records and disk assets')
        """, (user_id,))
        conn.commit()
        return {"message": "All documents wiped from database and storage"}
    finally:
        conn.close()

# ---------------------------------------------------------
# WORKSPACE METRICS & CREATOR ADMIN OVERSIGHT
# (Storage quota left untouched at 100 MB for custom plan)
# ---------------------------------------------------------
@app.get("/api/workspace/summary")
def get_workspace_summary(user_id: int):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT COUNT(*), COALESCE(SUM(size_kb), 0) FROM document_history WHERE user_id = ? AND status = 'Active'", (user_id,))
        row = c.fetchone()
        active_count = row[0] if row else 0
        total_kb = row[1] if row else 0.0

        c.execute("""
            SELECT category, COUNT(*), COALESCE(SUM(size_kb), 0)
            FROM document_history
            WHERE user_id = ? AND status = 'Active'
            GROUP BY category
        """, (user_id,))
        cat_rows = c.fetchall()
        cat_counts = {r[0]: r[1] for r in cat_rows}
        cat_storage_kb = {r[0]: round(r[2], 2) for r in cat_rows}

        return {
            "active_files_count": active_count or 0,
            "total_storage_kb": round(total_kb or 0.0, 2),
            "total_storage_mb": round((total_kb or 0.0) / 1024, 2),
            "storage_limit_mb": 100,
            "category_counts": cat_counts,
            "category_storage_kb": cat_storage_kb
        }
    finally:
        conn.close()

@app.get("/api/workspace/activity")
def get_recent_activity(limit: int = 50):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT id, timestamp, username, action, details FROM system_logs ORDER BY id DESC LIMIT ?", (limit,))
        logs = [dict(row) for row in c.fetchall()]
        return logs
    finally:
        conn.close()

@app.get("/api/admin/overview")
def get_admin_overview():
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT id, username, email, COALESCE(role, 'user') as role, COALESCE(account_status, 'Active') as account_status FROM users")
        user_rows = c.fetchall()

        total_accounts = len(user_rows)
        admin_count = 0
        member_count = 0
        users_list = []

        c.execute("SELECT COUNT(*) FROM document_history")
        total_files_classified = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*), COALESCE(SUM(size_kb), 0) FROM document_history WHERE status = 'Active'")
        act_row = c.fetchone()
        total_active_files = act_row[0] or 0
        total_active_storage_kb = act_row[1] or 0.0

        c.execute("SELECT COUNT(*) FROM document_history WHERE status = 'Deleted'")
        total_deleted_files = c.fetchone()[0] or 0

        for u in user_rows:
            uid = u["id"]
            uname = u["username"]
            uemail = u["email"]
            urole = (u["role"] or "user").strip()
            ustatus = u["account_status"] if "account_status" in u.keys() and u["account_status"] else "Active"

            if urole.lower() == "admin":
                admin_count += 1
            else:
                member_count += 1

            c.execute("SELECT COUNT(*) FROM document_history WHERE user_id = ?", (uid,))
            u_lifetime = c.fetchone()[0] or 0

            c.execute("SELECT COUNT(*), COALESCE(SUM(size_kb), 0) FROM document_history WHERE user_id = ? AND status = 'Active'", (uid,))
            u_act = c.fetchone()
            u_active_count = u_act[0] or 0
            u_active_kb = u_act[1] or 0.0

            c.execute("SELECT COUNT(*) FROM document_history WHERE user_id = ? AND status = 'Deleted'", (uid,))
            u_deleted_count = c.fetchone()[0] or 0

            users_list.append({
                "id": uid,
                "name": uname,
                "email": uemail,
                "role": urole.upper(),
                "status": ustatus,
                "total_classified": u_lifetime,
                "active_files": u_active_count,
                "deleted_files": u_deleted_count,
                "storage_kb": round(u_active_kb, 1)
            })

        return {
            "total_accounts": total_accounts,
            "admin_count": admin_count,
            "member_count": member_count,
            "total_files_classified": total_files_classified,
            "active_files": total_active_files,
            "deleted_files": total_deleted_files,
            "total_storage_mb": round(total_active_storage_kb / 1024, 2),
            "users": users_list
        }
    finally:
        conn.close()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "SmartSorter", "version": "5.0.0"}