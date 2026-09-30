import sqlite3
import auth
import db

db.init_db()

ADMIN_EMAIL = "noragamiarota@gmail.com"
ADMIN_NAME = "Noragami Creator"

print("=" * 50)
print(f"  CREATOR ADMIN SETUP: {ADMIN_EMAIL}")
print("=" * 50)

password = input("Enter new password for noragamiarota@gmail.com: ").strip()
if not password:
    print("❌ Password cannot be empty.")
    exit(1)

hashed_pw = auth.hash_password(password)

conn = sqlite3.connect("documents.db")
cursor = conn.cursor()

existing = db.get_user_by_email(ADMIN_EMAIL)

if existing:
    cursor.execute("""
        UPDATE users 
        SET password_hash = ?, role = 'admin', username = ?
        WHERE email = ?
    """, (hashed_pw, ADMIN_NAME, ADMIN_EMAIL))
    conn.commit()
    print(f"✅ Successfully updated '{ADMIN_EMAIL}' to ADMIN role with your new password.")
else:
    cursor.execute("""
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, 'admin')
    """, (ADMIN_NAME, ADMIN_EMAIL, hashed_pw))
    conn.commit()
    print(f"✅ Successfully created Creator Admin account for '{ADMIN_EMAIL}'.")

conn.close()
db.log_action("Admin Setup", f"Creator account initialized ({ADMIN_EMAIL})", username=ADMIN_NAME)
print("=" * 50)