import React, { useState, useEffect } from "react";
import axios from "axios";
import "./index.css";
import { 
  Folder, 
  FileText, 
  Code, 
  Image as ImageIcon, 
  Video, 
  Package, 
  Search, 
  UploadCloud, 
  HardDrive, 
  Clock, 
  Plus, 
  CheckCircle2, 
  X, 
  LogOut, 
  Shield, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Trash2, 
  RotateCcw,
  RefreshCw,
  ArrowLeft, 
  AlertCircle, 
  ShieldCheck 
} from "lucide-react";

const API_BASE = "http://localhost:8000/api";
const CREATOR_EMAIL = "noragamiarota@gmail.com";

// Single-line timestamp: '30 Sep 2026, 10:14 PM'
const formatTimestamp = (raw) => {
  if (!raw) return "—";
  try {
    const isoString = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return raw;

    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return raw;
  }
};

const formatTimeOnly = (raw) => {
  if (!raw) return "";
  try {
    const isoString = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return raw.split(" ")[1] || raw;
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return raw;
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("sorter_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [portalMode, setPortalMode] = useState("user"); // 'user' | 'admin' | 'register' | 'reset'
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Workspace
  const [activeTab, setActiveTab] = useState("library"); // 'library' | 'drive' | 'audit' | 'admin'
  const [summary, setSummary] = useState({
    active_files_count: 0,
    total_storage_mb: 0,
    storage_limit_mb: 100,
    category_counts: {},
  });
  const [documents, setDocuments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [adminData, setAdminData] = useState({
    total_accounts: 0,
    admin_count: 0,
    member_count: 0,
    total_files_classified: 0,
    active_files: 0,
    deleted_files: 0,
    total_storage_mb: 0,
    users: [],
  });
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");

  // Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const isCreatorAdmin = currentUser && currentUser.email?.toLowerCase() === CREATOR_EMAIL.toLowerCase();

  useEffect(() => {
    if (!isCreatorAdmin && (activeTab === "audit" || activeTab === "admin")) {
      setActiveTab("library");
    }
  }, [isCreatorAdmin, activeTab]);

  const fetchWorkspace = async () => {
    if (!currentUser) return;

    try {
      const sumRes = await axios.get(`${API_BASE}/workspace/summary?user_id=${currentUser.id}`);
      setSummary(sumRes.data);
    } catch (e) {
      console.error("Summary error:", e);
    }

    try {
      const docRes = await axios.get(`${API_BASE}/documents?user_id=${currentUser.id}&search=${search}&status_filter=${statusFilter}`);
      setDocuments(docRes.data.documents || []);
    } catch (e) {
      console.error("Documents error:", e);
    }

    if (isCreatorAdmin) {
      try {
        const actRes = await axios.get(`${API_BASE}/workspace/activity?limit=50`);
        setActivity(actRes.data || []);
      } catch (e) {
        console.error("Activity error:", e);
      }

      try {
        const adminRes = await axios.get(`${API_BASE}/admin/overview`);
        if (adminRes.data) {
          setAdminData(adminRes.data);
        }
      } catch (e) {
        console.error("Admin overview error:", e);
      }
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [currentUser, search, statusFilter, activeTab]);

  const handleLogin = async (e, isAdminGate = false) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      const emailClean = loginEmail.trim();
      if (isAdminGate && emailClean.toLowerCase() !== CREATOR_EMAIL.toLowerCase()) {
        throw new Error(`Access Denied: Only ${CREATOR_EMAIL} is allowed in the Creator Portal.`);
      }

      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: emailClean,
        password: loginPassword,
      });

      const userData = res.data.user;
      if (isAdminGate && userData.role !== "admin") {
        throw new Error("Access Denied: Account lacks admin permissions.");
      }

      setCurrentUser(userData);
      localStorage.setItem("sorter_user", JSON.stringify(userData));
      setActiveTab("library");
    } catch (err) {
      setAuthError(err.response?.data?.detail || err.message || "Invalid credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      await axios.post(`${API_BASE}/auth/register`, {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });
      setAuthSuccess("Account created successfully! You can now sign in.");
      setTimeout(() => {
        setPortalMode("user");
        setLoginEmail(regEmail.trim());
        setAuthSuccess("");
      }, 1200);
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!resetEmail.trim()) {
      setAuthError("Please enter your mail ID.");
      return;
    }
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/auth/request-otp`, { email: resetEmail.trim() });
      setOtpSent(true);
      setAuthSuccess(res.data.message || "Verification code dispatched to your inbox!");
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Failed to dispatch verification code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      await axios.post(`${API_BASE}/auth/reset-password`, {
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        new_password: resetNewPass,
      });
      setAuthSuccess("Password successfully changed! Redirecting to sign in...");
      setTimeout(() => {
        setPortalMode("user");
        setLoginEmail(resetEmail.trim());
        setAuthSuccess("");
        setOtpSent(false);
      }, 1400);
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Invalid or expired OTP code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("sorter_user");
    setCurrentUser(null);
    setPortalMode("user");
    setLoginPassword("");
  };

  const handleDeleteSingle = async (docId, filename, permanent = false) => {
    const confirmMsg = permanent 
      ? `Permanently delete "${filename}"? This removes it completely from SQLite and disk.`
      : `Move "${filename}" to trash?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await axios.delete(`${API_BASE}/documents/${docId}?permanent=${permanent}`);
      await fetchWorkspace();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleRestoreSingle = async (docId) => {
    try {
      await axios.post(`${API_BASE}/documents/${docId}/restore`);
      await fetchWorkspace();
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  const handleSoftDeleteAll = async () => {
    if (!window.confirm("Move all local active files to Deleted status?")) return;
    try {
      await axios.post(`${API_BASE}/documents/soft-delete?user_id=${currentUser.id}`);
      await fetchWorkspace();
    } catch (err) {
      console.error("Soft delete error:", err);
    }
  };

  const handleHardDeleteAll = async () => {
    if (!window.confirm("⚠️ PERMANENT WIPE: This will delete all files permanently from SQLite and disk. Continue?")) return;
    try {
      await axios.post(`${API_BASE}/documents/hard-delete-all?user_id=${currentUser.id}`);
      await fetchWorkspace();
    } catch (err) {
      console.error("Hard delete error:", err);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) {
      alert("Please select at least one file first.");
      return;
    }

    if (!currentUser || !currentUser.id) {
      alert("Session expired or invalid user ID. Please sign out and sign in again.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("user_id", currentUser.id);
    for (let file of selectedFiles) {
      formData.append("files", file);
    }

    try {
      const res = await axios.post(`${API_BASE}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedFiles([]);
      setUploadModalOpen(false);
      await fetchWorkspace();
    } catch (err) {
      console.error("Upload failed:", err);
      const detail = err.response?.data?.detail || err.message || "Upload request failed";
      alert("Upload Error: " + (typeof detail === "object" ? JSON.stringify(detail) : detail));
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return <FileText className="w-6 h-6 text-red-400" />;
    if (["doc", "docx", "txt", "md"].includes(ext)) return <FileText className="w-6 h-6 text-blue-400" />;
    if (["py", "js", "ts", "html", "css", "java", "sql"].includes(ext)) return <Code className="w-6 h-6 text-emerald-400" />;
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) return <ImageIcon className="w-6 h-6 text-amber-400" />;
    if (["mp4", "mov", "avi"].includes(ext)) return <Video className="w-6 h-6 text-purple-400" />;
    return <Package className="w-6 h-6 text-slate-400" />;
  };

  // VIEW 1: AUTH PORTAL
  if (!currentUser) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-[#0a0f1d] p-4 text-slate-100 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827]/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            {portalMode === "admin" ? (
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/30">
                <ShieldCheck className="h-6 w-6 text-slate-950 font-bold" />
              </div>
            ) : (
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30">
                <Folder className="h-6 w-6 text-white" />
              </div>
            )}
            
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {portalMode === "admin" ? "Creator Admin Portal" : "SmartSorter"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {portalMode === "admin" 
                ? "Dedicated security access for noragamiarota@gmail.com" 
                : "Intelligent Multimodal File Workspace"}
            </p>
          </div>

          {(portalMode === "user" || portalMode === "admin") && (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-900/80 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => { setPortalMode("user"); setAuthError(""); setAuthSuccess(""); }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  portalMode === "user" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                User Portal
              </button>
              <button
                type="button"
                onClick={() => { setPortalMode("admin"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
                  portalMode === "admin" ? "bg-amber-500 text-slate-950 font-bold shadow-md" : "text-amber-400/80 hover:text-amber-300"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Creator Admin</span>
              </button>
            </div>
          )}

          {authError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}
          {authSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {portalMode === "user" && (
            <form onSubmit={(e) => handleLogin(e, false)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your mail ID"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                {authLoading ? "Signing In..." : "Sign In →"}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setPortalMode("register"); setAuthError(""); setAuthSuccess(""); }}
                  className="text-slate-400 hover:text-white"
                >
                  Create an account
                </button>
                <button
                  type="button"
                  onClick={() => { setPortalMode("reset"); setResetEmail(loginEmail); setAuthError(""); setAuthSuccess(""); }}
                  className="font-medium text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {portalMode === "admin" && (
            <form onSubmit={(e) => handleLogin(e, true)} className="space-y-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 text-center font-medium">
                Restricted to Creator Account: <strong>noragamiarota@gmail.com</strong>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Creator Admin Mail</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your mail ID"
                    className="w-full rounded-xl border border-amber-500/30 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Admin Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-amber-500/30 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95 disabled:opacity-50"
              >
                {authLoading ? "Verifying Creator Admin..." : "Unlock Creator Hub →"}
              </button>
            </form>
          )}

          {portalMode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Full Name</label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Enter your mail ID"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Choose a password"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                {authLoading ? "Creating Account..." : "Create Account →"}
              </button>

              <button
                type="button"
                onClick={() => { setPortalMode("user"); setAuthError(""); setAuthSuccess(""); }}
                className="flex w-full items-center justify-center gap-1.5 pt-2 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
            </form>
          )}

          {portalMode === "reset" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Account Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your mail ID"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={authLoading}
                className="w-full rounded-xl bg-slate-800 py-2 text-xs font-semibold text-slate-200 border border-white/10 hover:bg-slate-700 transition"
              >
                {authLoading ? "Sending Code..." : "📧 Send Live OTP to Inbox"}
              </button>

              {otpSent && (
                <form onSubmit={handleResetPassword} className="space-y-3 pt-3 border-t border-white/10">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      placeholder="e.g. 583921"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 px-4 text-center tracking-widest text-lg font-bold text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">New Password</label>
                    <input
                      type="password"
                      required
                      value={resetNewPass}
                      onChange={(e) => setResetNewPass(e.target.value)}
                      placeholder="Enter new password"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 px-4 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95"
                  >
                    {authLoading ? "Updating..." : "Save New Password"}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => { setPortalMode("user"); setAuthError(""); setAuthSuccess(""); setOtpSent(false); }}
                className="flex w-full items-center justify-center gap-1.5 pt-2 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VIEW 2: WORKSPACE
  const percentUsed = Math.min(
    Math.round((summary.total_storage_mb / summary.storage_limit_mb) * 100),
    100
  );

  const displayedDocs = documents.filter((d) =>
    selectedFolder === "All" || d.category === selectedFolder
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d131f] text-slate-100 font-sans">
      
      {/* 1. LEFT SIDEBAR PANEL */}
      <aside className="w-64 border-r border-white/5 bg-[#111827]/80 flex flex-col justify-between p-5 backdrop-blur-md shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8 px-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
              isCreatorAdmin ? "bg-amber-500 shadow-amber-500/30 text-slate-950 font-bold" : "bg-blue-600 shadow-blue-600/30 text-white"
            }`}>
              {isCreatorAdmin ? <ShieldCheck className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">SmartSorter</h1>
              <p className="text-xs text-slate-500 font-medium">
                {isCreatorAdmin ? "Creator Oversight" : "Workspace SaaS"}
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button 
              onClick={() => setActiveTab("library")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
                activeTab === "library" ? "bg-blue-600/15 text-blue-400 font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Main Library</span>
            </button>

            <button 
              onClick={() => setActiveTab("drive")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
                activeTab === "drive" ? "bg-blue-600/15 text-blue-400 font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Drive Catalog</span>
            </button>

            {isCreatorAdmin && (
              <button 
                onClick={() => setActiveTab("audit")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
                  activeTab === "audit" ? "bg-amber-500/15 text-amber-400 font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Audit & Logins</span>
              </button>
            )}

            {isCreatorAdmin && (
              <button 
                onClick={() => setActiveTab("admin")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
                  activeTab === "admin" ? "bg-amber-500/15 text-amber-400 font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>User Oversight</span>
              </button>
            )}
          </nav>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-white/5 p-3.5 rounded-xl">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-slate-400">Storage Used</span>
              <span className={isCreatorAdmin ? "text-amber-400" : "text-blue-400"}>{percentUsed}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${isCreatorAdmin ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {summary.total_storage_mb} MB of {summary.storage_limit_mb} MB
            </p>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                isCreatorAdmin ? "bg-amber-500 text-slate-950 font-extrabold" : "bg-indigo-600 text-white"
              }`}>
                {currentUser.name ? currentUser.name[0] : "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate">{currentUser.name}</p>
                <p className={`text-[10px] uppercase tracking-wider ${isCreatorAdmin ? "text-amber-400 font-bold" : "text-slate-400"}`}>
                  {isCreatorAdmin ? "Creator Admin" : "Member"}
                </p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              title="Sign Out"
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. CENTER CANVAS */}
      <main className="flex-1 flex flex-col overflow-y-auto px-8 py-6">
        <header className="flex items-center justify-between pb-6 border-b border-white/5 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search documents, categories, formats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#162032] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchWorkspace}
              title="Refresh Workspace"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/10 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Files</span>
            </button>
          </div>
        </header>

        {/* TAB 1: MAIN LIBRARY */}
        {activeTab === "library" && (
          <div className="mt-6">
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Main Library</h2>
                <p className="text-xs text-slate-400 mt-0.5">Filter by folder or explore all organized files</p>
              </div>
              <span className="text-xs text-slate-500">{displayedDocs.length} items visible</span>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Folders</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {Object.keys(summary.category_counts).length > 0 ? (
                  Object.entries(summary.category_counts).map(([cat, count]) => (
                    <div
                      key={cat}
                      onClick={() => setSelectedFolder(selectedFolder === cat ? "All" : cat)}
                      className={`border rounded-xl p-3.5 flex items-center justify-between transition cursor-pointer ${
                        selectedFolder === cat 
                          ? "bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/30" 
                          : "bg-amber-500/[0.06] border-amber-500/20 hover:border-amber-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-semibold text-amber-200 truncate">{cat}</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                        {count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic col-span-4">Upload documents to generate smart folders.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Recent Files</h3>
              {displayedDocs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {displayedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-[#151d2c] border border-white/5 hover:border-blue-500/40 rounded-xl p-4 flex flex-col items-center text-center transition group hover:-translate-y-1 shadow-sm relative"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                        {getFileIcon(doc.filename)}
                      </div>
                      <p className="text-xs font-semibold text-slate-200 w-full truncate mb-1" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {doc.category} • {doc.size_kb} KB
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
                  <UploadCloud className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No documents found in this view</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DRIVE CATALOG */}
        {activeTab === "drive" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Drive File Catalog</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage active files, trash, or permanently remove from SQLite</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Active">Active Files</option>
                  <option value="Deleted">Trash / Deleted</option>
                  <option value="All">All Documents</option>
                </select>

                <button
                  onClick={handleSoftDeleteAll}
                  title="Move all active files to trash"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move All to Trash</span>
                </button>

                <button
                  onClick={handleHardDeleteAll}
                  title="Purge all records permanently from SQLite database"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Purge SQLite DB</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#151d2c] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Processed Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {documents.length > 0 ? (
                    documents.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-semibold text-slate-200 truncate max-w-xs">{d.filename}</td>
                        <td className="py-3 px-4 text-slate-400">{d.category}</td>
                        <td className="py-3 px-4 text-slate-400">{d.size_kb} KB</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                          {formatTimestamp(d.created_at)}
                        </td>
                        
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {d.status === "Active" ? (
                              <button
                                onClick={() => handleDeleteSingle(d.id, d.filename, false)}
                                title="Move to Trash (Soft Delete)"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestoreSingle(d.id)}
                                title="Restore File to Active"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeleteSingle(d.id, d.filename, true)}
                              title="Delete Permanently from Database"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">No files in catalog.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT & USER LOGINS (NORAGAMI ADMIN) */}
        {activeTab === "audit" && isCreatorAdmin && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight mb-1">System & User Login Audit</h2>
                <p className="text-xs text-slate-400">Restricted chronological log of all platform interactions</p>
              </div>
              <button
                onClick={fetchWorkspace}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Audit Logs</span>
              </button>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#151d2c] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {activity.length > 0 ? (
                    activity.map((act) => (
                      <tr key={act.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-slate-200 bg-slate-900/80 px-2.5 py-1 rounded-md border border-white/10 whitespace-nowrap">
                            {formatTimestamp(act.timestamp)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{act.username}</td>
                        <td className="py-3 px-4 text-amber-400">{act.action}</td>
                        <td className="py-3 px-4 text-slate-400 italic">{act.details || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 italic">No system activity logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CREATOR ADMIN USER OVERSIGHT */}
        {activeTab === "admin" && isCreatorAdmin && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">System & Account Oversight</h2>
                <p className="text-xs text-slate-400 mt-0.5">Live platform account breakdown and lifetime file sorting activity</p>
              </div>
              <button
                onClick={fetchWorkspace}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Metrics</span>
              </button>
            </div>

            {/* Metrics Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#151d2c] border border-white/5 p-4 rounded-xl">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">User Accounts</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{adminData.member_count}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{adminData.total_accounts} Total Accounts</p>
              </div>

              <div className="bg-[#151d2c] border border-white/5 p-4 rounded-xl">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Admin Accounts</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{adminData.admin_count}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">● 1 Active Creator</p>
              </div>

              <div className="bg-[#151d2c] border border-white/5 p-4 rounded-xl">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Classified (Lifetime)</p>
                <p className="text-2xl font-bold text-white mt-1">{adminData.total_files_classified}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {adminData.active_files} Active • {adminData.deleted_files} in Trash
                </p>
              </div>

              <div className="bg-[#151d2c] border border-white/5 p-4 rounded-xl">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Cloud Storage</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{adminData.total_storage_mb} MB</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Active Disk Usage</p>
              </div>
            </div>

            {/* Registered Users Roster Table */}
            <div className="rounded-xl border border-white/5 bg-[#151d2c] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Email ID</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Files Classified</th>
                    <th className="py-3 px-4">Active Disk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {adminData.users && adminData.users.length > 0 ? (
                    adminData.users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-semibold text-slate-200">{u.name}</td>
                        <td className="py-3 px-4 text-slate-400">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === "ADMIN" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
                          }`}>
                            {u.role === "ADMIN" ? "CREATOR ADMIN" : "MEMBER"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {u.status || "Active"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white">{u.total_classified ?? 0}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">
                            ({u.active_files ?? 0} active, {u.deleted_files ?? 0} trash)
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{u.storage_kb} KB</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">No registered users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 3. RIGHT STREAM PANEL */}
      <aside className="w-80 border-l border-white/5 bg-[#111827]/40 flex flex-col p-5 backdrop-blur-md shrink-0">
        <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2">
          <span>{isCreatorAdmin ? "System Audit Feed" : "My Upload Activity"}</span>
          <span className={`w-2 h-2 rounded-full animate-pulse ${isCreatorAdmin ? "bg-amber-400" : "bg-blue-400"}`} />
        </h3>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isCreatorAdmin ? (
            activity.length > 0 ? (
              activity.map((act) => (
                <div key={act.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
                    <span className="text-amber-300">{act.username}</span>
                    <span className="text-[11px] font-mono text-amber-400/90 font-medium">
                      {formatTimeOnly(act.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-400 mb-1">{act.action}</p>
                  {act.details && <p className="text-[11px] text-slate-500 italic">{act.details}</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No system events logged.</p>
            )
          ) : (
            documents.length > 0 ? (
              documents.slice(0, 10).map((doc) => (
                <div key={doc.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    {getFileIcon(doc.filename)}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="font-semibold text-slate-200 truncate">{doc.filename}</p>
                    <p className="text-[10px] text-slate-500">{doc.category} • {doc.size_kb} KB</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No files in your account yet.</p>
            )
          )}
        </div>
      </aside>

      {/* UPLOAD MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d2c] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold mb-1">Upload Documents</h3>
            <p className="text-xs text-slate-400 mb-4">Gemini Flash analyzes and categorizes each file dynamically.</p>

            <form onSubmit={handleUploadSubmit}>
              <div className="border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-xl p-6 text-center cursor-pointer mb-4">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="mb-4 max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                {isUploading ? "Classifying with Gemini..." : `Process ${selectedFiles.length} File(s)`}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}