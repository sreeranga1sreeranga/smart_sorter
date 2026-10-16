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
  Sparkles,
  Upload,
  AlertOctagon,
  Settings,
  HelpCircle,
  Cloud
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

  // User Portal Active Tab vs Dedicated Creator Operations Tab
  const [activeTab, setActiveTab] = useState("library");
  const [creatorTab, setCreatorTab] = useState("telemetry"); // 'telemetry' | 'support' | 'users' | 'audit'
  const [ticketFilter, setTicketFilter] = useState("All");   // 'All' | 'Open' | 'Resolved'
  const [replyInputs, setReplyInputs] = useState({});

  // Per-User Summary State (Strictly for Standard Users)
  const [summary, setSummary] = useState({
    active_files_count: 0,
    bin_files_count: 0,
    spam_files_count: 0,
    offline_files_count: 0,
    total_storage_kb: 0,
    total_storage_mb: 0,
    storage_limit_mb: 100,
    free_limit_mb: 100,
    subscription_plan: "Free",
    cloud_linked: false,
    cloud_provider: "None",
    cloud_email: "",
    drive_binding_hash: "",
    category_counts: {},
    category_storage_kb: {},
  });

  const [documents, setDocuments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [adminData, setAdminData] = useState({
    total_accounts: 0,
    admin_count: 0,
    member_count: 0,
    pro_subscribers: 0,
    linked_drives_count: 0,
    open_tickets_count: 0,
    total_files_classified: 0,
    active_files: 0,
    deleted_files: 0,
    spam_files: 0,
    total_storage_mb: 0,
    global_categories: [],
    users: [],
  });

  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [sortBy, setSortBy] = useState("starred");
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

  // Cloud Linking & Subscription States (Standard Users Only)
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [cloudProviderInput, setCloudProviderInput] = useState("Google Drive");
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Settings & Feedback States
  const [autoSortExt, setAutoSortExt] = useState(true);
  const [aiDeepSummary, setAiDeepSummary] = useState(true);
  const [fbCategory, setFbCategory] = useState("Cloud Drive Sync");
  const [fbMessage, setFbMessage] = useState("");

  // Modals: Upload, Single-Doc Preview Q&A, and Folder AI Synthesis
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaMessages, setQaMessages] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);

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

  const getStatusFilterForTab = (tab) => {
    if (tab === "bin") return "Deleted";
    if (tab === "spam") return "Spam";
    return "Active";
  };

  const fetchWorkspace = async () => {
    if (!currentUser) return;

    // 1. If logged in as Creator Admin: Fetch ONLY Project Operations, Support Tickets, Users & Audit Logs
    if (isCreatorAdmin) {
      try {
        const [adminRes, actRes, fbRes] = await Promise.all([
          axios.get(`${API_BASE}/admin/overview`),
          axios.get(`${API_BASE}/workspace/activity?limit=100`),
          axios.get(`${API_BASE}/feedback`)
        ]);
        if (adminRes.data) setAdminData(adminRes.data);
        setActivity(actRes.data || []);
        setFeedbackList(fbRes.data || []);
      } catch (e) {
        console.error("Creator console fetch error:", e);
      }
      return;
    }

    // 2. If logged in as Standard User: Fetch User Workspace, Files & Their Support Tickets
    try {
      const sumRes = await axios.get(`${API_BASE}/workspace/summary?user_id=${currentUser.id}`);
      setSummary(sumRes.data);
    } catch (e) {
      console.error("Summary error:", e);
    }

    try {
      const sFilter = getStatusFilterForTab(activeTab);
      const docRes = await axios.get(
        `${API_BASE}/documents?user_id=${currentUser.id}&search=${search}&status_filter=${sFilter}`
      );
      setDocuments(docRes.data.documents || []);
    } catch (e) {
      console.error("Documents error:", e);
    }

    if (activeTab === "help") {
      try {
        const fbRes = await axios.get(`${API_BASE}/feedback?user_id=${currentUser.id}`);
        setFeedbackList(fbRes.data || []);
      } catch (e) {
        console.error("Feedback error:", e);
      }
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [currentUser, search, activeTab, creatorTab]);

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
      if (userData.email.toLowerCase() === CREATOR_EMAIL.toLowerCase()) {
        setCreatorTab("telemetry");
      } else {
        setActiveTab("library");
      }
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
      setAuthSuccess("Account created with 100 MB Free Quota! You can now sign in.");
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

  // Creator Admin Operations Handlers
  const handleReplyTicket = async (ticketId, statusValue = "Resolved") => {
    const text = (replyInputs[ticketId] || "").trim();
    if (!text) {
      alert("Please type a response to the user before sending.");
      return;
    }
    try {
      const res = await axios.put(`${API_BASE}/admin/feedback/${ticketId}/reply`, {
        reply_text: text,
        status: statusValue
      });
      setUploadNotice(`✅ ${res.data.message}`);
      setReplyInputs((prev) => ({ ...prev, [ticketId]: "" }));
      await fetchWorkspace();
      setTimeout(() => setUploadNotice(""), 5000);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to send reply.");
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

  const handleExportAuditCsv = () => {
    window.open(`${API_BASE}/admin/export-audit-csv`, "_blank");
  };

  // Standard User Handlers
  const handleActivateSubscription = async (planName) => {
    try {
      const res = await axios.post(`${API_BASE}/cloud/subscribe`, {
        user_id: currentUser.id,
        plan_name: planName
      });
      setUploadNotice(`✨ ${res.data.message}`);
      await fetchWorkspace();
    } catch (err) {
      alert(err.response?.data?.detail || "Subscription update failed.");
    }
  };

  const handleLinkCloudDrive = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/cloud/link`, {
        user_id: currentUser.id,
        provider: cloudProviderInput,
        cloud_email: currentUser.email
      });
      setUploadNotice(`🔒 ${res.data.message}`);
      setCloudModalOpen(false);
      await fetchWorkspace();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to link cloud storage.");
    }
  };

  const handleUnlinkCloudDrive = async () => {
    if (!window.confirm("Disconnect your personal Gmail Drive and revert to the 100 MB Free Quota?")) return;
    try {
      const res = await axios.post(`${API_BASE}/cloud/unlink?user_id=${currentUser.id}`);
      setUploadNotice(res.data.message);
      await fetchWorkspace();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncCloudDrive = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await axios.post(`${API_BASE}/cloud/sync`, { user_id: currentUser.id });
      setUploadNotice(`🔄 ${res.data.message}`);
      await fetchWorkspace();
    } catch (err) {
      alert(err.response?.data?.detail || "Cloud sync failed.");
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleToggleStar = async (docId, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.post(`${API_BASE}/documents/${docId}/star`);
      await fetchWorkspace();
    } catch (err) {
      console.error("Star toggle failed:", err);
    }
  };

  const handleToggleOffline = async (docId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await axios.post(`${API_BASE}/documents/${docId}/offline`);
      setUploadNotice(
        res.data.is_offline
          ? "📌 File pinned for Offline access."
          : "Removed file from Offline cache."
      );
      await fetchWorkspace();
    } catch (err) {
      console.error("Offline toggle failed:", err);
    }
  };

  const handleToggleSpam = async (docId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await axios.post(`${API_BASE}/documents/${docId}/spam`);
      setUploadNotice(
        res.data.status === "Spam"
          ? "⚠️ File moved to Spam quarantine."
          : "✅ File restored from Spam to Active workspace."
      );
      await fetchWorkspace();
    } catch (err) {
      console.error("Spam toggle failed:", err);
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

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!fbMessage.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/feedback`, {
        user_id: currentUser.id,
        category: fbCategory,
        message: fbMessage.trim()
      });
      setFbMessage("");
      setUploadNotice(`💬 ${res.data.message}`);
      await fetchWorkspace();
    } catch (err) {
      alert("Could not submit feedback.");
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

  const handleDeleteSingle = async (docId, filename, permanent = false) => {
    const confirmMsg = permanent 
      ? `Permanently delete "${filename}"? This removes it completely from SQLite and disk.`
      : `Move "${filename}" to Bin?`;
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
        const names = skipped.map((s) => `${s.filename}`).join(", ");
        setUploadNotice(`🛡️ SHA-256 Duplicate Filter: Routed ${skipped.length} duplicate file(s) to Spam (${names}).`);
      } else {
        setUploadNotice(`✅ Successfully classified & indexed ${res.data.files?.length || 0} file(s)!`);
      }
      setTimeout(() => setUploadNotice(""), 6000);
    } catch (err) {
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

  // =========================================================
  // VIEW 1: AUTHENTICATION PORTAL (USER OR CREATOR LOGIN)
  // =========================================================
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
              {portalMode === "admin" ? "Creator Operations Portal" : "SmartSorter"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {portalMode === "admin" 
                ? "Dedicated project control, user governance & support desk" 
                : "Identity-Bound Cloud AI File Workspace"}
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
                <label className="text-xs font-semibold text-slate-300">Gmail / Email Address</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your Gmail ID"
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
                Restricted to Project Creator: <strong>noragamiarota@gmail.com</strong>
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
                    placeholder="noragamiarota@gmail.com"
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
                {authLoading ? "Verifying Creator..." : "Launch Operations Console →"}
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
                <label className="text-xs font-semibold text-slate-300">Personal Gmail Address</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
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
                {authLoading ? "Creating Account..." : "Create Account (100 MB Free) →"}
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

  // =========================================================
  // VIEW 2A: DEDICATED CREATOR OPERATIONS CONSOLE
  // (No personal uploads, no personal drive, no subscription plans)
  // =========================================================
  if (isCreatorAdmin) {
    const filteredTickets = feedbackList.filter((t) =>
      ticketFilter === "All" ? true : (t.status || "Open") === ticketFilter
    );

    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 font-sans">
        {/* Creator Operations Left Sidebar */}
        <aside className="w-64 border-r border-amber-500/15 bg-[#111827] flex flex-col justify-between py-6 px-4 shrink-0 select-none">
          <div>
            <div className="flex items-center gap-3 px-2 pb-5 mb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-amber-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-base font-bold tracking-tight text-white">Creator Console</h1>
                <p className="text-[11px] text-amber-400 font-semibold truncate">
                  Project Operations Only
                </p>
              </div>
            </div>

            <nav className="space-y-1.5">
              <button
                onClick={() => setCreatorTab("telemetry")}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  creatorTab === "telemetry"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <HardDrive className="w-4 h-4 shrink-0" />
                <span>Project Telemetry</span>
              </button>

              <button
                onClick={() => setCreatorTab("support")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition ${
                  creatorTab === "support"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Support & Issues Desk</span>
                </div>
                {adminData.open_tickets_count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    creatorTab === "support" ? "bg-slate-950 text-amber-400" : "bg-red-500 text-white"
                  }`}>
                    {adminData.open_tickets_count}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCreatorTab("users")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition ${
                  creatorTab === "users"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>User Governance</span>
                </div>
                <span className={`text-[11px] ${creatorTab === "users" ? "text-slate-950" : "text-slate-400"}`}>
                  {adminData.member_count}
                </span>
              </button>

              <button
                onClick={() => setCreatorTab("audit")}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  creatorTab === "audit"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Security & Audit Logs</span>
              </button>
            </nav>
          </div>

          {/* Creator Status & Sign Out Footer */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px]">
              <p className="font-bold text-amber-300 mb-0.5">⚡ System Status: Online</p>
              <p className="text-slate-400">SQLite WAL Engine • Gemini 2.5 Flash</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-xs shrink-0">
                  C
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-amber-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out of Creator Console"
                className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Creator Operations Main Workspace */}
        <main className="flex-1 flex flex-col overflow-y-auto px-8 py-6">
          <header className="flex items-center justify-between pb-5 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {creatorTab === "telemetry" && "Global Project Telemetry & AI Classification Health"}
                {creatorTab === "support" && "User Support, Bug Reports & Issue Resolution Desk"}
                {creatorTab === "users" && "Registered User Accounts & Cloud Bridge Governance"}
                {creatorTab === "audit" && "Platform Security & Chronological System Audit"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dedicated administrative control center for SmartSorter operations
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportAuditCsv}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-white/10 transition"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export System CSV</span>
              </button>
              <button
                onClick={fetchWorkspace}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Live Telemetry</span>
              </button>
            </div>
          </header>

          {uploadNotice && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
              <span>{uploadNotice}</span>
              <button onClick={() => setUploadNotice("")} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CREATOR TAB 1: PROJECT TELEMETRY & AI ENGINE */}
          {creatorTab === "telemetry" && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#151d2c] border border-white/10 p-5 rounded-2xl">
                  <p className="text-[11px] text-slate-400 uppercase font-bold">Registered Members</p>
                  <p className="text-3xl font-extrabold text-blue-400 mt-1">{adminData.member_count}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {adminData.pro_subscribers} Paid Maintenance • {adminData.linked_drives_count} Linked Drives
                  </p>
                </div>

                <div className="bg-[#151d2c] border border-white/10 p-5 rounded-2xl">
                  <p className="text-[11px] text-slate-400 uppercase font-bold">Total Files Sorted (Project-Wide)</p>
                  <p className="text-3xl font-extrabold text-white mt-1">{adminData.total_files_classified}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {adminData.active_files} Active • {adminData.deleted_files} Bin • {adminData.spam_files} Spam
                  </p>
                </div>

                <div className="bg-[#151d2c] border border-white/10 p-5 rounded-2xl">
                  <p className="text-[11px] text-slate-400 uppercase font-bold">Open Support Issues</p>
                  <p className="text-3xl font-extrabold text-amber-400 mt-1">{adminData.open_tickets_count}</p>
                  <button
                    onClick={() => setCreatorTab("support")}
                    className="text-xs text-amber-300 hover:underline mt-1 inline-block font-semibold"
                  >
                    Open Support Desk →
                  </button>
                </div>

                <div className="bg-[#151d2c] border border-white/10 p-5 rounded-2xl">
                  <p className="text-[11px] text-slate-400 uppercase font-bold">Global Index Footprint</p>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-1">{adminData.total_storage_mb} MB</p>
                  <p className="text-xs text-slate-500 mt-1">SQLite WAL Concurrency Active</p>
                </div>
              </div>

              {/* Global Category Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#151d2c] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-1">Global AI Classification Breakdown</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Aggregate distribution of all files sorted by Gemini Flash across all user workspaces
                  </p>
                  {adminData.global_categories && adminData.global_categories.length > 0 ? (
                    <div className="space-y-3">
                      {adminData.global_categories.map((catObj) => (
                        <div key={catObj.category} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-white/5 text-xs">
                          <div className="flex items-center gap-2.5">
                            <Folder className="w-4 h-4 text-amber-400" />
                            <span className="font-semibold text-slate-200">{catObj.category}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-300">{catObj.count} files</span>
                            <span className="text-slate-500 ml-2 font-mono">({catObj.size_kb} KB)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-6 text-center">
                      No files classified across the platform yet.
                    </p>
                  )}
                </div>

                <div className="bg-[#151d2c] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-1">Latest System & User Events</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Real-time stream of user registrations, Drive bindings, and support requests
                  </p>
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {activity.slice(0, 8).map((act) => (
                      <div key={act.id} className="p-3 rounded-xl bg-slate-900/70 border border-white/5 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-amber-300">{act.username}</span>
                          <span className="text-[11px] font-mono text-slate-400">{formatTimestamp(act.timestamp)}</span>
                        </div>
                        <p className="text-slate-200 font-medium mt-0.5">{act.action}</p>
                        <p className="text-[11px] text-slate-400 italic mt-0.5">{act.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CREATOR TAB 2: SUPPORT & ISSUES DESK (INTERACTIVE REPLY SYSTEM) */}
          {creatorTab === "support" && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {["All", "Open", "Resolved"].map((statusOpt) => (
                    <button
                      key={statusOpt}
                      onClick={() => setTicketFilter(statusOpt)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                        ticketFilter === statusOpt
                          ? "bg-amber-500 text-slate-950"
                          : "bg-[#151d2c] text-slate-300 border border-white/10 hover:bg-white/5"
                      }`}
                    >
                      {statusOpt} Tickets
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  Showing {filteredTickets.length} support ticket(s)
                </span>
              </div>

              {filteredTickets.length > 0 ? (
                <div className="space-y-4">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-5 rounded-2xl bg-[#151d2c] border border-white/10 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                            #{ticket.id}
                          </span>
                          <span className="text-sm font-bold text-white">{ticket.username}</span>
                          {ticket.user_email && (
                            <span className="text-xs text-slate-400">({ticket.user_email})</span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300">
                            {ticket.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-400">
                            {formatTimestamp(ticket.created_at)}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            ticket.status === "Resolved"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}>
                            {ticket.status || "Open"}
                          </span>
                        </div>
                      </div>

                      {/* User's Submitted Issue */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-200 leading-relaxed">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">User Issue / Request:</p>
                        {ticket.message}
                      </div>

                      {/* Existing Creator Reply if present */}
                      {ticket.admin_reply && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                          <div className="flex justify-between text-[10px] uppercase font-bold text-amber-400 mb-1">
                            <span>✓ Your Official Creator Response</span>
                            {ticket.replied_at && <span>{formatTimestamp(ticket.replied_at)}</span>}
                          </div>
                          <p>{ticket.admin_reply}</p>
                        </div>
                      )}

                      {/* Reply Input Box for Creator */}
                      <div className="flex gap-2.5 pt-1">
                        <input
                          type="text"
                          value={replyInputs[ticket.id] || ""}
                          onChange={(e) =>
                            setReplyInputs((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                          }
                          placeholder={
                            ticket.admin_reply
                              ? "Update your official reply to this user..."
                              : `Write an official reply to ${ticket.username}...`
                          }
                          className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleReplyTicket(ticket.id, "Resolved")}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shrink-0"
                        >
                          Send Reply & Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-[#151d2c] border border-white/10 text-center text-slate-400 text-sm">
                  No support tickets matching "{ticketFilter}".
                </div>
              )}
            </div>
          )}

          {/* CREATOR TAB 3: USER & CLOUD BRIDGE GOVERNANCE */}
          {creatorTab === "users" && (
            <div className="mt-6">
              <div className="rounded-2xl border border-white/10 bg-[#151d2c] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4">User Account</th>
                      <th className="py-3.5 px-4">Maintenance Plan</th>
                      <th className="py-3.5 px-4">Identity-Bound Storage</th>
                      <th className="py-3.5 px-4">Files Processed</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4 text-right">Access Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {adminData.users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.role === "ADMIN" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                              PROJECT CREATOR
                            </span>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.subscription_plan !== "Free"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-white/5 text-slate-400"
                            }`}>
                              {u.subscription_plan}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {u.role === "ADMIN" ? "Operations Console" : u.cloud_provider}
                        </td>
                        <td className="py-3.5 px-4">
                          {u.role === "ADMIN" ? (
                            <span className="text-slate-500 italic">—</span>
                          ) : (
                            <span>{u.total_classified} files ({u.storage_kb} KB)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === "Suspended"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {u.email.toLowerCase() !== CREATOR_EMAIL.toLowerCase() ? (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition ${
                                u.status === "Suspended"
                                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                                  : "bg-red-500/20 hover:bg-red-500/30 text-red-300"
                              }`}
                            >
                              {u.status === "Suspended" ? "Activate User" : "Suspend User"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-amber-400 font-bold">Creator Account</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CREATOR TAB 4: SECURITY & SYSTEM AUDIT LOGS */}
          {creatorTab === "audit" && (
            <div className="mt-6">
              <div className="rounded-2xl border border-white/10 bg-[#151d2c] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4">Event Type</th>
                      <th className="py-3.5 px-4">Execution Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {activity.map((act) => (
                      <tr key={act.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                          {formatTimestamp(act.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">{act.username}</td>
                        <td className="py-3 px-4 text-amber-400 font-semibold">{act.action}</td>
                        <td className="py-3 px-4 text-slate-400 italic">{act.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // =========================================================
  // VIEW 2B: STANDARD USER WORKSPACE (GOOGLE DRIVE INTERFACE)
  // =========================================================
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

  const displayedDocs = documents
    .filter((d) => {
      if (activeTab === "library") return selectedFolder === "All" || d.category === selectedFolder;
      if (activeTab === "offline") return d.is_offline;
      return true;
    })
    .filter((d) => (!starredOnly ? true : d.is_starred))
    .slice()
    .sort((a, b) => {
      if (activeTab === "recent" || sortBy === "newest") return b.id - a.id;
      if (sortBy === "size") return (b.size_kb || 0) - (a.size_kb || 0);
      if (sortBy === "name") return a.filename.localeCompare(b.filename);
      if (b.is_starred !== a.is_starred) return (b.is_starred ? 1 : 0) - (a.is_starred ? 1 : 0);
      return b.id - a.id;
    });

  const quotaMb = summary.storage_limit_mb || 100;
  const usedMb = summary.total_storage_mb || 0;
  const storagePercent = usedMb > 0 ? Math.max(Math.min(Math.round((usedMb / quotaMb) * 100), 100), 2) : 0;
  const quotaDisplayLabel = summary.cloud_linked
    ? `${usedMb} MB of ${(quotaMb / 1024).toFixed(0)} GB used (${summary.cloud_email})`
    : `${usedMb} MB of 100 MB used`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#131314] text-slate-100 font-sans">
      
      {/* 1. USER GOOGLE DRIVE STYLE SIDEBAR */}
      <aside className="w-64 border-r border-white/10 bg-[#1e1f20] flex flex-col justify-between py-5 px-3 shrink-0 select-none overflow-y-auto">
        <div>
          <div className="flex items-center justify-between px-4 pb-4 mb-2 border-b border-white/10">
            <div className="overflow-hidden">
              <h1 className="text-lg font-medium tracking-tight text-slate-100 flex items-center gap-2">
                <span>SmartSorter</span>
                {summary.subscription_plan !== "Free" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                    PRO
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                {summary.cloud_linked ? `🔒 Bound: ${currentUser.email}` : "100 MB Free Workspace"}
              </p>
            </div>
          </div>

          <nav className="space-y-0.5">
            <button
              onClick={() => setActiveTab("library")}
              className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-full text-sm font-medium transition ${
                activeTab === "library"
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <Folder className="w-4 h-4 shrink-0" />
              <span>Files & Folders</span>
            </button>

            <button
              onClick={() => setActiveTab("recent")}
              className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-full text-sm font-medium transition ${
                activeTab === "recent"
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Recent</span>
            </button>

            <button
              onClick={() => setActiveTab("uploads")}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition ${
                activeTab === "uploads"
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-4">
                <Upload className="w-4 h-4 shrink-0" />
                <span>Uploads</span>
              </div>
              <span className="text-[11px] text-slate-400">{summary.active_files_count}</span>
            </button>

            <button
              onClick={() => setActiveTab("offline")}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition ${
                activeTab === "offline"
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Offline</span>
              </div>
              {summary.offline_files_count > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300">
                  {summary.offline_files_count}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("bin")}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition ${
                activeTab === "bin"
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-4">
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Bin</span>
              </div>
              {summary.bin_files_count > 0 && (
                <span className="text-[11px] text-slate-400">{summary.bin_files_count}</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("spam")}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition ${
                activeTab === "spam"
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-4">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Spam</span>
              </div>
              {summary.spam_files_count > 0 && (
                <span className="text-[11px] px-1.5 rounded-full bg-red-500/20 text-red-300">
                  {summary.spam_files_count}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-full text-sm font-medium transition ${
                activeTab === "settings"
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => setActiveTab("help")}
              className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-full text-sm font-medium transition ${
                activeTab === "help"
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Help and feedback</span>
            </button>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab("storage")}
                className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-full text-sm font-medium transition ${
                  activeTab === "storage"
                    ? "bg-[#004a77] text-[#c2e7ff]"
                    : "text-slate-200 hover:bg-white/5"
                }`}
              >
                <Cloud className="w-4 h-4 shrink-0" />
                <span>Storage</span>
              </button>

              <div className="px-4 pt-2 pb-3">
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden mb-2.5">
                  <div
                    className="h-full bg-[#8ab4f8] rounded-full transition-all duration-300"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>

                <p className="text-xs text-slate-300 mb-1 truncate" title={quotaDisplayLabel}>
                  {quotaDisplayLabel}
                </p>
                <p className="text-[10px] text-slate-500 mb-3">
                  {summary.total_storage_kb} KB active ({summary.active_files_count} files)
                </p>

                <button
                  type="button"
                  onClick={() => setCloudModalOpen(true)}
                  className="px-4 py-2 rounded-full border border-slate-500/80 hover:bg-white/5 text-xs font-medium text-[#8ab4f8] transition"
                >
                  {summary.cloud_linked ? "Manage Gmail Drive" : "Link My Gmail Drive"}
                </button>
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-4 mx-2 flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {currentUser.name ? currentUser.name[0] : "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate" title={currentUser.email}>
                {currentUser.email}
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
      </aside>

      {/* 2. USER CENTER WORKSPACE CANVAS */}
      <main className="flex-1 flex flex-col overflow-y-auto px-8 py-6">
        <header className="flex items-center justify-between pb-5 border-b border-white/10 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search in SmartSorter & Linked Drive..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1e1f20] border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#8ab4f8] transition"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {summary.cloud_linked && (
              <button
                onClick={handleSyncCloudDrive}
                disabled={isSyncingCloud}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-500/30 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? "animate-spin" : ""}`} />
                <span>{isSyncingCloud ? "Sorting Drive..." : `Sync My Drive`}</span>
              </button>
            )}

            {summary.active_files_count > 0 && (
              <button
                onClick={() => setFolderAiTarget(selectedFolder)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-full text-xs font-semibold border border-purple-500/30 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Ask Folder AI</span>
              </button>
            )}

            <button
              onClick={handleCreateCustomFolder}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1e1f20] hover:bg-white/10 text-slate-200 rounded-full text-xs font-semibold border border-white/10 transition"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Folder</span>
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#8ab4f8] hover:bg-blue-400 text-slate-950 rounded-full text-xs font-bold shadow-lg transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Upload / Sort</span>
            </button>
          </div>
        </header>

        {uploadNotice && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-300">
            <span className="truncate">{uploadNotice}</span>
            <button onClick={() => setUploadNotice("")} className="text-slate-400 hover:text-white ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* VIEWS: FILES & FOLDERS / RECENT / OFFLINE */}
        {(activeTab === "library" || activeTab === "recent" || activeTab === "offline") && (
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  {activeTab === "library" && "Files & Smart Folders"}
                  {activeTab === "recent" && "Recent Activity & Files"}
                  {activeTab === "offline" && "Offline Available Files"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeTab === "library" && `Isolated workspace for ${currentUser.email} (${quotaDisplayLabel})`}
                  {activeTab === "recent" && "Chronological stream of your most recently processed files"}
                  {activeTab === "offline" && "Pinned documents cached for instant offline access"}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStarredOnly(!starredOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    starredOnly
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-[#1e1f20] border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${starredOnly ? "fill-amber-400 text-amber-400" : ""}`} />
                  <span>Starred</span>
                </button>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#1e1f20] border border-white/10 rounded-full px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="starred">Sort: Starred First</option>
                  <option value="newest">Sort: Recent First</option>
                  <option value="size">Sort: Size (KB)</option>
                  <option value="name">Sort: Name (A–Z)</option>
                </select>
              </div>
            </div>

            {activeTab === "library" && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Smart Folders</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  {folderEntries.length > 0 ? (
                    folderEntries.map(([cat, count]) => (
                      <div
                        key={cat}
                        onClick={() => setSelectedFolder(selectedFolder === cat ? "All" : cat)}
                        className={`border rounded-2xl p-3.5 flex items-center justify-between transition cursor-pointer group ${
                          selectedFolder === cat 
                            ? "bg-[#004a77]/60 border-[#8ab4f8]/60" 
                            : "bg-[#1e1f20] border-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <Folder className="w-4 h-4 text-[#8ab4f8] shrink-0" />
                          <span className="text-xs font-semibold text-slate-200 truncate">{cat}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {count > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setFolderAiTarget(cat); }}
                                title={`Synthesize '${cat}'`}
                                className="p-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/35 text-purple-300 transition"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleExportFolderZip(cat, e)}
                                title={`Download '${cat}' as ZIP`}
                                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic col-span-4">Upload documents or sync your personal Gmail Drive to generate smart folders.</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {activeTab === "offline" ? "Offline Cached Files" : "Sorted Files"} ({displayedDocs.length})
              </h3>
              {displayedDocs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {displayedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setPreviewDoc(doc)}
                      className={`bg-[#1e1f20] border rounded-2xl p-4 flex flex-col items-center text-center transition group hover:-translate-y-1 shadow-sm relative cursor-pointer ${
                        doc.is_starred ? "border-amber-500/40" : "border-white/5 hover:border-[#8ab4f8]/50"
                      }`}
                    >
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(doc.id, e)}
                          title="Star File"
                          className="p-1 rounded-lg hover:bg-white/10 transition"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              doc.is_starred ? "fill-amber-400 text-amber-400" : "text-slate-500"
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleOffline(doc.id, e)}
                          title={doc.is_offline ? "Available Offline" : "Make Available Offline"}
                          className="p-1 rounded-lg hover:bg-white/10 transition"
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              doc.is_offline ? "text-emerald-400" : "text-slate-600"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={(e) => handleShareDocument(doc.id, e)}
                          title="Copy Share Link"
                          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-purple-600 text-slate-300 hover:text-white border border-white/10"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSingle(doc.id, doc.filename, false); }}
                          title="Move to Bin"
                          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-red-600 text-slate-300 hover:text-white border border-white/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-center mb-3 mt-3 group-hover:scale-105 transition">
                        {getFileIcon(doc.filename)}
                      </div>
                      <p className="text-xs font-semibold text-slate-200 w-full truncate mb-1" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#8ab4f8] font-medium mb-1">
                        <span>{doc.category}</span>
                        <span>•</span>
                        <span>{doc.size_kb} KB</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 mb-1 truncate max-w-full">
                        {doc.storage_source}
                      </span>
                      {doc.summary && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                          {doc.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
                  <UploadCloud className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">
                    {activeTab === "offline"
                      ? "No files marked for Offline access yet. Click the checkmark icon on any file card!"
                      : "No documents uploaded in your account yet."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: UPLOADS */}
        {activeTab === "uploads" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Uploads & Personal Drive Sync</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload local files (100 MB Free Quota) or sync directly from your verified login Gmail Drive ({currentUser.email})
                </p>
              </div>
              <div className="flex gap-2.5">
                {summary.cloud_linked ? (
                  <button
                    onClick={handleSyncCloudDrive}
                    disabled={isSyncingCloud}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? "animate-spin" : ""}`} />
                    <span>Sync {currentUser.email} Drive</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCloudModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#004a77] hover:bg-[#005a92] text-[#c2e7ff] rounded-full text-xs font-bold transition"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Link {currentUser.email} Drive</span>
                  </button>
                )}
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#8ab4f8] text-slate-950 rounded-full text-xs font-bold"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>New Upload Batch</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1e1f20] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/20 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Filename & Summary</th>
                    <th className="py-3 px-4">Sorted Folder</th>
                    <th className="py-3 px-4">Storage Source</th>
                    <th className="py-3 px-4">Size / SHA-256</th>
                    <th className="py-3 px-4">Uploaded Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {documents.length > 0 ? (
                    documents.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-slate-100 truncate">{d.filename}</p>
                          <p className="text-[11px] text-slate-400 truncate">{d.summary}</p>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={d.category}
                            onChange={(e) => handleCategoryChange(d.id, e.target.value)}
                            className="bg-[#131314] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#8ab4f8] font-medium"
                          >
                            {allCategoryOptions.map((cOpt) => (
                              <option key={cOpt} value={cOpt}>{cOpt}</option>
                            ))}
                            <option value="__NEW_CUSTOM__">+ Custom Folder...</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300">
                            {d.storage_source}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {d.size_kb} KB {d.file_hash && <span className="text-slate-500">• #{d.file_hash}</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{formatTimestamp(d.created_at)}</td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => setPreviewDoc(d)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-300"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleOffline(d.id)}
                            className={`p-1.5 rounded-lg bg-white/5 ${d.is_offline ? "text-emerald-400" : "text-slate-400"}`}
                            title="Toggle Offline"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleSpam(d.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300"
                            title="Mark as Spam"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">No uploads recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: BIN */}
        {activeTab === "bin" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Bin</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Restore soft-deleted files to your workspace or permanently wipe them
                </p>
              </div>
              {documents.length > 0 && (
                <button
                  onClick={handleHardDeleteAll}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-full text-xs font-bold border border-red-500/30 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Empty Bin Permanently</span>
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1e1f20] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/20 text-slate-400 uppercase text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Original Folder</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Restore / Delete Forever</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {documents.length > 0 ? (
                    documents.map((d) => (
                      <tr key={d.id}>
                        <td className="py-3 px-4 font-semibold text-slate-200">{d.filename}</td>
                        <td className="py-3 px-4 text-slate-400">{d.category}</td>
                        <td className="py-3 px-4 text-slate-400">{d.size_kb} KB</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleRestoreSingle(d.id)}
                            className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(d.id, d.filename, true)}
                            className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-500/30"
                          >
                            Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 italic">Your Bin is empty.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: SPAM */}
        {activeTab === "spam" && (
          <div className="mt-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Spam & Duplicate Quarantine</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                SHA-256 duplicate uploads and flagged files are automatically isolated here so they do not consume your quota
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1e1f20] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/20 text-slate-400 uppercase text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Quarantined File</th>
                    <th className="py-3 px-4">Reason / SHA-256 Detection</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {documents.length > 0 ? (
                    documents.map((d) => (
                      <tr key={d.id}>
                        <td className="py-3 px-4 font-semibold text-amber-300">{d.filename}</td>
                        <td className="py-3 px-4 text-slate-400">{d.summary}</td>
                        <td className="py-3 px-4 text-slate-400">{d.size_kb} KB</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleSpam(d.id)}
                            className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold"
                          >
                            Not Spam (Restore)
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(d.id, d.filename, true)}
                            className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold"
                          >
                            Purge
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 italic">
                        No spam or duplicate files in quarantine.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: STORAGE & IDENTITY-BOUND GMAIL DRIVE BRIDGE */}
        {activeTab === "storage" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Personal Storage & Identity-Bound Gmail Bridge</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every Free user receives an isolated 100 MB workspace. Link your login Gmail ({currentUser.email}) to sort directly inside your own Google Drive.
                </p>
              </div>
              <button
                onClick={() => setCloudModalOpen(true)}
                className="px-4 py-2 rounded-full bg-[#8ab4f8] text-slate-950 text-xs font-bold"
              >
                {summary.cloud_linked ? "Manage Linked Drive" : `Link ${currentUser.email}`}
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[#1e1f20] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Cloud className="w-6 h-6 text-[#8ab4f8]" />
                  <span className="text-base font-bold">
                    {summary.cloud_linked
                      ? `${summary.cloud_provider} Bound to ${currentUser.email}`
                      : `Local 100 MB Quota (${currentUser.email})`}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300">
                    Plan: {summary.subscription_plan}
                  </span>
                  {summary.cloud_linked && summary.drive_binding_hash && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      🔒 Binding #{summary.drive_binding_hash}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  {summary.cloud_linked
                    ? `Security Verified: Only your login account (${currentUser.email}) is permitted to sync and sort files in this workspace.`
                    : `You are currently using your isolated 100 MB Free Quota. Cross-account Gmail linking is strictly blocked for security.`}
                </p>

                <div className="pt-2 max-w-lg">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">
                      {quotaDisplayLabel} ({summary.total_storage_kb} KB calculated from {summary.active_files_count} files)
                    </span>
                    <span className="text-[#8ab4f8] font-bold">{storagePercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8ab4f8] rounded-full transition-all duration-300"
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {summary.cloud_linked && (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSyncCloudDrive}
                    disabled={isSyncingCloud}
                    className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    {isSyncingCloud ? "Sorting..." : "Sync & Sort My Drive"}
                  </button>
                  <button
                    onClick={handleUnlinkCloudDrive}
                    className="px-4 py-2 rounded-full border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/10"
                  >
                    Unlink
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold mb-3">Database & Personal Drive Bridge Maintenance Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#1e1f20] border border-white/10 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Starter Sandbox</p>
                    <h4 className="text-xl font-bold mt-1">Free (100 MB)</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Isolated 100 MB per-user quota</p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-300">
                      <li>✓ 100 MB isolated workspace storage</li>
                      <li>✓ Extension & Gemini AI file sorting</li>
                      <li>✗ Personal Gmail Drive auto-bridge</li>
                      <li>✗ Automated Drive background sorting</li>
                    </ul>
                  </div>
                  <button
                    disabled={summary.subscription_plan === "Free"}
                    onClick={() => handleActivateSubscription("Free")}
                    className="mt-6 w-full py-2 rounded-full border border-white/15 text-xs font-semibold disabled:opacity-40"
                  >
                    {summary.subscription_plan === "Free" ? "Current Plan" : "Switch to Free (100 MB)"}
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-[#1e1f20] border-2 border-[#8ab4f8] flex flex-col justify-between relative">
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#8ab4f8] text-slate-950 text-[10px] font-bold">
                    RECOMMENDED
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase text-[#8ab4f8]">Cloud Bridge Pro</p>
                    <h4 className="text-xl font-bold mt-1">₹199 / month</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Connect Your Registered Gmail Drive</p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-200">
                      <li>✓ Strictly binds your login Gmail ({currentUser.email})</li>
                      <li>✓ Sorts uploaded files directly in your personal Drive</li>
                      <li>✓ Dynamic storage calculation upon login</li>
                      <li>✓ Full SQLite WAL metadata & hash maintenance</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleActivateSubscription("Cloud Bridge Pro")}
                    className="mt-6 w-full py-2 rounded-full bg-[#8ab4f8] hover:bg-blue-400 text-slate-950 text-xs font-bold transition"
                  >
                    {summary.subscription_plan === "Cloud Bridge Pro" ? "✓ Active Plan" : "Subscribe & Unlock Gmail Bridge"}
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-[#1e1f20] border border-purple-500/40 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-purple-400">Enterprise Auto-Sort</p>
                    <h4 className="text-xl font-bold mt-1">₹499 / month</h4>
                    <p className="text-[11px] text-slate-400 mt-1">High-Rate Multimodal AI + Priority SLA</p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-300">
                      <li>✓ Cryptographic 1-to-1 Gmail Drive binding</li>
                      <li>✓ Priority high-rate Gemini 2.5 Flash synthesis</li>
                      <li>✓ Automated SHA-256 duplicate quarantine</li>
                      <li>✓ Dedicated database maintenance & audit SLA</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleActivateSubscription("Enterprise Auto-Sort")}
                    className="mt-6 w-full py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
                  >
                    {summary.subscription_plan === "Enterprise Auto-Sort" ? "✓ Active Plan" : "Upgrade to Enterprise"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === "settings" && (
          <div className="mt-6 max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Settings & Security Policy</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure SmartSorter extension rules and verify your account identity binding
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1e1f20] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Strict 1-to-1 Gmail-to-Drive Identity Lock</p>
                  <p className="text-xs text-slate-400">
                    Blocks linking any external Google Drive that does not match your login email ({currentUser.email})
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400">🔒 Enforced</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div>
                  <p className="text-sm font-semibold">Auto-Sort Linked Drive by Extension & AI</p>
                  <p className="text-xs text-slate-400">Automatically route PDFs, code, and images into Smart Folders</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSortExt}
                  onChange={(e) => setAutoSortExt(e.target.checked)}
                  className="w-4 h-4 accent-[#8ab4f8]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div>
                  <p className="text-sm font-semibold">Generate 1-Line Gemini AI Summaries</p>
                  <p className="text-xs text-slate-400">Create concise content summaries for every ingested file</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiDeepSummary}
                  onChange={(e) => setAiDeepSummary(e.target.checked)}
                  className="w-4 h-4 accent-[#8ab4f8]"
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW: HELP AND FEEDBACK (USERS SEE CREATOR REPLIES HERE) */}
        {activeTab === "help" && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#1e1f20] border border-white/10 space-y-4">
              <h3 className="text-base font-bold">Submit Support Request or Issue</h3>
              <p className="text-xs text-slate-400">
                Need help with your 100 MB quota, Cloud Bridge, or sorting rules? Submit a ticket directly to the Project Creator.
              </p>

              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Issue Category</label>
                  <select
                    value={fbCategory}
                    onChange={(e) => setFbCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[#131314] border border-white/10 px-3 py-2 text-xs text-white"
                  >
                    <option value="Cloud Drive Sync">Cloud Drive Sync</option>
                    <option value="Subscription & Billing">Subscription & Billing</option>
                    <option value="AI Classification Issue">AI Classification Issue</option>
                    <option value="Bug Report">Bug Report</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Describe Your Issue</label>
                  <textarea
                    rows={4}
                    required
                    value={fbMessage}
                    onChange={(e) => setFbMessage(e.target.value)}
                    placeholder="Explain what happened so the Creator can resolve it..."
                    className="mt-1 w-full rounded-xl bg-[#131314] border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-[#8ab4f8]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#8ab4f8] text-slate-950 text-xs font-bold"
                >
                  Send to Creator Support Desk
                </button>
              </form>
            </div>

            <div className="p-6 rounded-2xl bg-[#1e1f20] border border-white/10 space-y-3">
              <h3 className="text-base font-bold">My Support Tickets & Creator Responses ({feedbackList.length})</h3>
              <p className="text-xs text-slate-400">
                Track the status of your reported issues and read replies from the Project Creator.
              </p>
              <div className="space-y-3 max-h-80 overflow-y-auto pt-2 pr-1">
                {feedbackList.length > 0 ? (
                  feedbackList.map((fb) => (
                    <div key={fb.id} className="p-3.5 rounded-xl bg-black/25 border border-white/10 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8ab4f8] font-bold">#{fb.id} • {fb.category}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          fb.status === "Resolved"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {fb.status || "Open"}
                        </span>
                      </div>
                      <p className="text-slate-200">{fb.message}</p>
                      {fb.admin_reply ? (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                          <p className="text-[10px] font-bold uppercase text-emerald-400 mb-0.5">
                            ✓ Creator Reply:
                          </p>
                          <p>{fb.admin_reply}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">Awaiting response from Creator...</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic py-8 text-center">
                    You have not submitted any support tickets yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: STRICT IDENTITY-LOCKED GMAIL DRIVE LINKING */}
      {cloudModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setCloudModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold">Identity-Locked Gmail Drive Bridge</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              For security and data isolation, SmartSorter only permits linking the Google Drive owned by your authenticated login email.
            </p>

            {summary.subscription_plan === "Free" ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <p className="text-xs text-amber-200 font-semibold">
                  🔒 Maintenance Subscription Required
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  You are currently on the <strong>100 MB Free Quota</strong> ({summary.total_storage_mb} MB used). Activate <strong>Cloud Bridge Pro (₹199/mo)</strong> to bind your personal Google Drive (<code>{currentUser.email}</code>).
                </p>
                <button
                  type="button"
                  onClick={() => handleActivateSubscription("Cloud Bridge Pro")}
                  className="w-full py-2.5 rounded-full bg-[#8ab4f8] text-slate-950 text-xs font-bold"
                >
                  Activate Cloud Bridge Pro (₹199/mo) →
                </button>
              </div>
            ) : (
              <form onSubmit={handleLinkCloudDrive} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Cloud Provider</label>
                  <select
                    value={cloudProviderInput}
                    onChange={(e) => setCloudProviderInput(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[#131314] border border-white/10 px-3 py-2.5 text-xs text-white"
                  >
                    <option value="Google Drive">Google Drive (Gmail Bound)</option>
                    <option value="OneDrive">Microsoft OneDrive (Email Bound)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Authenticated Drive Account</label>
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Identity Locked
                    </span>
                  </div>
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={currentUser.email}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-emerald-500/30 px-3 py-2.5 text-xs text-emerald-300 font-mono cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Cross-account linking is disabled. Only <strong>{currentUser.email}</strong> can be linked to this workspace.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#8ab4f8] hover:bg-blue-400 text-slate-950 text-xs font-bold transition"
                >
                  Verify Identity & Connect My Drive
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: UPLOAD DOCUMENTS */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold mb-1">Upload & Sort Files</h3>
            <p className="text-xs text-slate-400 mb-4">
              Active Storage: {quotaDisplayLabel}. Duplicate files are automatically routed to Spam.
            </p>

            <form onSubmit={handleUploadSubmit}>
              <div className="border-2 border-dashed border-white/10 hover:border-[#8ab4f8] rounded-xl p-6 text-center cursor-pointer mb-4">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#8ab4f8] file:text-slate-950 cursor-pointer"
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
                className="w-full py-2.5 bg-[#8ab4f8] hover:bg-blue-400 disabled:bg-slate-700 text-slate-950 rounded-full text-xs font-bold transition"
              >
                {isUploading ? "Sorting & Indexing..." : `Sort ${selectedFiles.length} File(s)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SPLIT-SCREEN DOCUMENT PREVIEW + "ASK GEMINI" */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-white/10 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#131314]">
              <div className="flex items-center gap-3 overflow-hidden">
                {getFileIcon(previewDoc.filename)}
                <div className="overflow-hidden">
                  <h3 className="text-sm font-bold text-white truncate">{previewDoc.filename}</h3>
                  <p className="text-[11px] text-slate-400 truncate">{previewDoc.summary}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={previewDoc.category}
                  onChange={(e) => handleCategoryChange(previewDoc.id, e.target.value)}
                  className="bg-[#1e1f20] border border-white/10 rounded-full px-3 py-1.5 text-xs text-[#8ab4f8] font-semibold"
                >
                  {allCategoryOptions.map((catOpt) => (
                    <option key={catOpt} value={catOpt}>{catOpt}</option>
                  ))}
                  <option value="__NEW_CUSTOM__">+ Custom Folder...</option>
                </select>

                <button
                  onClick={() => handleDownloadFile(previewDoc.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8ab4f8] text-slate-950 rounded-full text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-4">
                {["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(
                  previewDoc.filename.split(".").pop().toLowerCase()
                ) ? (
                  <img
                    src={`${API_BASE}/documents/${previewDoc.id}/file?download=false`}
                    alt={previewDoc.filename}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <iframe
                    title={previewDoc.filename}
                    src={`${API_BASE}/documents/${previewDoc.id}/file?download=false`}
                    className="w-full h-full rounded-lg border border-white/10 bg-white"
                  />
                )}
              </div>

              <div className="w-80 md:w-96 border-l border-white/10 bg-[#131314] flex flex-col justify-between p-4 shrink-0">
                <div className="pb-3 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8ab4f8]">
                      ✨ Ask Gemini AI
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleExportNotesMarkdown(previewDoc.filename, qaMessages)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#1e1f20] text-slate-300 border border-white/10"
                    >
                      💾 Save Notes (.md)
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <button
                      type="button"
                      onClick={() => handleAskDocument("Summarize the key points of this document.")}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300"
                    >
                      📄 Summarize
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskDocument("Generate 3 study quiz questions from this file.")}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300"
                    >
                      📝 Quiz Me
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
                  {qaMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs whitespace-pre-wrap leading-relaxed ${
                        m.role === "user"
                          ? "bg-[#004a77] text-[#c2e7ff] ml-6"
                          : "bg-[#1e1f20] border border-white/10 text-slate-200 mr-2"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                  {qaLoading && (
                    <div className="text-xs text-[#8ab4f8] italic animate-pulse">
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
                    placeholder="Ask about this file..."
                    className="flex-1 rounded-full bg-[#1e1f20] border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={qaLoading || !qaQuestion.trim()}
                    className="px-4 py-2 bg-[#8ab4f8] text-slate-950 rounded-full text-xs font-bold"
                  >
                    Ask
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ASK FOLDER AI SYNTHESIS */}
      {folderAiTarget && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-purple-500/30 rounded-2xl w-full max-w-2xl h-[75vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#131314]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Ask Folder AI — "{folderAiTarget}"</h3>
              </div>
              <button onClick={() => setFolderAiTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-6">
              {folderAiMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl text-xs whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-purple-600 text-white ml-12"
                      : "bg-[#131314] border border-white/10 text-slate-200 mr-6"
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskFolderAi();
              }}
              className="p-4 border-t border-white/10 bg-[#131314] flex gap-2.5"
            >
              <input
                type="text"
                value={folderAiQuestion}
                onChange={(e) => setFolderAiQuestion(e.target.value)}
                placeholder={`Synthesize all files in "${folderAiTarget}"...`}
                className="flex-1 rounded-full bg-[#1e1f20] border border-white/10 px-4 py-2 text-xs text-white"
              />
              <button
                type="submit"
                disabled={folderAiLoading || !folderAiQuestion.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-full text-xs font-bold"
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