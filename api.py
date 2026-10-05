import os
import shutil
import sqlite3
import random
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------
# CONSTANTS & CONFIGURATION
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "documents.db")
ORGANIZED_DIR = os.path.join(BASE_DIR, "organized_files")
CREATOR_EMAIL = "noragamiarota@gmail.com"

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
            role TEXT DEFAULT 'user'
        );
    """)

    # 2. Document History Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS document_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            category TEXT NOT NULL,
            file_path TEXT,
            size_kb REAL DEFAULT 0.0,
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

    # Migration Safety: Check if columns exist in document_history
    c.execute("PRAGMA table_info(document_history);")
    cols = [col["name"] for col in c.fetchall()]
    if "file_path" not in cols:
        c.execute("ALTER TABLE document_history ADD COLUMN file_path TEXT DEFAULT '';")
    if "size_kb" not in cols:
        c.execute("ALTER TABLE document_history ADD COLUMN size_kb REAL DEFAULT 0.0;")
    if "status" not in cols:
        c.execute("ALTER TABLE document_history ADD COLUMN status TEXT DEFAULT 'Active';")
    if "created_at" not in cols:
        c.execute("ALTER TABLE document_history ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;")

    conn.commit()
    conn.close()

# Run DB sync on startup
init_and_migrate_db()

# ---------------------------------------------------------
# FASTAPI APPLICATION & CORS MIDDLEWARE
# ---------------------------------------------------------
app = FastAPI(title="SmartSorter API", version="2.0.0")

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
# PYDANTIC SCHEMAS
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

class ResetPasswordSchema(BaseModel):
    email: str
    otp: str
    new_password: str

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_pw(plain: str, stored: str) -> bool:
    return stored == plain or stored == hash_pw(plain)

# ---------------------------------------------------------
# AUTHENTICATION ENDPOINTS
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
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
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
        c.execute("SELECT id, username, email, password_hash, COALESCE(role, 'user') as role FROM users WHERE LOWER(email) = ?", (clean_email,))
        user = c.fetchone()

        if not user or not verify_pw(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        role = user["role"]
        if clean_email == CREATOR_EMAIL.lower() and role.lower() != "admin":
            role = "admin"
            c.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user["id"],))

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
        expires_at = datetime.utcnow() + timedelta(minutes=15)

        c.execute("DELETE FROM otp_codes WHERE LOWER(email) = ?", (clean_email,))
        c.execute("INSERT INTO otp_codes (email, otp, expires_at) VALUES (?, ?, ?)", (clean_email, otp_code, expires_at))

        c.execute(
            "INSERT INTO system_logs (timestamp, username, action, details) VALUES (datetime('now'), ?, 'OTP Dispatched', ?)",
            (user["username"], f"Generated recovery OTP for {clean_email}")
        )
        conn.commit()

        print(f"\n==========================================")
        print(f"🔑 [SMARTSORTER SECURITY OTP]: {otp_code} for {clean_email}")
        print(f"==========================================\n")

        return {"message": f"Verification code dispatched! (Preview: {otp_code})"}
    finally:
        conn.close()

@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordSchema):
    conn = get_db()
    c = conn.cursor()
    try:
        clean_email = payload.email.strip().lower()
        c.execute(
            "SELECT id FROM otp_codes WHERE LOWER(email) = ? AND otp = ? AND expires_at > datetime('now')",
            (clean_email, payload.otp.strip())
        )
        record = c.fetchone()
        if not record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")

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
# DOCUMENT MANAGEMENT & MULTIMODAL INGESTION
# ---------------------------------------------------------
@app.post("/api/documents/upload")
async def upload_and_classify_documents(
    user_id: int = Form(...),
    files: List[UploadFile] = File(...)
):
    conn = get_db()
    c = conn.cursor()
    saved_records = []

    try:
        c.execute("SELECT username FROM users WHERE id = ?", (user_id,))
        user_row = c.fetchone()
        username = user_row["username"] if user_row else f"User_{user_id}"

        for file in files:
            contents = await file.read()
            size_kb = round(len(contents) / 1024, 2)
            filename = file.filename

            # Semantic Gemini Classification with Fallback
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

            # Disk write
            user_target_dir = os.path.join(ORGANIZED_DIR, f"user_{user_id}", category)
            os.makedirs(user_target_dir, exist_ok=True)
            disk_path = os.path.join(user_target_dir, filename)

            with open(disk_path, "wb") as f_out:
                f_out.write(contents)

            # SQLite persistence (satisfies NOT NULL constraint on file_path)
            c.execute("""
                INSERT INTO document_history (user_id, filename, category, file_path, size_kb, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'Active', datetime('now'))
            """, (user_id, filename, category, disk_path, size_kb))
            doc_id = c.lastrowid

            # Audit record
            c.execute("""
                INSERT INTO system_logs (timestamp, username, action, details)
                VALUES (datetime('now'), ?, 'Files Sorted', ?)
            """, (username, f"Classified '{filename}' under '{category}' ({size_kb} KB)"))

            saved_records.append({
                "id": doc_id,
                "filename": filename,
                "category": category,
                "file_path": disk_path,
                "size_kb": size_kb,
                "status": "Active"
            })

        conn.commit()
        return {"message": f"Successfully classified {len(saved_records)} file(s)", "files": saved_records}

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
            query += " AND (filename LIKE ? OR category LIKE ?)"
            s_param = f"%{search.strip()}%"
            params.extend([s_param, s_param])

        query += " ORDER BY id DESC"
        c.execute(query, params)
        rows = c.fetchall()

        docs = []
        for r in rows:
            docs.append({
                "id": r["id"],
                "filename": r["filename"],
                "category": r["category"],
                "file_path": r["file_path"] if "file_path" in r.keys() else "",
                "size_kb": r["size_kb"] if "size_kb" in r.keys() else 0.0,
                "status": r["status"] if "status" in r.keys() else "Active",
                "created_at": r["created_at"] if "created_at" in r.keys() else ""
            })
        return {"documents": docs}
    finally:
        conn.close()

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
# WORKSPACE METRICS & AUDIT FEED
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

        c.execute("SELECT category, COUNT(*) FROM document_history WHERE user_id = ? AND status = 'Active' GROUP BY category", (user_id,))
        cat_counts = {r[0]: r[1] for r in c.fetchall()}

        return {
            "active_files_count": active_count or 0,
            "total_storage_mb": round((total_kb or 0.0) / 1024, 2),
            "storage_limit_mb": 100,
            "category_counts": cat_counts
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

# ---------------------------------------------------------
# CREATOR ADMIN OVERSIGHT ENDPOINT
# ---------------------------------------------------------
@app.get("/api/admin/overview")
def get_admin_overview():
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT id, username, email, COALESCE(role, 'user') as role FROM users")
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
                "status": "Active",
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

# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "SmartSorter", "version": "2.0.0"}