import sqlite3

conn = sqlite3.connect("documents.db")
# Force checkpoint so all WAL changes flush to the main file
conn.execute("PRAGMA wal_checkpoint(FULL);")
cursor = conn.cursor()

print("\n" + "=" * 60)
print(" 👥 USERS TABLE")
print("=" * 60)
cursor.execute("SELECT id, username, email, role FROM users")
users = cursor.fetchall()
for u in users:
    print(f"ID: {u[0]} | Name: {u[1]:<15} | Email: {u[2]:<26} | Role: {u[3]}")

print("\n" + "=" * 60)
print(" 📄 DOCUMENT HISTORY (Files)")
print("=" * 60)
cursor.execute("SELECT id, user_id, filename, category, status FROM document_history")
docs = cursor.fetchall()
if docs:
    for d in docs:
        print(f"ID: {d[0]} | UserID: {d[1]} | Status: {d[4]:<8} | Cat: {d[3]:<15} | File: {d[2]}")
else:
    print("No documents found in database.")

print("\n" + "=" * 60)
print(" 📜 RECENT AUDIT LOGS (Last 10)")
print("=" * 60)
cursor.execute("SELECT id, timestamp, username, action, details FROM system_logs ORDER BY id DESC LIMIT 10")
logs = cursor.fetchall()
if logs:
    for l in logs:
        print(f"[{l[1]}] {l[2]:<15} -> {l[3]:<20} | {l[4]}")
else:
    print("No logs found in system_logs.")

print("=" * 60 + "\n")
conn.close()