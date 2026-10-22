import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./index.css";
import {
  Interactive3DBackground,
  TiltSpotlightCard,
  MagneticButton,
  useLenisSmoothScroll,
  useGsap3DCascade
} from "./components/NeoGlass3D";
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
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Download,
  Eye,
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

const FOLDER_ACCENTS = [
  { icon: "text-violet-600", badge: "bg-violet-100 text-violet-700 border-violet-200", glow: "rgba(124, 58, 237, 0.16)" },
  { icon: "text-pink-600", badge: "bg-pink-100 text-pink-700 border-pink-200", glow: "rgba(236, 72, 153, 0.16)" },
  { icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", glow: "rgba(16, 185, 129, 0.16)" },
  { icon: "text-orange-600", badge: "bg-orange-100 text-orange-700 border-orange-200", glow: "rgba(249, 115, 22, 0.16)" },
  { icon: "text-cyan-600", badge: "bg-cyan-100 text-cyan-700 border-cyan-200", glow: "rgba(6, 182, 212, 0.16)" }
];

const formatTimestamp = (raw) => {
  if (!raw) return "—";
  try {
    const isoString = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return raw;
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${minutes} ${ampm}`;
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

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState("library");
  const [creatorTab, setCreatorTab] = useState("telemetry");
  const [ticketFilter, setTicketFilter] = useState("All");
  const [replyInputs, setReplyInputs] = useState({});

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
    category_storage_kb: {}
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
    users: []
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

  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [cloudProviderInput, setCloudProviderInput] = useState("Google Drive");
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const [autoSortExt, setAutoSortExt] = useState(true);
  const [aiDeepSummary, setAiDeepSummary] = useState(true);
  const [fbCategory, setFbCategory] = useState("Cloud Drive Sync");
  const [fbMessage, setFbMessage] = useState("");

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

  const mainScrollRef = useRef(null);
  const cascadeContainerRef = useRef(null);

  const isCreatorAdmin = currentUser && currentUser.email?.toLowerCase() === CREATOR_EMAIL.toLowerCase();

  useLenisSmoothScroll(mainScrollRef, currentUser?.id);
  useGsap3DCascade(cascadeContainerRef, [activeTab, creatorTab, selectedFolder, documents.length, portalMode, resetStep]);

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
        password: loginPassword
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
        password: regPassword
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
      const res = await axios.post(`${API_BASE}/auth/request-otp`, { email: resetEmail.trim() });
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
        otp: resetOtp.trim()
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
        new_password: resetNewPass
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

  // Creator Admin Handlers
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
      await axios.put(`${API_BASE}/admin/users/${userObj.id}/status`, { account_status: nextStatus });
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
      setUploadNotice(res.data.is_offline ? "📌 File pinned for Offline access." : "Removed file from Offline cache.");
      await fetchWorkspace();
    } catch (err) {
      console.error("Offline toggle failed:", err);
    }
  };

  const handleToggleSpam = async (docId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await axios.post(`${API_BASE}/documents/${docId}/spam`);
      setUploadNotice(res.data.status === "Spam" ? "⚠️ File moved to Spam quarantine." : "✅ File restored from Spam.");
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
      if (navigator.clipboard) await navigator.clipboard.writeText(shareUrl);
      setUploadNotice(`🔗 Shareable link copied: ${shareUrl}`);
      setTimeout(() => setUploadNotice(""), 6000);
    } catch (err) {
      alert("Could not generate share link.");
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
      setFolderAiMessages((prev) => [...prev, { role: "ai", text: res.data.answer || "No synthesis generated." }]);
    } catch (err) {
      setFolderAiMessages((prev) => [...prev, { role: "ai", text: "Error: " + (err.response?.data?.detail || err.message) }]);
    } finally {
      setFolderAiLoading(false);
    }
  };

  const handleExportNotesMarkdown = (titleName, messagesList) => {
    const content = [
      `# SmartSorter AI Study Notes: ${titleName}`,
      `Generated on: ${new Date().toLocaleString()}`,
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
    setUploadNotice(`📁 Created custom folder "${clean}".`);
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
      await axios.put(`${API_BASE}/documents/${docId}/category`, { new_category: targetCategory });
      if (previewDoc && previewDoc.id === docId) setPreviewDoc({ ...previewDoc, category: targetCategory });
      await fetchWorkspace();
    } catch (err) {
      alert("Failed to move category.");
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
      const res = await axios.post(`${API_BASE}/documents/${previewDoc.id}/ask`, { question: qText });
      setQaMessages((prev) => [...prev, { role: "ai", text: res.data.answer || "No response generated." }]);
    } catch (err) {
      setQaMessages((prev) => [...prev, { role: "ai", text: "Error: " + (err.response?.data?.detail || err.message) }]);
    } finally {
      setQaLoading(false);
    }
  };

  const handleDownloadFile = (docId) => {
    window.open(`${API_BASE}/documents/${docId}/file?download=true`, "_blank");
  };

  const handleExportFolderZip = (categoryName, e) => {
    if (e) e.stopPropagation();
    window.open(`${API_BASE}/documents/export-zip?user_id=${currentUser.id}&category=${encodeURIComponent(categoryName)}`, "_blank");
  };

  const handleDeleteSingle = async (docId, filename, permanent = false) => {
    const confirmMsg = permanent ? `Permanently delete "${filename}"?` : `Move "${filename}" to Bin?`;
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
    if (!window.confirm("⚠️ PERMANENT WIPE: Delete all files permanently from SQLite and disk?")) return;
    try {
      await axios.post(`${API_BASE}/documents/hard-delete-all?user_id=${currentUser.id}`);
      await fetchWorkspace();
    } catch (err) {
      console.error("Hard delete error:", err);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("user_id", currentUser.id);
    for (let file of selectedFiles) formData.append("files", file);

    try {
      const res = await axios.post(`${API_BASE}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSelectedFiles([]);
      setUploadModalOpen(false);
      await fetchWorkspace();
      const skipped = res.data.skipped_duplicates || [];
      if (skipped.length > 0) {
        setUploadNotice(`🛡️ SHA-256 Duplicate Filter: Routed ${skipped.length} duplicate(s) to Spam.`);
      } else {
        setUploadNotice(`✅ Classified & indexed ${res.data.files?.length || 0} file(s)!`);
      }
      setTimeout(() => setUploadNotice(""), 6000);
    } catch (err) {
      alert("Upload Error: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return <FileText className="w-6 h-6 text-rose-500" />;
    if (["doc", "docx", "txt", "md"].includes(ext)) return <FileText className="w-6 h-6 text-violet-600" />;
    if (["py", "js", "ts", "html", "css", "java", "sql"].includes(ext)) return <Code className="w-6 h-6 text-emerald-600" />;
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) return <ImageIcon className="w-6 h-6 text-orange-500" />;
    if (["mp4", "mov", "avi"].includes(ext)) return <Video className="w-6 h-6 text-pink-600" />;
    return <Package className="w-6 h-6 text-indigo-500" />;
  };

  // =========================================================
  // VIEW 1: BRIGHT GEN-Z 3D NEO-GLASS AUTHENTICATION PORTAL
  // =========================================================
  if (!currentUser) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center p-4 text-slate-900 overflow-hidden">
        <Interactive3DBackground accent={portalMode === "admin" ? "coral" : "violet"} />

        <div ref={cascadeContainerRef} className="relative z-10 w-full max-w-md gsap-3d-item">
          <TiltSpotlightCard
            maxTilt={7}
            glowColor={portalMode === "admin" ? "rgba(249, 115, 22, 0.18)" : "rgba(219, 39, 119, 0.18)"}
            className="rounded-3xl p-8"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <div
                className={`mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl neo-btn ${
                  portalMode === "admin" ? "text-orange-500" : "text-violet-600"
                }`}
              >
                {portalMode === "admin" ? <ShieldCheck className="h-7 w-7" /> : <Folder className="h-7 w-7" />}
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 bg-clip-text text-transparent">
                {portalMode === "admin" ? "Creator Studio 3D" : "SmartSorter 3D"}
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {portalMode === "admin"
                  ? "Dedicated Project Telemetry, Governance & Support Console"
                  : "Daylight Neo-Glass AI Workspace & Identity-Locked Cloud Bridge"}
              </p>
            </div>

            {(portalMode === "user" || portalMode === "admin") && (
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl neo-recessed p-1.5">
                <button
                  type="button"
                  onClick={() => { setPortalMode("user"); setAuthError(""); setAuthSuccess(""); }}
                  className={`py-2.5 text-xs font-bold rounded-xl transition ${
                    portalMode === "user" ? "neo-btn-active" : "text-slate-600 hover:text-violet-700"
                  }`}
                >
                  User Workspace
                </button>
                <button
                  type="button"
                  onClick={() => { setPortalMode("admin"); setAuthError(""); setAuthSuccess(""); }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition ${
                    portalMode === "admin"
                      ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md"
                      : "text-slate-600 hover:text-orange-600"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Creator Admin</span>
                </button>
              </div>
            )}

            {authError && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{authSuccess}</span>
              </div>
            )}

            {portalMode === "user" && (
              <form onSubmit={(e) => handleLogin(e, false)} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Gmail / Email Address</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Enter your Gmail ID"
                      className="w-full rounded-2xl neo-recessed py-3 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-500" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl neo-recessed py-3 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                </div>

                <MagneticButton
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-2xl neo-btn-active py-3 text-xs font-extrabold tracking-wide transition hover:brightness-105"
                >
                  {authLoading ? "Entering 3D Workspace..." : "Launch SmartSorter →"}
                </MagneticButton>

                <div className="flex items-center justify-between pt-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setPortalMode("register"); setAuthError(""); setAuthSuccess(""); }}
                    className="text-slate-600 hover:text-violet-700"
                  >
                    Create account (100 MB Free)
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
                    className="text-pink-600 hover:text-violet-700"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {portalMode === "admin" && (
              <form onSubmit={(e) => handleLogin(e, true)} className="space-y-4">
                <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-[11px] text-orange-800 text-center font-semibold">
                  Restricted to Project Creator: <strong>noragamiarota@gmail.com</strong>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Creator Admin Email</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="noragamiarota@gmail.com"
                      className="w-full rounded-2xl neo-recessed py-3 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Admin Password</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl neo-recessed py-3 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>

                <MagneticButton
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-500/30"
                >
                  {authLoading ? "Verifying Creator..." : "Open Creator Studio →"}
                </MagneticButton>
              </form>
            )}

            {portalMode === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <div className="relative mt-1.5">
                    <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full rounded-2xl neo-recessed py-3 pl-10 pr-4 text-xs font-medium text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Personal Gmail Address</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full rounded-2xl neo-recessed py-3 pl-10 pr-4 text-xs font-medium text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-500" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Choose a password"
                      className="w-full rounded-2xl neo-recessed py-3 pl-10 pr-4 text-xs font-medium text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <MagneticButton
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-2xl neo-btn-active py-3 text-xs font-extrabold"
                >
                  {authLoading ? "Creating Account..." : "Create Account (100 MB Free) →"}
                </MagneticButton>

                <button
                  type="button"
                  onClick={() => { setPortalMode("user"); setAuthError(""); setAuthSuccess(""); }}
                  className="flex w-full items-center justify-center gap-1.5 pt-2 text-xs font-semibold text-slate-600 hover:text-violet-700"
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
                      <label className="text-xs font-bold text-slate-700">Registered Account Email</label>
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your registered Gmail"
                        className="mt-1.5 w-full rounded-2xl neo-recessed py-3 px-4 text-xs font-medium text-slate-900 focus:outline-none"
                      />
                    </div>
                    <MagneticButton
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-2xl neo-btn-active py-3 text-xs font-extrabold"
                    >
                      {authLoading ? "Dispatching OTP..." : "📧 Send 3-Min OTP to Email"}
                    </MagneticButton>
                  </form>
                )}

                {resetStep === 2 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-bold">Enter 6-Digit OTP</span>
                      <span className="font-mono font-bold text-pink-600">
                        {otpTimer > 0 ? `⏱ ${formatCountdown(otpTimer)}` : "⏱ Expired"}
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
                      className="w-full rounded-2xl neo-recessed py-3 px-4 text-center tracking-[0.5em] text-lg font-extrabold text-violet-700 focus:outline-none"
                    />
                    {otpTimer > 0 ? (
                      <MagneticButton
                        type="submit"
                        disabled={authLoading || resetOtp.length !== 6}
                        className="w-full rounded-2xl neo-btn-active py-3 text-xs font-extrabold"
                      >
                        Verify OTP →
                      </MagneticButton>
                    ) : (
                      <MagneticButton
                        type="button"
                        onClick={handleSendOtp}
                        className="w-full rounded-2xl bg-orange-500 py-3 text-xs font-extrabold text-white"
                      >
                        ↻ Resend OTP
                      </MagneticButton>
                    )}
                  </form>
                )}

                {resetStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <input
                      type="password"
                      required
                      value={resetNewPass}
                      onChange={(e) => setResetNewPass(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full rounded-2xl neo-recessed py-3 px-4 text-xs font-medium text-slate-900 focus:outline-none"
                    />
                    <input
                      type="password"
                      required
                      value={resetConfirmPass}
                      onChange={(e) => setResetConfirmPass(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-2xl neo-recessed py-3 px-4 text-xs font-medium text-slate-900 focus:outline-none"
                    />
                    <MagneticButton
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-2xl bg-emerald-500 py-3 text-xs font-extrabold text-white"
                    >
                      Save New Password
                    </MagneticButton>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => { setPortalMode("user"); setResetStep(1); setResetOtp(""); setOtpTimer(0); }}
                  className="flex w-full items-center justify-center gap-1.5 pt-2 text-xs font-semibold text-slate-600 hover:text-violet-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </button>
              </div>
            )}
          </TiltSpotlightCard>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW 2A: DEDICATED BRIGHT CREATOR OPERATIONS CONSOLE
  // =========================================================
  if (isCreatorAdmin) {
    const filteredTickets = feedbackList.filter((t) =>
      ticketFilter === "All" ? true : (t.status || "Open") === ticketFilter
    );

    return (
      <div className="relative flex h-screen w-screen overflow-hidden text-slate-900">
        <Interactive3DBackground accent="coral" />

        <aside className="relative z-10 w-64 m-3 rounded-3xl neo-glass flex flex-col justify-between p-5 shrink-0 select-none">
          <div>
            <div className="flex items-center gap-3 pb-5 mb-4 border-b border-slate-200/80">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-extrabold shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900">Creator Studio</h1>
                <p className="text-[11px] text-orange-600 font-bold">Project Operations</p>
              </div>
            </div>

            <nav className="space-y-2">
              {[
                { id: "telemetry", label: "Project Telemetry", icon: HardDrive },
                { id: "support", label: "Support Desk", icon: HelpCircle, badge: adminData.open_tickets_count },
                { id: "users", label: "User Governance", icon: Shield, badge: adminData.member_count },
                { id: "audit", label: "Security Audit", icon: Clock }
              ].map((item) => {
                const IconComp = item.icon;
                const active = creatorTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCreatorTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${
                      active
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md"
                        : "neo-btn text-slate-700 hover:text-orange-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        active ? "bg-white/25 text-white" : "bg-orange-100 text-orange-700"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl neo-recessed">
            <div className="overflow-hidden">
              <p className="text-xs font-extrabold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-orange-600 font-semibold truncate">{currentUser.email}</p>
            </div>
            <button onClick={handleSignOut} className="text-slate-500 hover:text-rose-600 p-1.5">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        <main ref={mainScrollRef} className="relative z-10 flex-1 overflow-y-auto p-6">
          <div ref={cascadeContainerRef} className="space-y-6">
            <header className="neo-glass rounded-3xl p-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold bg-gradient-to-r from-slate-900 via-violet-800 to-pink-600 bg-clip-text text-transparent">
                  {creatorTab === "telemetry" && "3D Project Telemetry & Global AI Health"}
                  {creatorTab === "support" && "Two-Way Support & Issue Resolution Desk"}
                  {creatorTab === "users" && "User Accounts & Identity-Bound Cloud Governance"}
                  {creatorTab === "audit" && "Chronological Security & System Audit"}
                </h2>
                <p className="text-xs font-medium text-slate-500">Daylight Neo-Glass Operations Console</p>
              </div>
              <div className="flex gap-2.5">
                <MagneticButton
                  onClick={handleExportAuditCsv}
                  className="neo-btn px-4 py-2.5 rounded-2xl text-xs font-bold text-violet-700 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" /> Export Audit CSV
                </MagneticButton>
                <MagneticButton
                  onClick={fetchWorkspace}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sync Telemetry
                </MagneticButton>
              </div>
            </header>

            {uploadNotice && (
              <div className="neo-glass rounded-2xl px-4 py-3 text-xs font-bold text-emerald-700 flex justify-between">
                <span>{uploadNotice}</span>
                <button onClick={() => setUploadNotice("")}><X className="w-4 h-4" /></button>
              </div>
            )}

            {creatorTab === "telemetry" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Registered Users", val: adminData.member_count, sub: `${adminData.pro_subscribers} Pro • ${adminData.linked_drives_count} Linked`, col: "text-violet-600" },
                    { label: "Total Files Sorted", val: adminData.total_files_classified, sub: `${adminData.active_files} Active • ${adminData.spam_files} Spam`, col: "text-pink-600" },
                    { label: "Open Support Issues", val: adminData.open_tickets_count, sub: "Click Support Desk to reply", col: "text-orange-500" },
                    { label: "Global Index Size", val: `${adminData.total_storage_mb} MB`, sub: "SQLite WAL Active", col: "text-emerald-600" }
                  ].map((k, i) => (
                    <TiltSpotlightCard key={i} glowColor="rgba(236, 72, 153, 0.14)" className="rounded-3xl p-5 gsap-3d-item">
                      <p className="text-[11px] uppercase font-extrabold text-slate-500">{k.label}</p>
                      <p className={`text-3xl font-extrabold mt-1 ${k.col}`}>{k.val}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">{k.sub}</p>
                    </TiltSpotlightCard>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TiltSpotlightCard className="rounded-3xl p-6 gsap-3d-item">
                    <h3 className="text-sm font-extrabold text-slate-800 mb-3">Global AI Classification Distribution</h3>
                    <div className="space-y-2.5">
                      {(adminData.global_categories || []).map((c) => (
                        <div key={c.category} className="neo-recessed p-3 rounded-2xl flex justify-between text-xs">
                          <span className="font-bold text-slate-800">{c.category}</span>
                          <span className="font-extrabold text-violet-600">{c.count} files ({c.size_kb} KB)</span>
                        </div>
                      ))}
                    </div>
                  </TiltSpotlightCard>

                  <TiltSpotlightCard className="rounded-3xl p-6 gsap-3d-item">
                    <h3 className="text-sm font-extrabold text-slate-800 mb-3">Live Security & Activity Stream</h3>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {activity.slice(0, 8).map((act) => (
                        <div key={act.id} className="neo-recessed p-3 rounded-2xl text-xs">
                          <div className="flex justify-between text-pink-600 font-bold">
                            <span>{act.username}</span>
                            <span className="font-mono text-[10px] text-slate-500">{formatTimestamp(act.timestamp)}</span>
                          </div>
                          <p className="text-slate-900 font-bold mt-0.5">{act.action}</p>
                          <p className="text-[11px] text-slate-600 italic">{act.details}</p>
                        </div>
                      ))}
                    </div>
                  </TiltSpotlightCard>
                </div>
              </>
            )}

            {creatorTab === "support" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {["All", "Open", "Resolved"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setTicketFilter(st)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold ${
                        ticketFilter === st ? "neo-btn-active" : "neo-btn text-slate-700"
                      }`}
                    >
                      {st} Tickets
                    </button>
                  ))}
                </div>
                {filteredTickets.map((t) => (
                  <TiltSpotlightCard key={t.id} maxTilt={4} className="rounded-3xl p-5 space-y-3 gsap-3d-item">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-900">
                        #{t.id} • {t.username} ({t.user_email}) — <span className="text-violet-600">{t.category}</span>
                      </span>
                      <span className="px-3 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">
                        {t.status || "Open"}
                      </span>
                    </div>
                    <div className="neo-recessed p-3.5 rounded-2xl text-xs font-medium text-slate-800">{t.message}</div>
                    {t.admin_reply && (
                      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                        <strong>Creator Reply:</strong> {t.admin_reply}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyInputs[t.id] || ""}
                        onChange={(e) => setReplyInputs((p) => ({ ...p, [t.id]: e.target.value }))}
                        placeholder={`Reply to ${t.username}...`}
                        className="flex-1 neo-recessed rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none"
                      />
                      <MagneticButton
                        onClick={() => handleReplyTicket(t.id, "Resolved")}
                        className="neo-btn-active px-4 py-2.5 rounded-2xl text-xs font-extrabold"
                      >
                        Send Reply & Resolve
                      </MagneticButton>
                    </div>
                  </TiltSpotlightCard>
                ))}
              </div>
            )}

            {creatorTab === "users" && (
              <div className="neo-glass rounded-3xl overflow-hidden gsap-3d-item">
                <table className="w-full text-left text-xs">
                  <thead className="bg-violet-50/70 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Plan</th>
                      <th className="py-3.5 px-4">Bound Storage</th>
                      <th className="py-3.5 px-4">Sorted</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {adminData.users.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{u.name} ({u.email})</td>
                        <td className="py-3.5 px-4 text-violet-700 font-bold">{u.subscription_plan}</td>
                        <td className="py-3.5 px-4 text-slate-600">{u.cloud_provider}</td>
                        <td className="py-3.5 px-4 font-semibold">{u.total_classified} files ({u.storage_kb} KB)</td>
                        <td className="py-3.5 px-4 font-bold">{u.status}</td>
                        <td className="py-3.5 px-4 text-right">
                          {u.email.toLowerCase() !== CREATOR_EMAIL.toLowerCase() && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className="neo-btn px-3 py-1 rounded-xl text-[11px] font-bold text-pink-600"
                            >
                              {u.status === "Suspended" ? "Activate" : "Suspend"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {creatorTab === "audit" && (
              <div className="neo-glass rounded-3xl overflow-hidden gsap-3d-item">
                <table className="w-full text-left text-xs">
                  <thead className="bg-violet-50/70 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {activity.map((act) => (
                      <tr key={act.id}>
                        <td className="py-3 px-4 font-mono text-slate-600">{formatTimestamp(act.timestamp)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{act.username}</td>
                        <td className="py-3 px-4 font-bold text-violet-600">{act.action}</td>
                        <td className="py-3 px-4 text-slate-600 italic">{act.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // VIEW 2B: BRIGHT GEN-Z 3D NEO-GLASS USER WORKSPACE
  // =========================================================
  const allCategoryOptions = Array.from(
    new Set([...STANDARD_CATEGORIES, ...customCategories, ...Object.keys(summary.category_counts || {})])
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
  const storagePercent = usedMb > 0 ? Math.max(Math.min(Math.round((usedMb / quotaMb) * 100), 100), 3) : 2;
  const quotaDisplayLabel = summary.cloud_linked
    ? `${usedMb} MB of ${(quotaMb / 1024).toFixed(0)} GB used (${summary.cloud_email})`
    : `${usedMb} MB of 100 MB used`;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden text-slate-900">
      <Interactive3DBackground accent="violet" />

      {/* 1. 3D FLOATING DAYLIGHT NEO-GLASS SIDEBAR */}
      <aside className="relative z-10 w-64 m-3 rounded-3xl neo-glass flex flex-col justify-between py-5 px-3.5 shrink-0 select-none overflow-y-auto">
        <div>
          <div className="px-3 pb-4 mb-3 border-b border-slate-200/80">
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
              <span>SmartSorter 3D</span>
              {summary.subscription_plan !== "Free" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 font-extrabold">
                  PRO
                </span>
              )}
            </h1>
            <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
              {summary.cloud_linked ? `🔒 Bound: ${currentUser.email}` : "100 MB Free Workspace"}
            </p>
          </div>

          <nav className="space-y-1">
            {[
              { id: "library", label: "Files & Folders", icon: Folder },
              { id: "recent", label: "Recent", icon: Clock },
              { id: "uploads", label: "Uploads", icon: Upload, count: summary.active_files_count },
              { id: "offline", label: "Offline", icon: CheckCircle2, count: summary.offline_files_count },
              { id: "bin", label: "Bin", icon: Trash2, count: summary.bin_files_count },
              { id: "spam", label: "Spam", icon: AlertOctagon, count: summary.spam_files_count },
              { id: "settings", label: "Settings", icon: Settings },
              { id: "help", label: "Help and feedback", icon: HelpCircle },
              { id: "storage", label: "Storage", icon: Cloud }
            ].map((item) => {
              const IconComp = item.icon;
              const isAct = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
                    isAct ? "neo-btn-active" : "text-slate-700 hover:bg-violet-500/10 hover:text-violet-700"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <IconComp className={`w-4 h-4 ${isAct ? "text-white" : "text-violet-600"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      isAct ? "bg-white/25 text-white" : "bg-violet-100 text-violet-700"
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Tactile Daylight Neomorphic Storage Meter */}
            <div className="px-3 pt-3 pb-2">
              <div className="w-full h-2.5 neo-recessed rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <p className="text-[11px] font-bold text-slate-700 truncate">{quotaDisplayLabel}</p>
              <p className="text-[10px] font-medium text-slate-500 mb-3">{summary.total_storage_kb} KB active</p>
              <MagneticButton
                onClick={() => setCloudModalOpen(true)}
                className="w-full py-2 rounded-2xl neo-btn text-xs font-extrabold text-violet-700 hover:text-pink-600"
              >
                {summary.cloud_linked ? "Manage Gmail Drive" : "Link My Gmail Drive"}
              </MagneticButton>
            </div>
          </nav>
        </div>

        <div className="mt-3 flex items-center justify-between p-2.5 rounded-2xl neo-recessed">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm">
              {currentUser.name ? currentUser.name[0] : "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-extrabold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-[10px] font-medium text-slate-500 truncate">{currentUser.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} title="Sign Out" className="text-slate-500 hover:text-rose-600 p-1.5">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. LENIS SMOOTH-SCROLL 3D WORKSPACE CANVAS */}
      <main ref={mainScrollRef} className="relative z-10 flex-1 overflow-y-auto p-6">
        <div ref={cascadeContainerRef} className="space-y-6">
          {/* Top Command Bar */}
          <header className="neo-glass rounded-3xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-violet-600" />
              <input
                type="text"
                placeholder="Search filenames, categories, or AI summaries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full neo-recessed rounded-2xl pl-11 pr-4 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            <div className="flex items-center gap-2.5">
              {summary.cloud_linked && (
                <MagneticButton
                  onClick={handleSyncCloudDrive}
                  disabled={isSyncingCloud}
                  className="neo-btn px-4 py-2.5 rounded-2xl text-xs font-extrabold text-emerald-600 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? "animate-spin" : ""}`} />
                  <span>{isSyncingCloud ? "Sorting..." : "Sync My Drive"}</span>
                </MagneticButton>
              )}

              {summary.active_files_count > 0 && (
                <MagneticButton
                  onClick={() => setFolderAiTarget(selectedFolder)}
                  className="neo-btn px-4 py-2.5 rounded-2xl text-xs font-extrabold text-violet-700 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>Ask Folder AI</span>
                </MagneticButton>
              )}

              <MagneticButton
                onClick={handleCreateCustomFolder}
                className="neo-btn px-4 py-2.5 rounded-2xl text-xs font-extrabold text-slate-700 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>New Folder</span>
              </MagneticButton>

              <MagneticButton
                onClick={() => setUploadModalOpen(true)}
                className="neo-btn-active px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Upload / Sort</span>
              </MagneticButton>
            </div>
          </header>

          {uploadNotice && (
            <div className="neo-glass rounded-2xl px-4 py-3 text-xs font-bold text-violet-700 flex items-center justify-between">
              <span>{uploadNotice}</span>
              <button onClick={() => setUploadNotice("")}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* VIEWS: FILES & FOLDERS / RECENT / OFFLINE */}
          {(activeTab === "library" || activeTab === "recent" || activeTab === "offline") && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-violet-800 to-pink-600 bg-clip-text text-transparent">
                    {activeTab === "library" && "3D Smart Folders & Multimodal Library"}
                    {activeTab === "recent" && "Recent Activity Stream"}
                    {activeTab === "offline" && "Offline Pinned Vault"}
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    Isolated workspace for {currentUser.email} • Hover any card for 3D perspective tilt
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setStarredOnly(!starredOnly)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 ${
                      starredOnly ? "neo-btn-active" : "neo-btn text-slate-700"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${starredOnly ? "fill-white text-white" : "text-amber-500"}`} />
                    <span>Starred</span>
                  </button>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="neo-recessed rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="starred">Sort: Starred First</option>
                    <option value="newest">Sort: Recent First</option>
                    <option value="size">Sort: Size (KB)</option>
                    <option value="name">Sort: Name (A–Z)</option>
                  </select>
                </div>
              </div>

              {activeTab === "library" && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">3D Smart Folders</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {folderEntries.length > 0 ? (
                      folderEntries.map(([cat, count], idx) => {
                        const pal = FOLDER_ACCENTS[idx % FOLDER_ACCENTS.length];
                        return (
                          <TiltSpotlightCard
                            key={cat}
                            maxTilt={12}
                            glowColor={pal.glow}
                            onClick={() => setSelectedFolder(selectedFolder === cat ? "All" : cat)}
                            className={`rounded-2xl p-4 cursor-pointer gsap-3d-item ${
                              selectedFolder === cat ? "ring-2 ring-violet-500" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <Folder className={`w-5 h-5 shrink-0 ${pal.icon}`} />
                                <span className="text-xs font-extrabold text-slate-800 truncate">{cat}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {count > 0 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setFolderAiTarget(cat); }}
                                      className="p-1.5 rounded-xl neo-btn text-violet-600"
                                      title="Synthesize Folder"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleExportFolderZip(cat, e)}
                                      className="p-1.5 rounded-xl neo-btn text-pink-600"
                                      title="Download ZIP"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${pal.badge}`}>
                                  {count}
                                </span>
                              </div>
                            </div>
                          </TiltSpotlightCard>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic col-span-4">
                        Upload documents or sync your Gmail Drive to generate 3D Smart Folders.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                  Sorted Documents ({displayedDocs.length})
                </h3>
                {displayedDocs.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {displayedDocs.map((doc, idx) => {
                      const pal = FOLDER_ACCENTS[idx % FOLDER_ACCENTS.length];
                      return (
                        <TiltSpotlightCard
                          key={doc.id}
                          maxTilt={14}
                          glowColor={pal.glow}
                          onClick={() => setPreviewDoc(doc)}
                          className="rounded-3xl p-4 cursor-pointer group gsap-3d-item"
                        >
                          <div className="flex flex-col items-center text-center relative">
                            <div className="w-full flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleStar(doc.id, e)}
                                  className="p-1 rounded-lg hover:bg-violet-100"
                                >
                                  <Star className={`w-3.5 h-3.5 ${doc.is_starred ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleOffline(doc.id, e)}
                                  className="p-1 rounded-lg hover:bg-emerald-100"
                                >
                                  <CheckCircle2 className={`w-3.5 h-3.5 ${doc.is_offline ? "text-emerald-600" : "text-slate-400"}`} />
                                </button>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  type="button"
                                  onClick={(e) => handleShareDocument(doc.id, e)}
                                  className="p-1.5 rounded-xl neo-btn text-violet-600"
                                >
                                  <Share2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSingle(doc.id, doc.filename, false); }}
                                  className="p-1.5 rounded-xl neo-btn text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="w-14 h-14 rounded-2xl neo-recessed flex items-center justify-center mb-3">
                              {getFileIcon(doc.filename)}
                            </div>
                            <p className="text-xs font-extrabold text-slate-900 w-full truncate mb-1" title={doc.filename}>
                              {doc.filename}
                            </p>
                            <span className="text-[10px] text-violet-700 font-bold mb-1">
                              {doc.category} • {doc.size_kb} KB
                            </span>
                            <span className="text-[9px] px-2.5 py-0.5 rounded-full neo-recessed text-slate-600 font-semibold mb-1.5 truncate max-w-full">
                              {doc.storage_source}
                            </span>
                            {doc.summary && (
                              <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                                {doc.summary}
                              </p>
                            )}
                          </div>
                        </TiltSpotlightCard>
                      );
                    })}
                  </div>
                ) : (
                  <div className="neo-glass rounded-3xl p-12 text-center">
                    <UploadCloud className="w-10 h-10 text-violet-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-700 font-bold">No documents in this view yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: UPLOADS / BIN / SPAM TABLES */}
          {(activeTab === "uploads" || activeTab === "bin" || activeTab === "spam") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {activeTab === "uploads" && "Uploads & Personal Gmail Drive Sync"}
                  {activeTab === "bin" && "Recoverable Bin"}
                  {activeTab === "spam" && "SHA-256 Duplicate & Spam Quarantine"}
                </h2>
                {activeTab === "bin" && documents.length > 0 && (
                  <MagneticButton
                    onClick={handleHardDeleteAll}
                    className="neo-btn px-4 py-2 rounded-2xl text-xs font-bold text-rose-600"
                  >
                    Empty Bin Forever
                  </MagneticButton>
                )}
              </div>

              <div className="neo-glass rounded-3xl overflow-hidden gsap-3d-item">
                <table className="w-full text-left text-xs">
                  <thead className="bg-violet-50/70 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Filename & AI Summary</th>
                      <th className="py-3.5 px-4">Folder</th>
                      <th className="py-3.5 px-4">Size / SHA-256</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {documents.length > 0 ? (
                      documents.map((d) => (
                        <tr key={d.id} className="hover:bg-violet-50/40">
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-extrabold text-slate-900 truncate">{d.filename}</p>
                            <p className="text-[11px] text-slate-600 truncate">{d.summary}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={d.category}
                              onChange={(e) => handleCategoryChange(d.id, e.target.value)}
                              className="neo-recessed rounded-xl px-2.5 py-1.5 text-xs font-bold text-violet-700"
                            >
                              {allCategoryOptions.map((cOpt) => (
                                <option key={cOpt} value={cOpt}>{cOpt}</option>
                              ))}
                              <option value="__NEW_CUSTOM__">+ Custom Folder...</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                            {d.size_kb} KB {d.file_hash && <span className="text-slate-400">• #{d.file_hash}</span>}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {activeTab === "bin" ? (
                              <>
                                <button onClick={() => handleRestoreSingle(d.id)} className="neo-btn px-3 py-1 rounded-xl text-emerald-600 font-bold">
                                  Restore
                                </button>
                                <button onClick={() => handleDeleteSingle(d.id, d.filename, true)} className="neo-btn px-3 py-1 rounded-xl text-rose-600 font-bold">
                                  Purge
                                </button>
                              </>
                            ) : activeTab === "spam" ? (
                              <>
                                <button onClick={() => handleToggleSpam(d.id)} className="neo-btn px-3 py-1 rounded-xl text-violet-600 font-bold">
                                  Not Spam
                                </button>
                                <button onClick={() => handleDeleteSingle(d.id, d.filename, true)} className="neo-btn px-3 py-1 rounded-xl text-rose-600 font-bold">
                                  Purge
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => setPreviewDoc(d)} className="neo-btn p-1.5 rounded-xl text-violet-600">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleToggleSpam(d.id)} className="neo-btn p-1.5 rounded-xl text-orange-500">
                                  <AlertOctagon className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-500 italic">No files in this section.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: STORAGE & IDENTITY-BOUND GMAIL BRIDGE */}
          {activeTab === "storage" && (
            <div className="space-y-6">
              <TiltSpotlightCard maxTilt={5} className="rounded-3xl p-6 gsap-3d-item">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Cloud className="w-6 h-6 text-violet-600" />
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {summary.cloud_linked
                          ? `${summary.cloud_provider} Bound to ${currentUser.email}`
                          : `Isolated 100 MB Free Quota (${currentUser.email})`}
                      </h3>
                      <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-violet-100 text-violet-700">
                        {summary.subscription_plan}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      Strict 1-to-1 Gmail Security Lock: Only <strong>{currentUser.email}</strong> can be linked to this workspace.
                    </p>
                  </div>
                  {summary.cloud_linked && (
                    <MagneticButton onClick={handleUnlinkCloudDrive} className="neo-btn px-4 py-2 rounded-2xl text-xs font-bold text-rose-600">
                      Unlink Drive
                    </MagneticButton>
                  )}
                </div>
              </TiltSpotlightCard>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { name: "Free", price: "Free (100 MB)", desc: "Isolated 100 MB local quota", perks: ["100 MB isolated storage", "Gemini Flash sorting", "SHA-256 duplicate filter"] },
                  { name: "Cloud Bridge Pro", price: "₹199 / month", desc: "Bind Your Login Gmail Drive", perks: ["Strictly binds " + currentUser.email, "Auto-sorts files in your Drive", "SQLite WAL index maintenance"] },
                  { name: "Enterprise Auto-Sort", price: "₹499 / month", desc: "High-Rate Multimodal AI Bridge", perks: ["1-to-1 cryptographic Drive lock", "Priority Gemini 2.5 synthesis", "Dedicated audit & backup SLA"] }
                ].map((tier) => (
                  <TiltSpotlightCard key={tier.name} maxTilt={9} className="rounded-3xl p-6 flex flex-col justify-between gsap-3d-item">
                    <div>
                      <p className="text-xs font-extrabold uppercase text-pink-600">{tier.name}</p>
                      <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{tier.price}</h4>
                      <p className="text-xs font-medium text-slate-500 mt-1">{tier.desc}</p>
                      <ul className="mt-4 space-y-2 text-xs font-semibold text-slate-700">
                        {tier.perks.map((p, i) => <li key={i}>✓ {p}</li>)}
                      </ul>
                    </div>
                    <MagneticButton
                      onClick={() => handleActivateSubscription(tier.name)}
                      className="mt-6 w-full py-2.5 rounded-2xl neo-btn-active text-xs font-extrabold"
                    >
                      {summary.subscription_plan === tier.name ? "✓ Active Plan" : `Select ${tier.name}`}
                    </MagneticButton>
                  </TiltSpotlightCard>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {activeTab === "settings" && (
            <TiltSpotlightCard maxTilt={5} className="rounded-3xl p-6 max-w-2xl space-y-4 gsap-3d-item">
              <h2 className="text-lg font-extrabold text-slate-900">Settings & Identity Security</h2>
              <div className="neo-recessed p-4 rounded-2xl flex justify-between items-center text-xs font-semibold">
                <span>Strict 1-to-1 Login Gmail Binding ({currentUser.email})</span>
                <span className="text-emerald-600 font-extrabold">🔒 Enforced</span>
              </div>
              <div className="neo-recessed p-4 rounded-2xl flex justify-between items-center text-xs font-semibold">
                <span>Auto-Sort Linked Drive by Extension & Gemini AI</span>
                <input type="checkbox" checked={autoSortExt} onChange={(e) => setAutoSortExt(e.target.checked)} className="w-4 h-4 accent-violet-600" />
              </div>
              <div className="neo-recessed p-4 rounded-2xl flex justify-between items-center text-xs font-semibold">
                <span>Generate 1-Line AI Summaries on Upload</span>
                <input type="checkbox" checked={aiDeepSummary} onChange={(e) => setAiDeepSummary(e.target.checked)} className="w-4 h-4 accent-pink-600" />
              </div>
            </TiltSpotlightCard>
          )}

          {/* VIEW: HELP & FEEDBACK */}
          {activeTab === "help" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TiltSpotlightCard maxTilt={6} className="rounded-3xl p-6 space-y-4 gsap-3d-item">
                <h3 className="text-base font-extrabold text-slate-900">Submit Issue to Project Creator</h3>
                <form onSubmit={handleSubmitFeedback} className="space-y-3">
                  <select
                    value={fbCategory}
                    onChange={(e) => setFbCategory(e.target.value)}
                    className="w-full rounded-2xl neo-recessed px-3.5 py-2.5 text-xs font-bold text-slate-800"
                  >
                    <option value="Cloud Drive Sync">Cloud Drive Sync</option>
                    <option value="Subscription & Billing">Subscription & Billing</option>
                    <option value="AI Classification Issue">AI Classification Issue</option>
                    <option value="Bug Report">Bug Report</option>
                  </select>
                  <textarea
                    rows={4}
                    required
                    value={fbMessage}
                    onChange={(e) => setFbMessage(e.target.value)}
                    placeholder="Describe your issue or request..."
                    className="w-full rounded-2xl neo-recessed p-3.5 text-xs font-medium text-slate-900 focus:outline-none"
                  />
                  <MagneticButton type="submit" className="neo-btn-active px-5 py-2.5 rounded-2xl text-xs font-extrabold">
                    Send to Creator Support Desk
                  </MagneticButton>
                </form>
              </TiltSpotlightCard>

              <TiltSpotlightCard maxTilt={6} className="rounded-3xl p-6 space-y-3 gsap-3d-item">
                <h3 className="text-base font-extrabold text-slate-900">My Tickets & Creator Replies ({feedbackList.length})</h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {feedbackList.map((fb) => (
                    <div key={fb.id} className="neo-recessed p-3.5 rounded-2xl text-xs space-y-1.5">
                      <div className="flex justify-between font-extrabold text-violet-700">
                        <span>#{fb.id} • {fb.category}</span>
                        <span>{fb.status || "Open"}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{fb.message}</p>
                      {fb.admin_reply && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                          <strong>Creator Reply:</strong> {fb.admin_reply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TiltSpotlightCard>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: IDENTITY-LOCKED CLOUD DRIVE LINK */}
      {cloudModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <TiltSpotlightCard maxTilt={5} className="rounded-3xl w-full max-w-md p-6 relative">
            <button onClick={() => setCloudModalOpen(false)} className="absolute right-5 top-5 text-slate-500 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-extrabold text-slate-900 mb-2">Identity-Locked Gmail Drive Bridge</h3>
            <p className="text-xs font-medium text-slate-600 mb-4">
              Only the Google Drive matching your login Gmail ({currentUser.email}) can be linked.
            </p>
            {summary.subscription_plan === "Free" ? (
              <div className="neo-recessed p-4 rounded-2xl space-y-3">
                <p className="text-xs text-pink-600 font-extrabold">🔒 Maintenance Subscription Required</p>
                <MagneticButton
                  onClick={() => handleActivateSubscription("Cloud Bridge Pro")}
                  className="w-full py-2.5 rounded-2xl neo-btn-active text-xs font-extrabold"
                >
                  Activate Cloud Bridge Pro (₹199/mo) →
                </MagneticButton>
              </div>
            ) : (
              <form onSubmit={handleLinkCloudDrive} className="space-y-4">
                <select
                  value={cloudProviderInput}
                  onChange={(e) => setCloudProviderInput(e.target.value)}
                  className="w-full rounded-2xl neo-recessed px-3.5 py-2.5 text-xs font-bold text-slate-800"
                >
                  <option value="Google Drive">Google Drive (Gmail Bound)</option>
                  <option value="OneDrive">Microsoft OneDrive (Email Bound)</option>
                </select>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={currentUser.email}
                  className="w-full rounded-2xl neo-recessed px-3.5 py-2.5 text-xs text-emerald-700 font-mono font-bold cursor-not-allowed"
                />
                <MagneticButton type="submit" className="w-full py-2.5 rounded-2xl neo-btn-active text-xs font-extrabold">
                  Verify Identity & Connect My Drive
                </MagneticButton>
              </form>
            )}
          </TiltSpotlightCard>
        </div>
      )}

      {/* MODAL: UPLOAD FILES */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <TiltSpotlightCard maxTilt={5} className="rounded-3xl w-full max-w-md p-6 relative">
            <button onClick={() => setUploadModalOpen(false)} className="absolute right-5 top-5 text-slate-500 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Upload & Sort Files</h3>
            <p className="text-xs font-medium text-slate-600 mb-4">{quotaDisplayLabel}</p>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="neo-recessed rounded-2xl p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-violet-600 file:text-white cursor-pointer"
                />
              </div>
              <MagneticButton
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full py-2.5 rounded-2xl neo-btn-active text-xs font-extrabold"
              >
                {isUploading ? "Sorting & Indexing..." : `Sort ${selectedFiles.length} File(s)`}
              </MagneticButton>
            </form>
          </TiltSpotlightCard>
        </div>
      )}

      {/* MODAL: SPLIT-SCREEN DOCUMENT PREVIEW + ASK GEMINI */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="neo-glass rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3 overflow-hidden">
                {getFileIcon(previewDoc.filename)}
                <div className="overflow-hidden">
                  <h3 className="text-sm font-extrabold text-slate-900 truncate">{previewDoc.filename}</h3>
                  <p className="text-[11px] text-slate-600 truncate">{previewDoc.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownloadFile(previewDoc.id)} className="neo-btn-active px-3.5 py-1.5 rounded-xl text-xs font-extrabold">
                  Download
                </button>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-slate-500 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
                {["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(previewDoc.filename.split(".").pop().toLowerCase()) ? (
                  <img src={`${API_BASE}/documents/${previewDoc.id}/file?download=false`} alt={previewDoc.filename} className="max-h-full max-w-full object-contain rounded-xl shadow-md" />
                ) : (
                  <iframe title={previewDoc.filename} src={`${API_BASE}/documents/${previewDoc.id}/file?download=false`} className="w-full h-full rounded-xl bg-white shadow-sm" />
                )}
              </div>

              <div className="w-80 md:w-96 border-l border-slate-200 flex flex-col justify-between p-4">
                <div className="pb-3 border-b border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-violet-700">✨ Ask Gemini AI</span>
                    <button onClick={() => handleExportNotesMarkdown(previewDoc.filename, qaMessages)} className="neo-btn px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-700">
                      💾 Save Notes
                    </button>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => handleAskDocument("Summarize key points.")} className="neo-btn px-2.5 py-1 rounded-xl text-[10px] font-bold text-violet-700">📄 Summarize</button>
                    <button onClick={() => handleAskDocument("Generate 3 quiz questions.")} className="neo-btn px-2.5 py-1 rounded-xl text-[10px] font-bold text-pink-600">📝 Quiz Me</button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 py-3">
                  {qaMessages.map((m, idx) => (
                    <div key={idx} className={`p-3 rounded-2xl text-xs whitespace-pre-wrap ${m.role === "user" ? "neo-btn-active ml-6" : "neo-recessed text-slate-800 mr-2"}`}>
                      {m.text}
                    </div>
                  ))}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAskDocument(); }} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                    placeholder="Ask about this file..."
                    className="flex-1 neo-recessed rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                  <button type="submit" className="neo-btn-active px-4 py-2 rounded-2xl text-xs font-extrabold">Ask</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASK FOLDER AI */}
      {folderAiTarget && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="neo-glass rounded-3xl w-full max-w-2xl h-[75vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-extrabold text-violet-700">✨ Ask Folder AI — "{folderAiTarget}"</h3>
              <button onClick={() => setFolderAiTarget(null)}><X className="w-5 h-5 text-slate-600" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 p-6">
              {folderAiMessages.map((m, idx) => (
                <div key={idx} className={`p-3.5 rounded-2xl text-xs whitespace-pre-wrap ${m.role === "user" ? "neo-btn-active ml-10" : "neo-recessed text-slate-800 mr-6"}`}>
                  {m.text}
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAskFolderAi(); }} className="p-4 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={folderAiQuestion}
                onChange={(e) => setFolderAiQuestion(e.target.value)}
                placeholder={`Synthesize all files in "${folderAiTarget}"...`}
                className="flex-1 neo-recessed rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none"
              />
              <button type="submit" className="neo-btn-active px-4 py-2.5 rounded-2xl text-xs font-extrabold">Synthesize</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}