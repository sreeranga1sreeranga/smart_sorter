import sqlite3
import os

DB_NAME = "documents.db"

def get_connection():
    conn = sqlite3.connect(DB_NAME, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()

    # Users Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Document History Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS document_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            category TEXT NOT NULL,
            file_path TEXT NOT NULL,
            size_kb REAL NOT NULL,
            status TEXT DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Audit Logs Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            username TEXT,
            action TEXT NOT NULL,
            details TEXT
        )
    """)

    # OTP Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            otp TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()

def log_action(action: str, details: str = "", user_id: int = None, username: str = None):
    conn = get_connection()
    c = conn.cursor()
    user_label = username or "System"
    c.execute("INSERT INTO system_logs (username, action, details) VALUES (?, ?, ?)",
              (user_label, action, details))
    conn.commit()
    conn.close()

def get_system_audit_logs(limit: int = 50):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, timestamp, username, action, details FROM system_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return rows

def get_user_by_email(email: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, username, email, password_hash, role FROM users WHERE email = ?", (email.strip(),))
    user = c.fetchone()
    conn.close()
    return user

def create_user(username: str, email: str, password_hash: str, role: str = "user"):
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                  (username.strip(), email.strip(), password_hash, role))
        conn.commit()
        conn.close()
        return True, "User registered successfully."
    except sqlite3.IntegrityError:
        conn.close()
        return False, "An account with this email already exists."

def store_otp(email: str, otp: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM otp_codes WHERE email = ?", (email,))
    c.execute("INSERT INTO otp_codes (email, otp) VALUES (?, ?)", (email, otp))
    conn.commit()
    conn.close()

def verify_otp(email: str, otp: str) -> bool:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM otp_codes WHERE email = ? AND otp = ?", (email.strip(), otp.strip()))
    row = c.fetchone()
    if row:
        c.execute("DELETE FROM otp_codes WHERE email = ?", (email.strip(),))
        conn.commit()
        conn.close()
        return True
    conn.close()
    return False

def update_user_password(email: str, new_password_hash: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE users SET password_hash = ? WHERE email = ?", (new_password_hash, email.strip()))
    conn.commit()
    conn.close()

def save_document(user_id: int, filename: str, category: str, file_path: str, size_kb: float):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO document_history (user_id, filename, category, file_path, size_kb, status)
        VALUES (?, ?, ?, ?, ?, 'Active')
    """, (user_id, filename, category, file_path, size_kb))
    conn.commit()
    conn.close()

def get_user_documents(user_id: int, search: str = "", status_filter: str = "All"):
    conn = get_connection()
    c = conn.cursor()
    query = "SELECT id, filename, category, size_kb, status, created_at, deleted_at, file_path FROM document_history WHERE user_id = ?"
    params = [user_id]

    if status_filter in ["Active", "Deleted"]:
        query += " AND status = ?"
        params.append(status_filter)

    if search.strip():
        query += " AND (filename LIKE ? OR category LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term])

    query += " ORDER BY id DESC"
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    return rows

def delete_document_by_id(doc_id: int, permanent: bool = False):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT filename, file_path, user_id FROM document_history WHERE id = ?", (doc_id,))
    doc = c.fetchone()

    if not doc:
        conn.close()
        return False, "Document not found."

    filename, file_path, user_id = doc

    # Delete local file from disk if it exists
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    if permanent:
        c.execute("DELETE FROM document_history WHERE id = ?", (doc_id,))
        log_action("File Permanently Deleted", f"Deleted {filename} from database", user_id=user_id)
    else:
        c.execute("UPDATE document_history SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE id = ?", (doc_id,))
        log_action("File Soft-Deleted", f"Moved {filename} to trash", user_id=user_id)

    conn.commit()
    conn.close()
    return True, filename

def restore_document_by_id(doc_id: int):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE document_history SET status = 'Active', deleted_at = NULL WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    return True

def soft_delete_user_documents(user_id: int):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE document_history SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'Active'", (user_id,))
    conn.commit()
    conn.close()

def hard_delete_user_documents(user_id: int):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM document_history WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

def get_admin_dashboard_metrics():
    conn = get_connection()
    c = conn.cursor()
    
    # 1. Fetch user accounts breakdown
    c.execute("SELECT id, username, email, COALESCE(role, 'user') FROM users")
    users = c.fetchall()
    
    admin_count = 0
    member_count = 0
    for u in users:
        role = (u[3] or "user").strip().lower()
        if role == "admin":
            admin_count += 1
        else:
            member_count += 1
            
    total_accounts = len(users)
    
    # 2. Document metrics (All-time lifetime classified vs Active vs Deleted)
    c.execute("SELECT COUNT(id) FROM document_history")
    total_files_classified = c.fetchone()[0] or 0
    
    c.execute("SELECT COUNT(id), COALESCE(SUM(size_kb), 0) FROM document_history WHERE status = 'Active'")
    active_row = c.fetchone()
    active_files = active_row[0] or 0
    active_storage_kb = active_row[1] or 0.0
    
    c.execute("SELECT COUNT(id) FROM document_history WHERE status = 'Deleted'")
    deleted_files = c.fetchone()[0] or 0
    
    # 3. User roster breakdown
    user_roster = []
    for u in users:
        uid, uname, uemail, urole = u[0], u[1], u[2], u[3]
        
        # All-time files classified by this user
        c.execute("SELECT COUNT(id) FROM document_history WHERE user_id = ?", (uid,))
        user_lifetime_files = c.fetchone()[0] or 0
        
        # Active files & current storage
        c.execute("SELECT COUNT(id), COALESCE(SUM(size_kb), 0) FROM document_history WHERE user_id = ? AND status = 'Active'", (uid,))
        u_act = c.fetchone()
        user_active_files = u_act[0] or 0
        user_storage_kb = u_act[1] or 0.0
        
        c.execute("SELECT COUNT(id) FROM document_history WHERE user_id = ? AND status = 'Deleted'", (uid,))
        user_deleted_files = c.fetchone()[0] or 0
        
        user_roster.append({
            "id": uid,
            "name": uname,
            "email": uemail,
            "role": urole.upper(),
            "total_classified": user_lifetime_files,
            "active_files": user_active_files,
            "deleted_files": user_deleted_files,
            "storage_kb": round(user_storage_kb, 1),
            "status": "Active"
        })
        
    conn.close()
    return {
        "total_accounts": total_accounts,
        "admin_count": admin_count,
        "member_count": member_count,
        "total_files_classified": total_files_classified,
        "active_files": active_files,
        "deleted_files": deleted_files,
        "total_storage_mb": round(active_storage_kb / 1024, 2),
        "users": user_roster
    }