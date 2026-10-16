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
  ShieldCheck,
  Download,
  Eye,
  ExternalLink,
  Star,
  Share2,
  Sparkles
} from "lucide-react";

const API_BASE = "http://localhost:8000/api";
const CREATOR_EMAIL = "noragamiarota@gmail.com";

const STANDARD_CATEGORIES = [
  "Lecture Notes",
  "Classroom Instruction",
  "Question Bank",
  "Chat Transcript",
  "Research Paper",
  "Financial & Admin",
  "Miscellaneous"
];

const CATEGORY_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-400",
  "bg-rose-500"
];

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

  const [portalMode, setPortalMode] = useState("user");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Auth & 3-Step OTP States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfirmPass, setResetConfirmPass] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [otpTimer, setOtpTimer] = useState(0);

  // Workspace States
  const [activeTab, setActiveTab] = useState("library");
  const [summary, setSummary] = useState({
    active_files_count: 0,
    total_storage_kb: 0,
    total_storage_mb: 0,
    storage_limit_mb: 100,
    category_counts: {},
    category_storage_kb: {},
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
  const [sortBy, setSortBy] = useState("starred"); // 'starred' | 'newest' | 'size' | 'name'
  const [starredOnly, setStarredOnly] = useState(false);

  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("sorter_custom_folders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [uploadNotice, setUploadNotice] = useState("");

  // Modals: Upload, Single-Doc Preview Q&A, and Folder AI Synthesis
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaMessages, setQaMessages] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);

  // v5.0 Folder AI Modal States
  const [folderAiTarget, setFolderAiTarget] = useState(null);
  const [folderAiQuestion, setFolderAiQuestion] = useState("");
  const [folderAiMessages, setFolderAiMessages] = useState([]);
  const [folderAiLoading, setFolderAiLoading] = useState(false);

  const isCreatorAdmin = currentUser && currentUser.email?.toLowerCase() === CREATOR_EMAIL.toLowerCase();

  // 3-Minute OTP Countdown Hook
  useEffect(() => {
    if (portalMode !== "reset" || resetStep !== 2 || otpTimer <= 0) return;
    const timerId = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [portalMode, resetStep, otpTimer]);

  const formatCountdown = (secs) => {
    const mins = String(Math.floor(secs / 60)).padStart(2, "0");
    const remSecs = String(secs % 60).padStart(2, "0");
    return `${mins}:${remSecs}`;
  };

  useEffect(() => {
    if (!isCreatorAdmin && (activeTab === "audit" || activeTab === "admin")) {
      setActiveTab("library");
    }
  }, [isCreatorAdmin, activeTab]);

  useEffect(() => {
    if (previewDoc) {
      setQaMessages([
        {
          role: "ai",
          text: `Hi! I'm ready to analyze "${previewDoc.filename}" (${previewDoc.category}). Ask a question below or pick a quick prompt!`
        }
      ]);
      setQaQuestion("");
    }
  }, [previewDoc?.id]);

  useEffect(() => {
    if (folderAiTarget) {
      setFolderAiMessages([
        {
          role: "ai",
          text: `📚 Folder Synthesis Ready for "${folderAiTarget}". I can combine insights, create an exam study guide, or generate quiz questions across all files in this folder!`
        }
      ]);
      setFolderAiQuestion("");
    }
  }, [folderAiTarget]);

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

  // Auth Handlers
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

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!resetEmail.trim()) {
      setAuthError("Please enter your registered email address.");
      return;
    }
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/auth/request-otp`, { 
        email: resetEmail.trim() 
      });
      setResetOtp("");
      setResetStep(2);
      setOtpTimer(180);
      setAuthSuccess(res.data.message || "Verification code sent to your email!");
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Failed to dispatch verification code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpTimer <= 0) {
      setAuthError("OTP time limit expired! Please click Resend OTP.");
      return;
    }
    if (resetOtp.trim().length !== 6) {
      setAuthError("Please enter the 6-digit OTP code.");
      return;
    }
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/auth/verify-otp`, {
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
      });
      setResetStep(3);
      setAuthSuccess(res.data.message || "OTP verified! Set your new password below.");
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Invalid OTP code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetNewPass !== resetConfirmPass) {
      setAuthError("New password and confirm password do not match.");
      return;
    }
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
        setResetStep(1);
        setResetOtp("");
        setResetNewPass("");
        setResetConfirmPass("");
        setAuthSuccess("");
      }, 1400);
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Invalid or expired OTP session.");
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

  // v5.0 Upgrade Handlers
  const handleToggleStar = async (docId, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.post(`${API_BASE}/documents/${docId}/star`);
      await fetchWorkspace();
    } catch (err) {
      console.error("Star toggle failed:", err);
    }
  };

  const handleShareDocument = async (docId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await axios.post(`${API_BASE}/documents/${docId}/share`);
      const shareUrl = res.data.share_url;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setUploadNotice(`🔗 Shareable link copied to clipboard: ${shareUrl}`);
      setTimeout(() => setUploadNotice(""), 6000);
    } catch (err) {
      alert("Could not generate share link: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleUserStatus = async (userObj) => {
    const nextStatus = userObj.status === "Active" ? "Suspended" : "Active";
    if (!window.confirm(`Set account "${userObj.email}" to ${nextStatus}?`)) return;
    try {
      await axios.put(`${API_BASE}/admin/users/${userObj.id}/status`, {
        account_status: nextStatus
      });
      await fetchWorkspace();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not update user status.");
    }
  };

  const handleAskFolderAi = async (customPrompt = null) => {
    if (!folderAiTarget) return;
    const qText = (customPrompt || folderAiQuestion).trim();
    if (!qText) return;

    setFolderAiMessages((prev) => [...prev, { role: "user", text: qText }]);
    if (!customPrompt) setFolderAiQuestion("");
    setFolderAiLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/folders/ask`, {
        user_id: currentUser.id,
        category: folderAiTarget,
        question: qText
      });
      setFolderAiMessages((prev) => [
        ...prev,
        { role: "ai", text: res.data.answer || "No synthesis generated." }
      ]);
    } catch (err) {
      setFolderAiMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error synthesizing folder: " + (err.response?.data?.detail || err.message) }
      ]);
    } finally {
      setFolderAiLoading(false);
    }
  };

  const handleExportNotesMarkdown = (titleName, messagesList) => {
    const content = [
      `# SmartSorter AI Study Notes: ${titleName}`,
      `Generated on: ${new Date().toLocaleString()}`,
      `User: ${currentUser?.name} (${currentUser?.email})`,
      `\n---\n`,
      ...messagesList.map((m) => `### ${m.role === "user" ? "🧑 Question" : "✨ Gemini AI"}\n${m.text}\n`)
    ].join("\n");

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SmartSorter_Notes_${titleName.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateCustomFolder = () => {
    const folderName = window.prompt("Enter a name for your new custom Smart Folder:");
    if (!folderName || !folderName.trim()) return;
    const clean = folderName.trim();
    const updated = Array.from(new Set([...customCategories, clean]));
    setCustomCategories(updated);
    localStorage.setItem("sorter_custom_folders", JSON.stringify(updated));
    setUploadNotice(`📁 Created custom folder "${clean}". You can now move any file into it!`);
    setTimeout(() => setUploadNotice(""), 4000);
  };

  const handleCategoryChange = async (docId, selectedValue) => {
    let targetCategory = selectedValue;
    if (selectedValue === "__NEW_CUSTOM__") {
      const custom = window.prompt("Enter custom folder name for this file:");
      if (!custom || !custom.trim()) return;
      targetCategory = custom.trim();
      const updated = Array.from(new Set([...customCategories, targetCategory]));
      setCustomCategories(updated);
      localStorage.setItem("sorter_custom_folders", JSON.stringify(updated));
    }

    try {
      await axios.put(`${API_BASE}/documents/${docId}/category`, {
        new_category: targetCategory,
      });
      if (previewDoc && previewDoc.id === docId) {
        setPreviewDoc({ ...previewDoc, category: targetCategory });
      }
      await fetchWorkspace();
    } catch (err) {
      alert("Failed to move category: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleAskDocument = async (customPrompt = null) => {
    if (!previewDoc) return;
    const qText = (customPrompt || qaQuestion).trim();
    if (!qText) return;

    setQaMessages((prev) => [...prev, { role: "user", text: qText }]);
    if (!customPrompt) setQaQuestion("");
    setQaLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/documents/${previewDoc.id}/ask`, {
        question: qText,
      });
      setQaMessages((prev) => [
        ...prev,
        { role: "ai", text: res.data.answer || "No response generated." }
      ]);
    } catch (err) {
      setQaMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error analyzing document: " + (err.response?.data?.detail || err.message) }
      ]);
    } finally {
      setQaLoading(false);
    }
  };

  const handleDownloadFile = (docId) => {
    window.open(`${API_BASE}/documents/${docId}/file?download=true`, "_blank");
  };

  const handleExportFolderZip = (categoryName, e) => {
    if (e) e.stopPropagation();
    window.open(
      `${API_BASE}/documents/export-zip?user_id=${currentUser.id}&category=${encodeURIComponent(categoryName)}`,
      "_blank"
    );
  };

  const handleExportAuditCsv = () => {
    window.open(`${API_BASE}/admin/export-audit-csv`, "_blank");
  };

  const handleDeleteSingle = async (docId, filename, permanent = false) => {
    const confirmMsg = permanent 
      ? `Permanently delete "${filename}"? This removes it completely from SQLite and disk.`
      : `Move "${filename}" to trash?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await axios.delete(`${API_BASE}/documents/${docId}?permanent=${permanent}`);
      if (previewDoc && previewDoc.id === docId) setPreviewDoc(null);
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

      const skipped = res.data.skipped_duplicates || [];
      if (skipped.length > 0) {
        const names = skipped.map((s) => `${s.filename} (matches ${s.matched_with})`).join(", ");
        setUploadNotice(`🛡️ SHA-256 Duplicate Protection: Skipped ${skipped.length} duplicate file(s): ${names}`);
      } else {
        setUploadNotice(`✅ Successfully classified & indexed ${res.data.files?.length || 0} file(s)!`);
      }
      setTimeout(() => setUploadNotice(""), 6000);
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

  const allCategoryOptions = Array.from(
    new Set([
      ...STANDARD_CATEGORIES,
      ...customCategories,
      ...Object.keys(summary.category_counts || {})
    ])
  );

  const folderEntries = Array.from(
    new Set([...Object.keys(summary.category_counts || {}), ...customCategories])
  ).map((cat) => [cat, summary.category_counts?.[cat] || 0]);

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
                : "Intelligent Multimodal File Workspace v5.0"}
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
                  onClick={() => {
                    setPortalMode("reset");
                    setResetEmail(loginEmail);
                    setResetStep(1);
                    setResetOtp("");
                    setOtpTimer(0);
                    setAuthError("");
                    setAuthSuccess("");
                  }}
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
              {resetStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Registered Account Email</label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your registered mail ID"
                        className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition disabled:opacity-50"
                  >
                    {authLoading ? "Dispatching OTP..." : "📧 Send OTP to Registered Email"}
                  </button>
                </form>
              )}

              {resetStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-white/10 px-3.5 py-2 text-xs">
                    <span className="text-slate-400 truncate max-w-[180px]">{resetEmail}</span>
                    <button
                      type="button"
                      onClick={() => { setResetStep(1); setAuthError(""); setAuthSuccess(""); }}
                      className="text-blue-400 hover:text-blue-300 font-medium text-[11px]"
                    >
                      Change Email
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Enter 6-Digit OTP</label>
                      <span className={`text-xs font-mono font-bold ${otpTimer > 30 ? "text-amber-400" : "text-red-400"}`}>
                        {otpTimer > 0 ? `⏱ ${formatCountdown(otpTimer)}` : "⏱ Expired (00:00)"}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      disabled={otpTimer === 0}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 px-4 text-center tracking-[0.5em] text-lg font-bold text-white focus:border-blue-500 focus:outline-none disabled:opacity-40"
                    />
                  </div>

                  {otpTimer > 0 ? (
                    <button
                      type="submit"
                      disabled={authLoading || resetOtp.length !== 6}
                      className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
                    >
                      {authLoading ? "Verifying OTP..." : "Verify OTP →"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={authLoading}
                      className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
                    >
                      {authLoading ? "Sending New OTP..." : "↻ Resend OTP"}
                    </button>
                  )}
                </form>
              )}

              {resetStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">New Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={resetNewPass}
                        onChange={(e) => setResetNewPass(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={resetConfirmPass}
                        onChange={(e) => setResetConfirmPass(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
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
                onClick={() => {
                  setPortalMode("user");
                  setResetStep(1);
                  setResetOtp("");
                  setOtpTimer(0);
                  setAuthError("");
                  setAuthSuccess("");
                }}
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

  // VIEW 2: WORKSPACE (Storage quota untouched at 100 MB baseline)
  const percentUsed = Math.min(
    Math.round((summary.total_storage_mb / summary.storage_limit_mb) * 100),
    100
  );

  // Filter & Sort Documents
  const displayedDocs = documents
    .filter((d) => selectedFolder === "All" || d.category === selectedFolder)
    .filter((d) => (!starredOnly ? true : d.is_starred))
    .slice()
    .sort((a, b) => {
      if (sortBy === "size") return (b.size_kb || 0) - (a.size_kb || 0);
      if (sortBy === "name") return a.filename.localeCompare(b.filename);
      if (sortBy === "newest") return b.id - a.id;
      // Default 'starred': starred items first, then newest
      if (b.is_starred !== a.is_starred) return (b.is_starred ? 1 : 0) - (a.is_starred ? 1 : 0);
      return b.id - a.id;
    });

  const totalStorageKb = summary.total_storage_kb || 1;
  const storageSegments = Object.entries(summary.category_storage_kb || {});

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
                {isCreatorAdmin ? "Creator Oversight" : "Workspace SaaS v5.0"}
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

        {/* STORAGE DISTRIBUTION BAR */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-white/5 p-3.5 rounded-xl">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-slate-400">Storage Used</span>
              <span className={isCreatorAdmin ? "text-amber-400" : "text-blue-400"}>{percentUsed}%</span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex mb-2">
              {storageSegments.length > 0 ? (
                storageSegments.map(([cat, kb], idx) => {
                  const segPct = Math.max(Math.round((kb / totalStorageKb) * 100), 5);
                  const colorClass = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div
                      key={cat}
                      title={`${cat}: ${kb} KB`}
                      className={`h-full ${colorClass} transition-all duration-300`}
                      style={{ width: `${segPct}%` }}
                    />
                  );
                })
              ) : (
                <div className="h-full bg-blue-500/30 w-0" />
              )}
            </div>

            <p className="text-[11px] text-slate-400 font-medium mb-2">
              {summary.total_storage_mb} MB of {summary.storage_limit_mb} MB ({summary.active_files_count} files)
            </p>

            {storageSegments.length > 0 && (
              <div className="space-y-1 pt-1.5 border-t border-white/5 max-h-24 overflow-y-auto">
                {storageSegments.map(([cat, kb], idx) => (
                  <div key={cat} className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`} />
                      <span className="truncate">{cat}</span>
                    </div>
                    <span className="font-mono text-slate-500">{kb} KB</span>
                  </div>
                ))}
              </div>
            )}
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
              placeholder="Search filenames, categories, or AI summaries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#162032] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {summary.active_files_count > 0 && (
              <button
                onClick={() => setFolderAiTarget(selectedFolder)}
                title="Synthesize all files in current folder with Gemini"
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl text-xs font-semibold border border-purple-500/30 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Ask Folder AI ({selectedFolder})</span>
              </button>
            )}

            <button
              onClick={handleCreateCustomFolder}
              title="Create a Custom Smart Folder"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Folder</span>
            </button>

            {summary.active_files_count > 0 && (
              <button
                onClick={(e) => handleExportFolderZip("All", e)}
                title="Download All Active Files as ZIP"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export All (.zip)</span>
              </button>
            )}
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

        {/* Action / Share / Duplicate Toast Banner */}
        {uploadNotice && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-300">
            <span className="truncate">{uploadNotice}</span>
            <button onClick={() => setUploadNotice("")} className="text-slate-400 hover:text-white ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: MAIN LIBRARY */}
        {activeTab === "library" && (
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Main Library</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Star priority files, synthesize entire folders with AI, or click any file to preview & share
                </p>
              </div>

              {/* Sort & Starred Filter Controls */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStarredOnly(!starredOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    starredOnly
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${starredOnly ? "fill-amber-400 text-amber-400" : ""}`} />
                  <span>Starred Only</span>
                </button>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="starred">Sort: Starred First</option>
                  <option value="newest">Sort: Newest Uploaded</option>
                  <option value="size">Sort: Largest Size (KB)</option>
                  <option value="name">Sort: Filename (A–Z)</option>
                </select>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Smart Folders</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {folderEntries.length > 0 ? (
                  folderEntries.map(([cat, count]) => (
                    <div
                      key={cat}
                      onClick={() => setSelectedFolder(selectedFolder === cat ? "All" : cat)}
                      className={`border rounded-xl p-3.5 flex items-center justify-between transition cursor-pointer group ${
                        selectedFolder === cat 
                          ? "bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/30" 
                          : "bg-amber-500/[0.06] border-amber-500/20 hover:border-amber-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-semibold text-amber-200 truncate">{cat}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {count > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setFolderAiTarget(cat); }}
                              title={`Ask Gemini AI about all files in '${cat}'`}
                              className="p-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/35 text-purple-300 transition"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleExportFolderZip(cat, e)}
                              title={`Download '${cat}' folder as .zip`}
                              className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/30 text-amber-300 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic col-span-4">Upload documents or click "+ New Folder" to generate smart folders.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Files ({displayedDocs.length})
              </h3>
              {displayedDocs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {displayedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setPreviewDoc(doc)}
                      className={`bg-[#151d2c] border rounded-xl p-4 flex flex-col items-center text-center transition group hover:-translate-y-1 shadow-sm relative cursor-pointer ${
                        doc.is_starred ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-white/5 hover:border-blue-500/40"
                      }`}
                    >
                      {/* Top-Left Star Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(doc.id, e)}
                        title={doc.is_starred ? "Unstar File" : "Star / Pin File"}
                        className="absolute top-2.5 left-2.5 p-1 rounded-lg hover:bg-white/10 transition"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            doc.is_starred ? "fill-amber-400 text-amber-400" : "text-slate-600 group-hover:text-slate-400"
                          }`}
                        />
                      </button>

                      {/* Top-Right Hover Actions */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={(e) => handleShareDocument(doc.id, e)}
                          title="Copy Shareable File Link"
                          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-purple-600 text-slate-300 hover:text-white border border-white/10"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownloadFile(doc.id); }}
                          title="Download File"
                          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-emerald-600 text-slate-300 hover:text-white border border-white/10"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3 mt-2 group-hover:scale-105 transition">
                        {getFileIcon(doc.filename)}
                      </div>
                      <p className="text-xs font-semibold text-slate-200 w-full truncate mb-1" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <span className="text-[10px] text-amber-400/90 font-semibold mb-1">
                        {doc.category} • {doc.size_kb} KB
                      </span>
                      {doc.summary && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5" title={doc.summary}>
                          {doc.summary}
                        </p>
                      )}
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
                <p className="text-xs text-slate-400 mt-0.5">Star, share tokenized links, move folders, or verify SHA-256 hashes</p>
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
                    <th className="py-3 px-4">Document & AI Summary</th>
                    <th className="py-3 px-4">Folder (Override)</th>
                    <th className="py-3 px-4">Size / Hash</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Processed Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {documents.length > 0 ? (
                    documents.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(d.id, e)}
                              className="text-slate-500 hover:text-amber-400"
                            >
                              <Star className={`w-3.5 h-3.5 ${d.is_starred ? "fill-amber-400 text-amber-400" : ""}`} />
                            </button>
                            <p className="font-semibold text-slate-200 truncate">{d.filename}</p>
                          </div>
                          {d.summary && (
                            <p className="text-[11px] text-slate-500 italic truncate mt-0.5 pl-5" title={d.summary}>
                              {d.summary}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={d.category}
                            onChange={(e) => handleCategoryChange(d.id, e.target.value)}
                            className="bg-slate-900/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-medium focus:border-blue-500 focus:outline-none cursor-pointer"
                          >
                            {allCategoryOptions.map((catOpt) => (
                              <option key={catOpt} value={catOpt}>
                                {catOpt}
                              </option>
                            ))}
                            <option value="__NEW_CUSTOM__">+ New Custom Folder...</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-slate-300">{d.size_kb} KB</p>
                          {d.file_hash && (
                            <p className="text-[10px] font-mono text-slate-500" title="SHA-256 Checksum">
                              #{d.file_hash}
                            </p>
                          )}
                        </td>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewDoc(d)}
                              title="Preview & Ask Gemini"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleShareDocument(d.id, e)}
                              title="Copy Shareable Link"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 transition"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDownloadFile(d.id)}
                              title="Download File"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

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
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleExportAuditCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Audit CSV</span>
                </button>
                <button
                  onClick={fetchWorkspace}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Audit Logs</span>
                </button>
              </div>
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

        {/* TAB 4: CREATOR ADMIN USER OVERSIGHT (WITH ACTIVE/SUSPENDED CONTROL) */}
        {activeTab === "admin" && isCreatorAdmin && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">System & Account Oversight</h2>
                <p className="text-xs text-slate-400 mt-0.5">Live platform account breakdown and interactive member access governance</p>
              </div>
              <button
                onClick={fetchWorkspace}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Metrics</span>
              </button>
            </div>

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
                    <th className="py-3 px-4 text-right">Governance</th>
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.status === "Suspended"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}>
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
                        <td className="py-3 px-4 text-right">
                          {u.email.toLowerCase() !== CREATOR_EMAIL.toLowerCase() ? (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                u.status === "Suspended"
                                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                                  : "bg-red-500/20 hover:bg-red-500/30 text-red-300"
                              }`}
                            >
                              {u.status === "Suspended" ? "Activate User" : "Suspend User"}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">No registered users found.</td>
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
                <div
                  key={doc.id}
                  onClick={() => setPreviewDoc(doc)}
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-xs flex items-center gap-3 cursor-pointer transition"
                >
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

      {/* MODAL 1: UPLOAD DOCUMENTS */}
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
            <p className="text-xs text-slate-400 mb-4">
              Gemini Flash classifies, summarizes, and checks SHA-256 hashes to prevent duplicates.
            </p>

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
                {isUploading ? "Classifying & Verifying SHA-256..." : `Process ${selectedFiles.length} File(s)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SPLIT-SCREEN DOCUMENT PREVIEW + "ASK GEMINI" + SAVE STUDY NOTES */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#151d2c]">
              <div className="flex items-center gap-3 overflow-hidden">
                {getFileIcon(previewDoc.filename)}
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{previewDoc.filename}</h3>
                    {previewDoc.file_hash && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                        SHA-256 #{previewDoc.file_hash}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {previewDoc.summary || `Classified under ${previewDoc.category}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={previewDoc.category}
                  onChange={(e) => handleCategoryChange(previewDoc.id, e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-semibold focus:outline-none"
                >
                  {allCategoryOptions.map((catOpt) => (
                    <option key={catOpt} value={catOpt}>
                      {catOpt}
                    </option>
                  ))}
                  <option value="__NEW_CUSTOM__">+ New Custom Folder...</option>
                </select>

                <button
                  onClick={(e) => handleShareDocument(previewDoc.id, e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl text-xs font-semibold border border-purple-500/30 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Link</span>
                </button>

                <button
                  onClick={() => window.open(`${API_BASE}/documents/${previewDoc.id}/file?download=false`, "_blank")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Tab</span>
                </button>

                <button
                  onClick={() => handleDownloadFile(previewDoc.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-hidden p-4">
                {["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(
                  previewDoc.filename.split(".").pop().toLowerCase()
                ) ? (
                  <img
                    src={`${API_BASE}/documents/${previewDoc.id}/file?download=false`}
                    alt={previewDoc.filename}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <iframe
                    title={previewDoc.filename}
                    src={`${API_BASE}/documents/${previewDoc.id}/file?download=false`}
                    className="w-full h-full rounded-lg border border-white/10 bg-white"
                  />
                )}
              </div>

              <div className="w-80 md:w-96 border-l border-white/10 bg-[#131b2e] flex flex-col justify-between p-4 shrink-0">
                <div className="pb-3 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <span>✨ Ask Gemini AI</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleExportNotesMarkdown(previewDoc.filename, qaMessages)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition"
                    >
                      💾 Save Notes (.md)
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <button
                      type="button"
                      onClick={() => handleAskDocument("Summarize the key points of this document.")}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/20 transition"
                    >
                      📄 Summarize
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskDocument("Generate 3 study quiz questions from this file.")}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20 transition"
                    >
                      📝 Quiz Me
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskDocument("Explain the core concepts and structure of this file.")}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/20 transition"
                    >
                      💡 Explain
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
                  {qaMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs whitespace-pre-wrap leading-relaxed ${
                        m.role === "user"
                          ? "bg-blue-600 text-white ml-6"
                          : "bg-slate-900/90 border border-white/10 text-slate-200 mr-2"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                  {qaLoading && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-blue-400 italic animate-pulse">
                      Gemini is analyzing document...
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskDocument();
                  }}
                  className="pt-2 border-t border-white/10 flex gap-2"
                >
                  <input
                    type="text"
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                    placeholder="Ask about this document..."
                    className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={qaLoading || !qaQuestion.trim()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Ask
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: "ASK FOLDER AI" MULTI-DOCUMENT SYNTHESIS */}
      {folderAiTarget && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-purple-500/30 rounded-2xl w-full max-w-2xl h-[75vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#151d2c]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ask Folder AI — "{folderAiTarget}"
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Multi-document synthesis across all active files in this folder
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportNotesMarkdown(`Folder_${folderAiTarget}`, folderAiMessages)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition"
                >
                  💾 Save Notes (.md)
                </button>
                <button
                  onClick={() => setFolderAiTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-2.5 bg-slate-900/60 border-b border-white/5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAskFolderAi("Create a combined exam revision study guide from all files in this folder.")}
                className="text-[11px] px-3 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 transition"
              >
                📚 Combined Study Guide
              </button>
              <button
                type="button"
                onClick={() => handleAskFolderAi("Generate 5 comprehensive viva/exam questions covering these documents.")}
                className="text-[11px] px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20 transition"
              >
                🎓 Generate 5 Viva Questions
              </button>
              <button
                type="button"
                onClick={() => handleAskFolderAi("Compare and summarize the core topics of each file in this folder.")}
                className="text-[11px] px-3 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/20 transition"
              >
                🔍 Compare All Files
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-6">
              {folderAiMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl text-xs whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-purple-600 text-white ml-12"
                      : "bg-slate-900/90 border border-white/10 text-slate-200 mr-6"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {folderAiLoading && (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-purple-300 italic animate-pulse">
                  Gemini is synthesizing all files in "{folderAiTarget}"...
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskFolderAi();
              }}
              className="p-4 border-t border-white/10 bg-[#151d2c] flex gap-2.5"
            >
              <input
                type="text"
                value={folderAiQuestion}
                onChange={(e) => setFolderAiQuestion(e.target.value)}
                placeholder={`Ask anything across all files in "${folderAiTarget}"...`}
                className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={folderAiLoading || !folderAiQuestion.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Synthesize
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}