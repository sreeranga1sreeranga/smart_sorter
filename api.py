import os
import shutil
import sqlite3
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
import auth
from classifier import get_client, classify_content

db.init_db()
ai_client = get_client()

app = FastAPI(title="Smart Sorter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    invite_key: Optional[str] = None

class LoginSchema(BaseModel):
    email: str
    password: str

class OTPRequestSchema(BaseModel):
    email: str

class ResetPasswordSchema(BaseModel):
    email: str
    otp: str
    new_password: str

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterSchema):
    role = "admin" if payload.invite_key == "CREATOR_ROOT_2026" else "user"
    hashed_pw = auth.hash_password(payload.password)
    success, msg = db.create_user(payload.name, payload.email, hashed_pw, role)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    db.log_action("User Registration", f"Role: {role}", username=payload.name)
    return {"message": msg, "role": role}

@app.post("/api/auth/login")
def login_user(payload: LoginSchema):
    user = db.get_user_by_email(payload.email)
    if not user or not auth.check_password(payload.password, user[3]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    user_data = {"id": user[0], "name": user[1], "email": user[2], "role": user[4]}
    db.log_action("User Login", f"Logged in ({user[2]})", user[0], user[1])
    return {"message": "Login successful", "user": user_data}

@app.post("/api/auth/request-otp")
def request_password_otp(payload: OTPRequestSchema):
    user = db.get_user_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")
    success, msg = auth.send_otp_email(payload.email)
    if not success:
        raise HTTPException(status_code=500, detail=msg)
    return {"message": msg}

@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordSchema):
    if not db.verify_otp(payload.email, payload.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")
    new_hash = auth.hash_password(payload.new_password)
    db.update_user_password(payload.email, new_hash)
    db.log_action("Password Reset", "Updated via OTP", username=payload.email)
    return {"message": "Password reset successfully. You can now sign in."}

@app.post("/api/documents/upload")
async def upload_and_classify(user_id: int = Form(...), files: List[UploadFile] = File(...)):
    if not ai_client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")

    user_folder = f"organized_files/user_{user_id}"
    os.makedirs(user_folder, exist_ok=True)
    processed = []

    for file in files:
        file_bytes = await file.read()
        category = classify_content(file.filename, file_bytes, ai_client)
        target_folder = os.path.join(user_folder, category)
        os.makedirs(target_folder, exist_ok=True)
        target_path = os.path.join(target_folder, file.filename)

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        size_kb = len(file_bytes) / 1024
        db.save_document(user_id, file.filename, category, target_path, size_kb)
        processed.append({"filename": file.filename, "category": category, "size_kb": round(size_kb, 1)})

    db.log_action("Files Sorted", f"Uploaded & classified {len(files)} files", user_id=user_id)
    return {"message": f"Processed {len(files)} file(s).", "results": processed}

@app.get("/api/documents")
def list_documents(user_id: int = Query(...), search: str = Query(""), status_filter: str = Query("All")):
    docs = db.get_user_documents(user_id, search, status_filter)
    results = [
        {"id": d[0], "filename": d[1], "category": d[2], "size_kb": d[3], "status": d[4], "created_at": d[5], "deleted_at": d[6]}
        for d in docs
    ]
    return {"count": len(results), "documents": results}

# Single document deletion (Soft or Hard/Permanent)
@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, permanent: bool = Query(False)):
    success, result = db.delete_document_by_id(doc_id, permanent=permanent)
    if not success:
        raise HTTPException(status_code=404, detail=result)
    action_type = "permanently deleted" if permanent else "moved to trash"
    return {"message": f"File '{result}' {action_type}."}

# Restore a soft-deleted document
@app.post("/api/documents/{doc_id}/restore")
def restore_document(doc_id: int):
    db.restore_document_by_id(doc_id)
    return {"message": "Document restored successfully."}

# Bulk Soft-Delete
@app.post("/api/documents/soft-delete")
def soft_delete_documents(user_id: int = Query(...)):
    user_folder = f"organized_files/user_{user_id}"
    if os.path.exists(user_folder):
        shutil.rmtree(user_folder)
    db.soft_delete_user_documents(user_id)
    db.log_action("Bulk Soft-Delete", "All active documents moved to Deleted status", user_id=user_id)
    return {"message": "All local files moved to Deleted status."}

# Bulk Hard-Delete (Completely purges from SQLite)
@app.post("/api/documents/hard-delete-all")
def hard_delete_documents(user_id: int = Query(...)):
    user_folder = f"organized_files/user_{user_id}"
    if os.path.exists(user_folder):
        shutil.rmtree(user_folder)
    db.hard_delete_user_documents(user_id)
    db.log_action("Bulk Hard-Delete", "All records purged permanently from database", user_id=user_id)
    return {"message": "All files permanently purged from database and disk."}

@app.get("/api/workspace/summary")
def get_workspace_summary(user_id: int = Query(...)):
    docs = db.get_user_documents(user_id, status_filter="Active")
    all_docs = db.get_user_documents(user_id, status_filter="All")
    total_kb = sum([d[3] for d in docs])
    categories = {}
    for d in docs:
        categories[d[2]] = categories.get(d[2], 0) + 1

    return {
        "active_files_count": len(docs),
        "lifetime_files_count": len(all_docs),
        "total_storage_mb": round(total_kb / 1024, 2),
        "storage_limit_mb": 100.0,
        "category_counts": categories
    }

@app.get("/api/workspace/activity")
def get_recent_activity(limit: int = Query(50)):
    logs = db.get_system_audit_logs(limit)
    return [{"id": l[0], "timestamp": str(l[1]), "username": l[2] or "System", "action": l[3], "details": l[4] or ""} for l in logs]

@app.get("/api/admin/overview")
def get_admin_overview():
    try:
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "documents.db")
        conn = sqlite3.connect(db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        # 1. Fetch users
        c.execute("SELECT id, username, email, COALESCE(role, 'user') as role FROM users")
        user_rows = c.fetchall()

        total_accounts = len(user_rows)
        admin_count = 0
        member_count = 0
        users_list = []

        # 2. File counts & sizes
        c.execute("SELECT COUNT(*) FROM document_history")
        total_files_classified = c.fetchone()[0] or 0

        # Safe query using COALESCE
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

        conn.close()

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
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))