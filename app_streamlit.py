import os
import shutil
import time
import requests
import streamlit as st
import plotly.express as px
from streamlit_lottie import st_lottie

import db
import auth
from classifier import get_client, classify_content

st.set_page_config(page_title="Universal Smart Sorter", page_icon="📁", layout="wide")

db.init_db()

# --- Lottie Asset Loader ---
@st.cache_data
def load_lottie_url(url: str):
    try:
        r = requests.get(url, timeout=3)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None

anim_lock = load_lottie_url("https://lottie.host/5b47a9cb-b2f5-46ff-b97c-9aaec262b9f1/lZl97GqQoR.json")
anim_upload = load_lottie_url("https://lottie.host/33827fb7-4402-4fc8-9f3c-8b89eeb020bf/a2N8oT2lXl.json")

# --- Modern SaaS Visual Styling ---
st.markdown("""
<style>
    /* Card Container */
    .auth-card {
        background: radial-gradient(circle at 10% 20%, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 90%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
        border-radius: 20px;
        padding: 35px;
        backdrop-filter: blur(12px);
        margin-bottom: 25px;
    }
    
    /* Metrics & Dashboard Cards */
    .metric-card {
        background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .metric-card:hover {
        transform: translateY(-2px);
        border-color: rgba(76, 175, 80, 0.4);
    }
    .metric-number {
        font-size: 2.4rem;
        font-weight: 800;
        letter-spacing: -0.5px;
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        margin-top: 6px;
    }
    
    /* Subtle Callouts */
    .helper-banner {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 10px;
        padding: 14px;
        margin-top: 15px;
        margin-bottom: 15px;
    }
</style>
""", unsafe_allow_html=True)

# --- State Management ---
if "user" not in st.session_state:
    st.session_state.user = None
if "auth_page" not in st.session_state:
    st.session_state.auth_page = "login"  # 'login' | 'register' | 'reset'
if "login_failed_email" not in st.session_state:
    st.session_state.login_failed_email = ""
if "reset_prefill_email" not in st.session_state:
    st.session_state.reset_prefill_email = ""
if "otp_sent" not in st.session_state:
    st.session_state.otp_sent = False

client = get_client()

# ==============================================================================
# AUTHENTICATION PORTAL (ISOLATED PAGES)
# ==============================================================================
if not st.session_state.user:
    _, center_col, _ = st.columns([1, 2.2, 1])

    with center_col:
        # ----------------------------------------------------
        # PAGE 1: LOGIN PAGE
        # ----------------------------------------------------
        if st.session_state.auth_page == "login":
            if anim_lock:
                st_lottie(anim_lock, height=140, key="login_anim")
            
            st.markdown("""
                <div style='text-align: center; margin-bottom: 25px;'>
                    <h1 style='margin-bottom: 4px; font-weight: 800;'>Smart Sorter</h1>
                    <p style='color: #94a3b8; font-size: 15px;'>Sign in to access your intelligent file hub</p>
                </div>
            """, unsafe_allow_html=True)

            with st.container():
                st.markdown("<div class='auth-card'>", unsafe_allow_html=True)
                email_input = st.text_input("Email Address", value=st.session_state.login_failed_email, placeholder="alex@gmail.com")
                password_input = st.text_input("Password", type="password", placeholder="••••••••")

                # Wrong Password Trigger: contextual prompt
                if st.session_state.login_failed_email and email_input == st.session_state.login_failed_email:
                    st.markdown("""
                        <div class='helper-banner'>
                            <span style='color: #f87171; font-weight: 600;'>⚠️ Incorrect credentials entered.</span>
                        </div>
                    """, unsafe_allow_html=True)
                    if st.button("🔄 Forgot your password? Click here to reset via OTP", use_container_width=True):
                        st.session_state.reset_prefill_email = email_input
                        st.session_state.auth_page = "reset"
                        st.session_state.login_failed_email = ""
                        st.rerun()

                st.write("")
                if st.button("Sign In →", type="primary", use_container_width=True):
                    if not email_input or not password_input:
                        st.warning("Please provide both email and password.")
                    else:
                        user = db.get_user_by_email(email_input)
                        if user and auth.check_password(password_input, user[3]):
                            st.session_state.user = {
                                "id": user[0],
                                "username": user[1],
                                "email": user[2],
                                "role": user[4]
                            }
                            st.session_state.login_failed_email = ""
                            db.log_action("User Login", f"Logged in ({user[2]})", user[0], user[1])
                            st.rerun()
                        else:
                            st.session_state.login_failed_email = email_input
                            st.rerun()

                st.markdown("</div>", unsafe_allow_html=True)

            # Footer navigation
            col_nav1, col_nav2 = st.columns(2)
            with col_nav1:
                st.caption("Don't have an account?")
                if st.button("✨ Create Account", use_container_width=True):
                    st.session_state.auth_page = "register"
                    st.rerun()
            with col_nav2:
                st.caption("Need help signing in?")
                if st.button("🔑 Forgot Password", use_container_width=True):
                    st.session_state.reset_prefill_email = email_input
                    st.session_state.auth_page = "reset"
                    st.rerun()

        # ----------------------------------------------------
        # PAGE 2: CREATE ACCOUNT PAGE
        # ----------------------------------------------------
        elif st.session_state.auth_page == "register":
            st.markdown("""
                <div style='text-align: center; margin-bottom: 25px;'>
                    <h1 style='margin-bottom: 4px; font-weight: 800;'>Create Account</h1>
                    <p style='color: #94a3b8; font-size: 15px;'>Start classifying documents with Gemini Flash</p>
                </div>
            """, unsafe_allow_html=True)

            with st.container():
                st.markdown("<div class='auth-card'>", unsafe_allow_html=True)
                reg_name = st.text_input("Full Name", placeholder="Your Name")
                reg_email = st.text_input("Email Address", placeholder="name@gmail.com")
                reg_pass = st.text_input("Choose Password", type="password", placeholder="At least 6 characters")
                
                with st.expander("👑 Have an Admin / Creator Invite Key?"):
                    reg_invite = st.text_input("Invite Key", placeholder="Enter key for elevated privileges")

                st.write("")
                if st.button("Create Account →", type="primary", use_container_width=True):
                    if not reg_name or not reg_email or not reg_pass:
                        st.warning("All primary fields are required.")
                    else:
                        role = "admin" if reg_invite == "CREATOR_ROOT_2026" else "user"
                        hashed_pw = auth.hash_password(reg_pass)
                        success, msg = db.create_user(reg_name, reg_email, hashed_pw, role)
                        if success:
                            db.log_action("User Registration", f"Role: {role}", username=reg_name)
                            st.success(f"{msg} Redirecting to login...")
                            time.sleep(1.5)
                            st.session_state.auth_page = "login"
                            st.rerun()
                        else:
                            st.error(msg)

                st.markdown("</div>", unsafe_allow_html=True)

            if st.button("← Back to Sign In", use_container_width=True):
                st.session_state.auth_page = "login"
                st.rerun()

        # ----------------------------------------------------
        # PAGE 3: FORGOT & RESET PASSWORD (LIVE OTP)
        # ----------------------------------------------------
        elif st.session_state.auth_page == "reset":
            st.markdown("""
                <div style='text-align: center; margin-bottom: 25px;'>
                    <h1 style='margin-bottom: 4px; font-weight: 800;'>Reset Password</h1>
                    <p style='color: #94a3b8; font-size: 15px;'>Verify your identity via one-time email code</p>
                </div>
            """, unsafe_allow_html=True)

            with st.container():
                st.markdown("<div class='auth-card'>", unsafe_allow_html=True)
                reset_target_email = st.text_input("Email to verify", value=st.session_state.reset_prefill_email, placeholder="your_email@gmail.com")

                if st.button("📧 Send OTP to Inbox", use_container_width=True):
                    if not reset_target_email:
                        st.warning("Please enter your registered email address.")
                    else:
                        user_found = db.get_user_by_email(reset_target_email)
                        if user_found:
                            with st.spinner("Dispatching verification code..."):
                                ok, info = auth.send_otp_email(reset_target_email)
                            if ok:
                                st.session_state.reset_prefill_email = reset_target_email
                                st.session_state.otp_sent = True
                                st.success(info)
                            else:
                                st.error(info)
                        else:
                            st.error("No account found with this email.")

                if st.session_state.otp_sent:
                    st.divider()
                    st.markdown("##### 2. Enter Security Code")
                    entered_otp = st.text_input("6-Digit OTP", max_chars=6, placeholder="e.g. 583921")
                    updated_password = st.text_input("New Password", type="password", placeholder="Enter new strong password")

                    if st.button("Confirm Password Change →", type="primary", use_container_width=True):
                        if not entered_otp or not updated_password:
                            st.warning("Please complete both verification fields.")
                        else:
                            if db.verify_otp(st.session_state.reset_prefill_email, entered_otp):
                                new_hash = auth.hash_password(updated_password)
                                db.update_user_password(st.session_state.reset_prefill_email, new_hash)
                                db.log_action("Password Reset", "Successfully changed via OTP", username=st.session_state.reset_prefill_email)
                                st.session_state.otp_sent = False
                                st.success("✅ Password successfully updated! Redirecting to login...")
                                time.sleep(1.5)
                                st.session_state.auth_page = "login"
                                st.rerun()
                            else:
                                st.error("Invalid or expired OTP code. Request a fresh one.")

                st.markdown("</div>", unsafe_allow_html=True)

            if st.button("← Return to Sign In", use_container_width=True):
                st.session_state.auth_page = "login"
                st.session_state.otp_sent = False
                st.rerun()

    st.stop()

# ==============================================================================
# MAIN APPLICATION WORKSPACE
# ==============================================================================
current_user = st.session_state.user

col_head, col_meta = st.columns([3, 1])
with col_head:
    st.title("🗂️ Universal Smart Sorter")
    st.caption("Multimodal AI Organization Engine")
with col_meta:
    st.write(f"Logged in as **{current_user['username']}**")
    st.caption(f"{current_user['email']} • `{current_user['role'].upper()}`")
    if st.button("Sign Out", type="secondary"):
        db.log_action("User Logout", "Logged out", current_user["id"], current_user["username"])
        st.session_state.user = None
        st.session_state.login_failed_email = ""
        st.session_state.auth_page = "login"
        st.rerun()

# Build Role-Scoped Navigation
tab_labels = ["📤 Upload & Organize", "📜 My Documents"]
if current_user["role"] == "admin":
    tab_labels.append("👑 Admin & Creator Hub")

tabs = st.tabs(tab_labels)

# ----------------------------------------------------
# TAB 1: UPLOAD & MULTIMODAL CLASSIFY
# ----------------------------------------------------
with tabs[0]:
    col_upload_left, col_anim = st.columns([2.5, 1.2])
    with col_upload_left:
        st.markdown("### Process & Organize Documents")
        st.caption("Drop PDFs, Word documents, images, code files, or video snippets.")
        uploaded_files = st.file_uploader("Select files", accept_multiple_files=True)

    with col_anim:
        if anim_upload:
            st_lottie(anim_upload, height=190, key="upload_anim")

    if uploaded_files:
        if st.button("🚀 Sort & Categorize Files", type="primary", use_container_width=True):
            progress_bar = st.progress(0)
            status_text = st.empty()

            user_folder = f"organized_files/user_{current_user['id']}"
            os.makedirs(user_folder, exist_ok=True)
            results = []

            for i, file in enumerate(uploaded_files):
                status_text.markdown(f"🤖 **Gemini Flash analyzing:** `{file.name}`...")
                file_bytes = file.getvalue()

                category = classify_content(file.name, file_bytes, client)

                target_folder = os.path.join(user_folder, category)
                os.makedirs(target_folder, exist_ok=True)
                target_path = os.path.join(target_folder, file.name)

                with open(target_path, "wb") as f:
                    f.write(file_bytes)

                file_size_kb = len(file_bytes) / 1024
                db.save_document(current_user["id"], file.name, category, target_path, file_size_kb)

                results.append({"Filename": file.name, "Category": category, "Size": f"{round(file_size_kb, 1)} KB"})
                progress_bar.progress((i + 1) / len(uploaded_files))
                time.sleep(0.08)

            status_text.empty()
            db.log_action("Files Sorted", f"Processed {len(uploaded_files)} files", current_user["id"], current_user["username"])
            st.success(f"Successfully organized {len(uploaded_files)} item(s)!")
            st.table(results)

    st.divider()
    if st.button("🗑️ Clear Local Disk Folders (Keep Database Audit Trail)"):
        user_folder = f"organized_files/user_{current_user['id']}"
        if os.path.exists(user_folder):
            shutil.rmtree(user_folder)
        db.soft_delete_user_documents(current_user["id"])
        db.log_action("Local Cleanup", "Soft deleted files from local disk", current_user["id"], current_user["username"])
        st.warning("Local storage folders cleaned. Files archived as 'Deleted' in the audit catalog.")
        st.rerun()

# ----------------------------------------------------
# TAB 2: MY DOCUMENTS & ANALYTICS
# ----------------------------------------------------
with tabs[1]:
    user_docs = db.get_user_documents(current_user["id"])
    active_docs = [d for d in user_docs if d[4] == "Active"]
    total_kb = sum([d[3] for d in user_docs])

    m1, m2, m3 = st.columns(3)
    with m1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-number">{len(user_docs)}</div>
            <div class="metric-label">Lifetime Documents</div>
        </div>
        """, unsafe_allow_html=True)
    with m2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-number">{len(active_docs)}</div>
            <div class="metric-label">Active on Local Storage</div>
        </div>
        """, unsafe_allow_html=True)
    with m3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-number">{round(total_kb / 1024, 2)} MB</div>
            <div class="metric-label">Total Volume Processed</div>
        </div>
        """, unsafe_allow_html=True)

    if user_docs:
        st.markdown("### Category Breakdown")
        cat_counts = {}
        for d in user_docs:
            cat = d[2]
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        fig = px.pie(
            values=list(cat_counts.values()),
            names=list(cat_counts.keys()),
            hole=0.45,
            color_discrete_sequence=px.colors.qualitative.Prism
        )
        fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=300)
        st.plotly_chart(fig, use_container_width=True)

    st.markdown("### Document Catalog")
    col_s, col_f = st.columns([3, 1])
    with col_s:
        s_query = st.text_input("🔍 Search documents", placeholder="Filter by filename or category...")
    with col_f:
        s_filter = st.selectbox("Status", ["All", "Active", "Deleted"])

    filtered_docs = db.get_user_documents(current_user["id"], s_query, s_filter)
    if filtered_docs:
        table_records = [
            {
                "ID": d[0],
                "Filename": d[1],
                "Category": d[2],
                "Size (KB)": d[3],
                "Status": "🟢 Active" if d[4] == "Active" else "🔴 Deleted",
                "Created At": d[5],
                "Location": d[7]
            }
            for d in filtered_docs
        ]
        st.dataframe(table_records, use_container_width=True)
    else:
        st.info("No documents found.")

# ----------------------------------------------------
# TAB 3: ADMIN CONSOLE
# ----------------------------------------------------
if current_user["role"] == "admin":
    with tabs[2]:
        st.header("👑 Creator Dashboard & System Monitor")

        users_stats = db.get_all_users_stats()
        system_logs = db.get_system_audit_logs(limit=60)

        total_users = len(users_stats)
        total_sys_files = sum([u[5] for u in users_stats])
        total_sys_kb = sum([u[6] for u in users_stats])

        adm1, adm2, adm3 = st.columns(3)
        with adm1:
            st.metric("Total User Accounts", total_users)
        with adm2:
            st.metric("Cataloged Files (All Users)", total_sys_files)
        with adm3:
            st.metric("Platform Storage Usage", f"{round(total_sys_kb / 1024, 2)} MB")

        st.subheader("👥 User Accounts & Volumes")
        user_table = [
            {
                "User ID": u[0],
                "Full Name": u[1],
                "Email": u[2],
                "Role": u[3].upper(),
                "Registered At": u[4],
                "Files Handled": u[5],
                "Storage Volume": f"{round(u[6], 1)} KB"
            }
            for u in users_stats
        ]
        st.dataframe(user_table, use_container_width=True)

        st.subheader("📋 Platform-Wide Action Log")
        log_table = [
            {
                "Log ID": l[0],
                "Timestamp": l[1],
                "User": l[2],
                "Action": l[3],
                "Details": l[4]
            }
            for l in system_logs
        ]
        st.dataframe(log_table, use_container_width=True)