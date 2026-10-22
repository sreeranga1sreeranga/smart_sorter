import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./index.css";
import {
  ThreeGraffitiScene,
  SplashCursor,
  DecryptedText,
  TypewriterWords,
  GraffitiTicker,
  TiltSpotlightCard,
  MagneticButton,
  FloatingGraffitiDock,
  useLenisSmoothScroll,
  useGsap3DCascade,
  motion,
  AnimatePresence
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
  Cloud,
  Zap
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

const GRAFFITI_SWATCHES = [
  { bg: "bg-[#CCFF00]", text: "text-black", variant: "lime", tag: "border-[#CCFF00] text-[#CCFF00]" },
  { bg: "bg-[#FF007F]", text: "text-white", variant: "pink", tag: "border-[#FF007F] text-[#FF007F]" },
  { bg: "bg-[#00F0FF]", text: "text-black", variant: "cyan", tag: "border-[#00F0FF] text-[#00F0FF]" },
  { bg: "bg-[#FFBE0B]", text: "text-black", variant: "lime", tag: "border-[#FFBE0B] text-[#FFBE0B]" },
  { bg: "bg-[#8338EC]", text: "text-white", variant: "pink", tag: "border-[#8338EC] text-[#c792ea]" }
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

  // Navigation Dock Tabs (No Traditional Left Sidebar!)
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
          text: `⚡ Yo! Ready to break down "${previewDoc.filename}" (${previewDoc.category}). Hit a quick tag or ask me anything!`
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
          text: `🔥 Folder Synthesis Armed for "${folderAiTarget}". I can mash up all files into a revision sheet or drop viva questions!`
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
      setAuthSuccess("Account minted with 100 MB Free Quota! Signing in...");
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
      setAuthSuccess("Password updated! Redirecting...");
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
      setUploadNotice(res.data.is_offline ? "📌 Pinned for Offline access." : "Removed from Offline cache.");
      await fetchWorkspace();
    } catch (err) {
      console.error("Offline toggle failed:", err);
    }
  };

  const handleToggleSpam = async (docId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await axios.post(`${API_BASE}/documents/${docId}/spam`);
      setUploadNotice(res.data.status === "Spam" ? "⚠️ Moved to Spam quarantine." : "✅ Restored from Spam.");
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
    if (["pdf"].includes(ext)) return <FileText className="w-7 h-7 text-[#FF007F]" />;
    if (["doc", "docx", "txt", "md"].includes(ext)) return <FileText className="w-7 h-7 text-[#00F0FF]" />;
    if (["py", "js", "ts", "html", "css", "java", "sql"].includes(ext)) return <Code className="w-7 h-7 text-[#CCFF00]" />;
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) return <ImageIcon className="w-7 h-7 text-[#FFBE0B]" />;
    if (["mp4", "mov", "avi"].includes(ext)) return <Video className="w-7 h-7 text-[#8338EC]" />;
    return <Package className="w-7 h-7 text-white" />;
  };

  // =========================================================
  // VIEW 1: ASYMMETRICAL SPLIT-SCREEN 3D GRAFFITI AUTH STAGE
  // (No basic centered box! Left 60% 3D Art Stage + Right 40% Tilted Vault Pass)
  // =========================================================
  if (!currentUser) {
    return (
      <div className="relative flex flex-col justify-between min-h-screen w-screen bg-halftone overflow-hidden">
        <SplashCursor />
        <ThreeGraffitiScene mode={portalMode} />

        {/* Top Diagonal Graffiti Caution Ticker */}
        <div className="relative z-20">
          <GraffitiTicker
            items={[
              "SMARTSORTER V8.0 GRAFFITI EDITION",
              "THREE.JS WEBGL + GSAP + LENIS + REACT BITS",
              "100 MB FREE ISOLATED QUOTA",
              "1-TO-1 GMAIL DRIVE IDENTITY LOCK",
              "GEMINI 2.5 FLASH MULTIMODAL ENGINE"
            ]}
            bg={portalMode === "admin" ? "bg-[#FFBE0B]" : "bg-[#CCFF00]"}
          />
        </div>

        {/* Center Split-Screen Stage */}
        <div
          ref={cascadeContainerRef}
          className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 items-center px-6 md:px-14 py-6 gap-8 max-w-7xl mx-auto w-full"
        >
          {/* LEFT 7 COLUMNS: KINETIC STREET-ART POSTER & FLOATING STICKERS */}
          <div className="lg:col-span-7 space-y-6 gsap-3d-item">
            {/* Floating Mode Selector Stickers */}
            <div className="flex flex-wrap items-center gap-4">
              <MagneticButton
                onClick={() => { setPortalMode("user"); setAuthError(""); setAuthSuccess(""); }}
                className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider -rotate-2 ${
                  portalMode === "user"
                    ? "bg-[#CCFF00] text-black"
                    : "bg-[#181030] text-white border-white"
                }`}
              >
                ★ USER VAULT PASS
              </MagneticButton>

              <MagneticButton
                onClick={() => { setPortalMode("admin"); setAuthError(""); setAuthSuccess(""); }}
                className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider rotate-2 flex items-center gap-2 ${
                  portalMode === "admin"
                    ? "bg-[#FFBE0B] text-black"
                    : "bg-[#181030] text-[#FFBE0B] border-[#FFBE0B]"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>CREATOR OPS STUDIO</span>
              </MagneticButton>
            </div>

            {/* Oversized Graffiti Decrypted Headline */}
            <div className="space-y-2">
              <div className="inline-block px-3 py-1 rounded-lg bg-[#FF007F] text-white font-mono-code font-extrabold text-xs uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_#000] -rotate-1">
                {portalMode === "admin" ? "RESTRICTED CREATOR CONSOLE" : "BYOC CLOUD BRIDGE + AI SORTER"}
              </div>

              <h1 className="text-5xl sm:text-7xl font-extrabold uppercase leading-[0.95] tracking-tighter text-white drop-shadow-[5px_5px_0px_#000]">
                <DecryptedText text={portalMode === "admin" ? "CREATOR" : "SMART"} />
                <br />
                <span className="text-[#CCFF00] drop-shadow-[5px_5px_0px_#FF007F]">
                  <DecryptedText text={portalMode === "admin" ? "CONTROL." : "SORTER."} />
                </span>
              </h1>
            </div>

            {/* Live Typewriter Street-Art Subheadline */}
            <div className="p-4 rounded-2xl bg-black/75 border-2 border-white/80 max-w-xl shadow-[6px_6px_0px_#00F0FF]">
              <p className="font-mono-code text-sm sm:text-base font-bold text-[#00F0FF]">
                &gt;{" "}
                <TypewriterWords
                  words={[
                    "Sort Google Drive files with Gemini 2.5 Flash.",
                    "Zero server bloat — 1-to-1 Gmail Identity Lock.",
                    "SHA-256 Duplicate Quarantine & ZIP Exports.",
                    "Ask Folder AI to generate instant exam notes."
                  ]}
                />
              </p>
            </div>

            {/* Street-Art Feature Sticker Badges */}
            <div className="flex flex-wrap gap-3 pt-2">
              <span className="px-4 py-2 rounded-xl bg-[#8338EC] text-white font-extrabold text-xs border-2 border-black shadow-[4px_4px_0px_#CCFF00] -rotate-2">
                ⚡ 100 MB FREE SANDBOX
              </span>
              <span className="px-4 py-2 rounded-xl bg-[#00F0FF] text-black font-extrabold text-xs border-2 border-black shadow-[4px_4px_0px_#FF007F] rotate-1">
                🔒 1-TO-1 GMAIL LOCK
              </span>
              <span className="px-4 py-2 rounded-xl bg-[#FF007F] text-white font-extrabold text-xs border-2 border-black shadow-[4px_4px_0px_#000] -rotate-1">
                🎨 3D WEBGL + REACT BITS
              </span>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: TILTED NEO-BRUTALIST VAULT PASS TERMINAL */}
          <div className="lg:col-span-5 gsap-3d-item">
            <TiltSpotlightCard
              maxTilt={8}
              variant={portalMode === "admin" ? "pink" : "lime"}
              className="rounded-3xl p-7 sm:p-8 -rotate-1"
            >
              {/* Terminal Top Tag */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-white/20">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#FF007F] border border-black" />
                  <span className="w-3.5 h-3.5 rounded-full bg-[#FFBE0B] border border-black" />
                  <span className="w-3.5 h-3.5 rounded-full bg-[#CCFF00] border border-black" />
                </div>
                <span className="font-mono-code text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-white text-black">
                  {portalMode.toUpperCase()} // GATEWAY
                </span>
              </div>

              {authError && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-black bg-[#FF007F] p-3 text-xs font-extrabold text-white shadow-[4px_4px_0px_#000]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-black bg-[#CCFF00] p-3 text-xs font-extrabold text-black shadow-[4px_4px_0px_#000]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* USER LOGIN FORM */}
              {portalMode === "user" && (
                <form onSubmit={(e) => handleLogin(e, false)} className="space-y-4">
                  <div>
                    <label className="font-mono-code text-xs font-extrabold uppercase text-[#CCFF00]">
                      01 // GMAIL ADDRESS
                    </label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00F0FF]" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        className="w-full rounded-2xl graffiti-input py-3 pl-10 pr-4 text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-mono-code text-xs font-extrabold uppercase text-[#FF007F]">
                      02 // SECRET PASSKEY
                    </label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FF007F]" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-2xl graffiti-input py-3 pl-10 pr-4 text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <MagneticButton
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-2xl bg-[#CCFF00] py-3.5 text-xs font-extrabold uppercase tracking-wider text-black"
                  >
                    {authLoading ? "UNLOCKING VAULT..." : "⚡ DROP INTO WORKSPACE →"}
                  </MagneticButton>

                  <div className="flex items-center justify-between pt-3 text-xs font-extrabold">
                    <button
                      type="button"
                      onClick={() => { setPortalMode("register"); setAuthError(""); setAuthSuccess(""); }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#00F0FF] hover:text-black transition"
                    >
                      + MINT NEW ACCOUNT
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
                      className="text-[#FF007F] hover:underline"
                    >
                      LOST PASSKEY?
                    </button>
                  </div>
                </form>
              )}

              {/* CREATOR ADMIN LOGIN FORM */}
              {portalMode === "admin" && (
                <form onSubmit={(e) => handleLogin(e, true)} className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#FFBE0B] text-black border-2 border-black font-mono-code text-[11px] font-extrabold text-center shadow-[4px_4px_0px_#000]">
                    CREATOR LOCK: noragamiarota@gmail.com
                  </div>

                  <div>
                    <label className="font-mono-code text-xs font-extrabold uppercase text-[#FFBE0B]">
                      CREATOR GMAIL
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="noragamiarota@gmail.com"
                      className="mt-1.5 w-full rounded-2xl graffiti-input py-3 px-4 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-mono-code text-xs font-extrabold uppercase text-[#FF007F]">
                      MASTER KEY
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 w-full rounded-2xl graffiti-input py-3 px-4 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <MagneticButton
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-2xl bg-[#FFBE0B] py-3.5 text-xs font-extrabold uppercase tracking-wider text-black"
                  >
                    {authLoading ? "VERIFYING CREATOR..." : "🛡️ LAUNCH CREATOR DECK →"}
                  </MagneticButton>
                </form>
              )}

              {/* REGISTER FORM */}
              {portalMode === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="font-mono-code text-xs font-extrabold uppercase text-[#00F0FF]">
                      CREW HANDLE / NAME
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Your Name"
                      className="mt-1.5 w-full rounded-2xl graffiti-input py-3 px-4 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-mono-code text-xs font-extrabold uppercase text-[#CCFF00]">
                      PERSONAL GMAIL ID
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="mt-1.5 w-full rounded-2xl graffiti-input py-3 px-4 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-mono-code text-xs font-extrabold uppercase text-[#FF007F]">
                      CREATE PASSKEY
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Choose a strong password"
                      className="mt-1.5 w-full rounded-2xl graffiti-input py-3 px-4 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <MagneticButton
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-2xl bg-[#00F0FF] py-3.5 text-xs font-extrabold uppercase text-black"
                  >
                    {authLoading ? "MINTING..." : "★ MINT 100 MB FREE PASS →"}
                  </MagneticButton>

                  <button
                    type="button"
                    onClick={() => { setPortalMode("user"); setAuthError(""); setAuthSuccess(""); }}
                    className="flex w-full items-center justify-center gap-1.5 pt-2 text-xs font-bold text-slate-300 hover:text-[#CCFF00]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> BACK TO LOGIN
                  </button>
                </form>
              )}

              {/* 3-STEP OTP RECOVERY */}
              {portalMode === "reset" && (
                <div className="space-y-4">
                  {resetStep === 1 && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <label className="font-mono-code text-xs font-extrabold uppercase text-[#00F0FF]">
                        REGISTERED GMAIL
                      </label>
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your Gmail"
                        className="w-full rounded-2xl graffiti-input py-3 px-4 text-xs font-bold text-white focus:outline-none"
                      />
                      <MagneticButton
                        type="submit"
                        disabled={authLoading}
                        className="w-full rounded-2xl bg-[#CCFF00] py-3.5 text-xs font-extrabold text-black uppercase"
                      >
                        {authLoading ? "DISPATCHING..." : "📧 DISPATCH 3-MIN OTP"}
                      </MagneticButton>
                    </form>
                  )}

                  {resetStep === 2 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-mono-code">
                        <span className="text-[#CCFF00] font-bold">6-DIGIT CODE</span>
                        <span className="px-2 py-0.5 rounded bg-[#FF007F] text-white font-extrabold">
                          {otpTimer > 0 ? `⏱ ${formatCountdown(otpTimer)}` : "EXPIRED"}
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
                        className="w-full rounded-2xl graffiti-input py-3 px-4 text-center tracking-[0.5em] text-lg font-extrabold text-[#CCFF00] focus:outline-none"
                      />
                      {otpTimer > 0 ? (
                        <MagneticButton
                          type="submit"
                          disabled={authLoading || resetOtp.length !== 6}
                          className="w-full rounded-2xl bg-[#00F0FF] py-3.5 text-xs font-extrabold text-black uppercase"
                        >
                          VERIFY OTP →
                        </MagneticButton>
                      ) : (
                        <MagneticButton
                          type="button"
                          onClick={handleSendOtp}
                          className="w-full rounded-2xl bg-[#FFBE0B] py-3.5 text-xs font-extrabold text-black uppercase"
                        >
                          ↻ RESEND OTP
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
                        placeholder="New Passkey"
                        className="w-full rounded-2xl graffiti-input py-3 px-4 text-xs font-bold text-white focus:outline-none"
                      />
                      <input
                        type="password"
                        required
                        value={resetConfirmPass}
                        onChange={(e) => setResetConfirmPass(e.target.value)}
                        placeholder="Confirm Passkey"
                        className="w-full rounded-2xl graffiti-input py-3 px-4 text-xs font-bold text-white focus:outline-none"
                      />
                      <MagneticButton
                        type="submit"
                        disabled={authLoading}
                        className="w-full rounded-2xl bg-[#CCFF00] py-3.5 text-xs font-extrabold text-black uppercase"
                      >
                        LOCK IN NEW PASSKEY
                      </MagneticButton>
                    </form>
                  )}

                  <button
                    type="button"
                    onClick={() => { setPortalMode("user"); setResetStep(1); setResetOtp(""); setOtpTimer(0); }}
                    className="flex w-full items-center justify-center gap-1.5 pt-2 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> BACK TO LOGIN
                  </button>
                </div>
              )}
            </TiltSpotlightCard>
          </div>
        </div>

        {/* Bottom Street-Art Ticker */}
        <div className="relative z-20">
          <GraffitiTicker
            items={[
              "NO SIDEBAR CLUTTER",
              "FLOATING 3D DOCK NAVIGATION",
              "DECRYPTED TEXT SCRAMBLE",
              "SPRAY-PAINT CURSOR PHYSICS"
            ]}
            bg="bg-[#FF007F]"
            textCol="text-white"
          />
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW 2A: DEDICATED CREATOR OPERATIONS STUDIO (FLOATING DOCK LAYOUT)
  // =========================================================
  if (isCreatorAdmin) {
    const filteredTickets = feedbackList.filter((t) =>
      ticketFilter === "All" ? true : (t.status || "Open") === ticketFilter
    );

    const creatorDockItems = [
      { id: "telemetry", label: "Telemetry Deck", icon: HardDrive, bg: "bg-[#FFBE0B]" },
      { id: "support", label: "Support Desk", icon: HelpCircle, count: adminData.open_tickets_count, bg: "bg-[#FF007F]" },
      { id: "users", label: "User Governance", icon: Shield, count: adminData.member_count, bg: "bg-[#00F0FF]" },
      { id: "audit", label: "Audit Stream", icon: Clock, bg: "bg-[#CCFF00]" }
    ];

    return (
      <div className="relative flex flex-col h-screen w-screen bg-halftone overflow-hidden">
        <SplashCursor />
        <ThreeGraffitiScene mode="admin" />

        {/* Top Floating Creator Header Bar */}
        <header className="relative z-20 mx-6 mt-4 px-6 py-4 rounded-3xl graffiti-card-pink flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFBE0B] border-2 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center text-black font-extrabold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-white">
                <DecryptedText text="CREATOR // OPS STUDIO" />
              </h1>
              <p className="font-mono-code text-[11px] text-[#FFBE0B]">
                {currentUser.email} • WORK & TELEMETRY ONLY
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MagneticButton
              onClick={handleExportAuditCsv}
              className="px-4 py-2.5 rounded-2xl bg-[#00F0FF] text-black text-xs font-extrabold uppercase flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export CSV
            </MagneticButton>
            <MagneticButton
              onClick={fetchWorkspace}
              className="px-4 py-2.5 rounded-2xl bg-[#CCFF00] text-black text-xs font-extrabold uppercase flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> Sync Live
            </MagneticButton>
            <MagneticButton
              onClick={handleSignOut}
              className="p-2.5 rounded-2xl bg-[#FF007F] text-white"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </MagneticButton>
          </div>
        </header>

        {/* Main Lenis Smooth Scroll Canvas */}
        <main ref={mainScrollRef} className="relative z-10 flex-1 overflow-y-auto px-6 pt-6 pb-28">
          <div ref={cascadeContainerRef} className="max-w-7xl mx-auto space-y-6">
            {uploadNotice && (
              <div className="graffiti-card rounded-2xl px-5 py-3 text-xs font-extrabold text-[#CCFF00] flex justify-between">
                <span>{uploadNotice}</span>
                <button onClick={() => setUploadNotice("")}><X className="w-4 h-4" /></button>
              </div>
            )}

            {creatorTab === "telemetry" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: "REGISTERED CREW", val: adminData.member_count, sub: `${adminData.pro_subscribers} Pro • ${adminData.linked_drives_count} Bound Drives`, bg: "bg-[#00F0FF]", variant: "cyan" },
                    { label: "FILES SORTED", val: adminData.total_files_classified, sub: `${adminData.active_files} Active • ${adminData.spam_files} Spam`, bg: "bg-[#CCFF00]", variant: "lime" },
                    { label: "OPEN TICKETS", val: adminData.open_tickets_count, sub: "Click Support Dock to reply", bg: "bg-[#FF007F]", variant: "pink" },
                    { label: "SQLITE WAL INDEX", val: `${adminData.total_storage_mb} MB`, sub: "Zero Server Bloat Active", bg: "bg-[#FFBE0B]", variant: "lime" }
                  ].map((k, i) => (
                    <TiltSpotlightCard key={i} variant={k.variant} className="rounded-3xl p-5 gsap-3d-item">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md border border-black font-mono-code text-[10px] font-extrabold text-black ${k.bg}`}>
                        {k.label}
                      </span>
                      <p className="text-4xl font-extrabold text-white mt-3">{k.val}</p>
                      <p className="text-xs font-bold text-slate-300 mt-1">{k.sub}</p>
                    </TiltSpotlightCard>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TiltSpotlightCard variant="cyan" className="rounded-3xl p-6 gsap-3d-item">
                    <h3 className="text-base font-extrabold uppercase text-[#00F0FF] mb-4">
                      Global AI Classification Breakdown
                    </h3>
                    <div className="space-y-2.5">
                      {(adminData.global_categories || []).map((c) => (
                        <div key={c.category} className="p-3 rounded-2xl bg-black/60 border-2 border-white/20 flex justify-between text-xs font-bold">
                          <span>{c.category}</span>
                          <span className="text-[#CCFF00] font-mono-code">{c.count} files ({c.size_kb} KB)</span>
                        </div>
                      ))}
                    </div>
                  </TiltSpotlightCard>

                  <TiltSpotlightCard variant="pink" className="rounded-3xl p-6 gsap-3d-item">
                    <h3 className="text-base font-extrabold uppercase text-[#FF007F] mb-4">
                      Live Security & Audit Stream
                    </h3>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {activity.slice(0, 8).map((act) => (
                        <div key={act.id} className="p-3 rounded-2xl bg-black/60 border-2 border-white/20 text-xs">
                          <div className="flex justify-between font-mono-code text-[#CCFF00] font-bold">
                            <span>{act.username}</span>
                            <span className="text-[10px] text-slate-400">{formatTimestamp(act.timestamp)}</span>
                          </div>
                          <p className="text-white font-extrabold mt-0.5">{act.action}</p>
                          <p className="text-[11px] text-slate-300">{act.details}</p>
                        </div>
                      ))}
                    </div>
                  </TiltSpotlightCard>
                </div>
              </>
            )}

            {creatorTab === "support" && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  {["All", "Open", "Resolved"].map((st) => (
                    <MagneticButton
                      key={st}
                      onClick={() => setTicketFilter(st)}
                      className={`px-4 py-2 rounded-2xl text-xs font-extrabold uppercase ${
                        ticketFilter === st ? "bg-[#CCFF00] text-black" : "bg-[#181030] text-white border-white"
                      }`}
                    >
                      {st} Tickets
                    </MagneticButton>
                  ))}
                </div>
                {filteredTickets.map((t) => (
                  <TiltSpotlightCard key={t.id} variant="pink" maxTilt={4} className="rounded-3xl p-6 space-y-3 gsap-3d-item">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-white">
                        #{t.id} • {t.username} ({t.user_email}) — <span className="text-[#00F0FF]">{t.category}</span>
                      </span>
                      <span className="px-3 py-0.5 rounded-full bg-[#CCFF00] text-black font-extrabold">
                        {t.status || "Open"}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-black/70 border-2 border-white/30 text-xs font-bold text-white">
                      {t.message}
                    </div>
                    {t.admin_reply && (
                      <div className="p-3.5 rounded-2xl bg-[#00F0FF]/20 border-2 border-[#00F0FF] text-xs text-[#00F0FF] font-bold">
                        <strong>CREATOR REPLY:</strong> {t.admin_reply}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={replyInputs[t.id] || ""}
                        onChange={(e) => setReplyInputs((p) => ({ ...p, [t.id]: e.target.value }))}
                        placeholder={`Drop official response to ${t.username}...`}
                        className="flex-1 rounded-2xl graffiti-input px-4 py-2.5 text-xs font-bold text-white focus:outline-none"
                      />
                      <MagneticButton
                        onClick={() => handleReplyTicket(t.id, "Resolved")}
                        className="bg-[#CCFF00] text-black px-5 py-2.5 rounded-2xl text-xs font-extrabold uppercase"
                      >
                        Send & Resolve
                      </MagneticButton>
                    </div>
                  </TiltSpotlightCard>
                ))}
              </div>
            )}

            {creatorTab === "users" && (
              <div className="graffiti-card rounded-3xl overflow-hidden gsap-3d-item">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/80 text-[#CCFF00] font-mono-code uppercase text-[11px] border-b-2 border-white">
                    <tr>
                      <th className="py-4 px-4">User</th>
                      <th className="py-4 px-4">Plan</th>
                      <th className="py-4 px-4">Identity-Bound Storage</th>
                      <th className="py-4 px-4">Sorted</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right">Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/15 font-bold">
                    {adminData.users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="py-3.5 px-4">{u.name} ({u.email})</td>
                        <td className="py-3.5 px-4 text-[#00F0FF]">{u.subscription_plan}</td>
                        <td className="py-3.5 px-4">{u.cloud_provider}</td>
                        <td className="py-3.5 px-4">{u.total_classified} files ({u.storage_kb} KB)</td>
                        <td className="py-3.5 px-4">{u.status}</td>
                        <td className="py-3.5 px-4 text-right">
                          {u.email.toLowerCase() !== CREATOR_EMAIL.toLowerCase() && (
                            <MagneticButton
                              onClick={() => handleToggleUserStatus(u)}
                              className="px-3 py-1 rounded-xl bg-[#FF007F] text-white text-[11px] font-extrabold"
                            >
                              {u.status === "Suspended" ? "Activate" : "Suspend"}
                            </MagneticButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {creatorTab === "audit" && (
              <div className="graffiti-card-cyan rounded-3xl overflow-hidden gsap-3d-item">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/80 text-[#00F0FF] font-mono-code uppercase text-[11px] border-b-2 border-white">
                    <tr>
                      <th className="py-4 px-4">Timestamp</th>
                      <th className="py-4 px-4">User</th>
                      <th className="py-4 px-4">Action</th>
                      <th className="py-4 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/15 font-bold">
                    {activity.map((act) => (
                      <tr key={act.id}>
                        <td className="py-3 px-4 font-mono-code text-slate-300">{formatTimestamp(act.timestamp)}</td>
                        <td className="py-3 px-4 text-white">{act.username}</td>
                        <td className="py-3 px-4 text-[#CCFF00]">{act.action}</td>
                        <td className="py-3 px-4 text-slate-300">{act.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Bottom Floating 3D Creator Dock */}
        <FloatingGraffitiDock
          items={creatorDockItems}
          activeId={creatorTab}
          onSelect={(id) => setCreatorTab(id)}
        />
      </div>
    );
  }

  // =========================================================
  // VIEW 2B: USER GRAFFITI 3D STUDIO (TOP HUD + FLOATING DOCK)
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
  const storagePercent = usedMb > 0 ? Math.max(Math.min(Math.round((usedMb / quotaMb) * 100), 100), 4) : 3;
  const quotaDisplayLabel = summary.cloud_linked
    ? `${usedMb} MB / ${(quotaMb / 1024).toFixed(0)} GB (${summary.cloud_email})`
    : `${usedMb} MB / 100 MB FREE`;

  const userDockItems = [
    { id: "library", label: "Vault", icon: Folder, bg: "bg-[#CCFF00]" },
    { id: "recent", label: "Recent", icon: Clock, bg: "bg-[#00F0FF]" },
    { id: "uploads", label: "Uploads", icon: Upload, count: summary.active_files_count, bg: "bg-[#FF007F]" },
    { id: "offline", label: "Offline", icon: CheckCircle2, count: summary.offline_files_count, bg: "bg-[#FFBE0B]" },
    { id: "bin", label: "Bin", icon: Trash2, count: summary.bin_files_count, bg: "bg-[#FF007F]" },
    { id: "spam", label: "Spam", icon: AlertOctagon, count: summary.spam_files_count, bg: "bg-[#FFBE0B]" },
    { id: "storage", label: "Cloud Bridge", icon: Cloud, bg: "bg-[#00F0FF]" },
    { id: "settings", label: "Rules", icon: Settings, bg: "bg-[#CCFF00]" },
    { id: "help", label: "Support", icon: HelpCircle, bg: "bg-[#FF007F]" }
  ];

  return (
    <div className="relative flex flex-col h-screen w-screen bg-halftone overflow-hidden">
      <SplashCursor />
      <ThreeGraffitiScene mode="user" />

      {/* 1. TOP FLOATING GRAFFITI HUD BAR (REPLACES TRADITIONAL HEADER & SIDEBAR) */}
      <header className="relative z-20 mx-4 md:mx-8 mt-4 px-5 py-3.5 rounded-3xl graffiti-card flex flex-wrap items-center justify-between gap-4">
        {/* Brand + Identity Lock Pill */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#CCFF00] border-2 border-black shadow-[4px_4px_0px_#FF007F] flex items-center justify-center text-black font-extrabold -rotate-3">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-tight text-white">
                <DecryptedText text="SMARTSORTER // 3D" />
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-[#FF007F] text-white font-mono-code text-[10px] font-extrabold border border-black">
                {summary.subscription_plan.toUpperCase()}
              </span>
            </div>
            <p className="font-mono-code text-[11px] text-[#00F0FF] truncate">
              {summary.cloud_linked ? `🔒 DRIVE BOUND: ${currentUser.email}` : `⚡ ${quotaDisplayLabel}`}
            </p>
          </div>
        </div>

        {/* Center Neon Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#CCFF00]" />
          <input
            type="text"
            placeholder="Search files, folders, or Gemini summaries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl graffiti-input pl-11 pr-4 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Right Action Stickers */}
        <div className="flex items-center gap-2.5">
          {summary.cloud_linked ? (
            <MagneticButton
              onClick={handleSyncCloudDrive}
              disabled={isSyncingCloud}
              className="px-3.5 py-2 rounded-2xl bg-[#00F0FF] text-black text-xs font-extrabold uppercase flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? "animate-spin" : ""}`} />
              <span>{isSyncingCloud ? "Syncing..." : "Sync Drive"}</span>
            </MagneticButton>
          ) : (
            <MagneticButton
              onClick={() => setCloudModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-[#FFBE0B] text-black text-xs font-extrabold uppercase flex items-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Link Gmail</span>
            </MagneticButton>
          )}

          {summary.active_files_count > 0 && (
            <MagneticButton
              onClick={() => setFolderAiTarget(selectedFolder)}
              className="px-3.5 py-2 rounded-2xl bg-[#8338EC] text-white text-xs font-extrabold uppercase flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#CCFF00]" />
              <span>Folder AI</span>
            </MagneticButton>
          )}

          <MagneticButton
            onClick={handleCreateCustomFolder}
            className="px-3 py-2 rounded-2xl bg-white text-black text-xs font-extrabold uppercase"
          >
            + Folder
          </MagneticButton>

          <MagneticButton
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-[#CCFF00] text-black text-xs font-extrabold uppercase flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Drop Files</span>
          </MagneticButton>

          <MagneticButton
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 rounded-2xl bg-[#FF007F] text-white"
          >
            <LogOut className="w-4 h-4" />
          </MagneticButton>
        </div>
      </header>

      {/* 2. LENIS SMOOTH-SCROLL 3D BENTO STAGE */}
      <main ref={mainScrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-28">
        <div ref={cascadeContainerRef} className="max-w-7xl mx-auto space-y-6">
          {uploadNotice && (
            <div className="graffiti-card-pink rounded-2xl px-5 py-3 text-xs font-extrabold text-white flex items-center justify-between">
              <span>{uploadNotice}</span>
              <button onClick={() => setUploadNotice("")}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* VIEWS: VAULT LIBRARY / RECENT / OFFLINE */}
          {(activeTab === "library" || activeTab === "recent" || activeTab === "offline") && (
            <div className="space-y-6">
              {/* Hero Banner Strip */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow-[3px_3px_0px_#000]">
                    <DecryptedText
                      text={
                        activeTab === "library"
                          ? "STREET-ART // SMART VAULT"
                          : activeTab === "recent"
                          ? "RECENT // DROP STREAM"
                          : "OFFLINE // PINNED CACHE"
                      }
                    />
                  </h2>
                  <p className="font-mono-code text-xs text-[#CCFF00]">
                    ACTIVE FOLDER: [{selectedFolder.toUpperCase()}] • {displayedDocs.length} ITEMS VISIBLE
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <MagneticButton
                    onClick={() => setStarredOnly(!starredOnly)}
                    className={`px-4 py-2 rounded-2xl text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                      starredOnly ? "bg-[#FFBE0B] text-black" : "bg-[#181030] text-white border-white"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${starredOnly ? "fill-black text-black" : "text-[#FFBE0B]"}`} />
                    <span>Starred</span>
                  </MagneticButton>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-2xl graffiti-input px-3.5 py-2 text-xs font-extrabold text-[#00F0FF] focus:outline-none"
                  >
                    <option value="starred">SORT: STARRED</option>
                    <option value="newest">SORT: NEWEST</option>
                    <option value="size">SORT: SIZE (KB)</option>
                    <option value="name">SORT: A–Z</option>
                  </select>
                </div>
              </div>

              {/* 3D Graffiti Sticker Folder Pills */}
              {activeTab === "library" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folderEntries.length > 0 ? (
                    folderEntries.map(([cat, count], idx) => {
                      const sw = GRAFFITI_SWATCHES[idx % GRAFFITI_SWATCHES.length];
                      const isSel = selectedFolder === cat;
                      return (
                        <TiltSpotlightCard
                          key={cat}
                          maxTilt={11}
                          variant={sw.variant}
                          onClick={() => setSelectedFolder(isSel ? "All" : cat)}
                          className={`rounded-3xl p-4 cursor-pointer gsap-3d-item ${
                            isSel ? "ring-4 ring-[#CCFF00]" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <span className={`p-2 rounded-xl border-2 border-black ${sw.bg} ${sw.text}`}>
                                <Folder className="w-4 h-4" />
                              </span>
                              <span className="text-xs font-extrabold uppercase tracking-wide text-white truncate">
                                {cat}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {count > 0 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFolderAiTarget(cat); }}
                                    className="p-1.5 rounded-xl bg-[#8338EC] text-white border border-black"
                                    title="Folder AI"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleExportFolderZip(cat, e)}
                                    className="p-1.5 rounded-xl bg-[#00F0FF] text-black border border-black"
                                    title="Export ZIP"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              <span className={`font-mono-code text-xs font-extrabold px-2.5 py-0.5 rounded-lg border-2 border-black ${sw.bg} ${sw.text}`}>
                                {count}
                              </span>
                            </div>
                          </div>
                        </TiltSpotlightCard>
                      );
                    })
                  ) : (
                    <div className="col-span-4 p-6 rounded-3xl graffiti-card text-center font-mono-code text-xs text-[#CCFF00]">
                      NO FOLDERS YET — CLICK &quot;DROP FILES&quot; OR &quot;+ FOLDER&quot; TO TAG YOUR VAULT!
                    </div>
                  )}
                </div>
              )}

              {/* 3D Graffiti Bento Document Cards */}
              {displayedDocs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {displayedDocs.map((doc, idx) => {
                    const sw = GRAFFITI_SWATCHES[idx % GRAFFITI_SWATCHES.length];
                    return (
                      <TiltSpotlightCard
                        key={doc.id}
                        maxTilt={12}
                        variant={sw.variant}
                        onClick={() => setPreviewDoc(doc)}
                        className="rounded-3xl p-5 cursor-pointer group gsap-3d-item"
                      >
                        <div className="flex flex-col justify-between h-full space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded-lg border-2 border-black font-mono-code text-[10px] font-extrabold uppercase ${sw.bg} ${sw.text}`}>
                              {doc.category}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStar(doc.id, e)}
                                className="p-1.5 rounded-lg bg-black/50 hover:bg-black"
                              >
                                <Star className={`w-3.5 h-3.5 ${doc.is_starred ? "fill-[#FFBE0B] text-[#FFBE0B]" : "text-slate-400"}`} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleToggleOffline(doc.id, e)}
                                className="p-1.5 rounded-lg bg-black/50 hover:bg-black"
                              >
                                <CheckCircle2 className={`w-3.5 h-3.5 ${doc.is_offline ? "text-[#CCFF00]" : "text-slate-500"}`} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleShareDocument(doc.id, e)}
                                className="p-1.5 rounded-lg bg-black/50 hover:bg-[#00F0FF] hover:text-black"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSingle(doc.id, doc.filename, false); }}
                                className="p-1.5 rounded-lg bg-black/50 hover:bg-[#FF007F]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <div className="w-12 h-12 rounded-2xl bg-black/70 border-2 border-white/30 flex items-center justify-center shrink-0">
                              {getFileIcon(doc.filename)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-extrabold text-white truncate" title={doc.filename}>
                                {doc.filename}
                              </p>
                              <p className="font-mono-code text-[10px] text-[#00F0FF]">
                                {doc.size_kb} KB • {doc.storage_source}
                              </p>
                            </div>
                          </div>

                          {doc.summary && (
                            <p className="text-xs text-slate-300 line-clamp-2 bg-black/50 p-2.5 rounded-xl border border-white/10">
                              {doc.summary}
                            </p>
                          )}
                        </div>
                      </TiltSpotlightCard>
                    );
                  })}
                </div>
              ) : (
                <TiltSpotlightCard variant="pink" className="rounded-3xl p-12 text-center gsap-3d-item">
                  <UploadCloud className="w-12 h-12 text-[#CCFF00] mx-auto mb-3" />
                  <p className="text-lg font-extrabold uppercase">VAULT SECTOR EMPTY</p>
                  <p className="font-mono-code text-xs text-slate-300 mt-1">
                    Click &quot;DROP FILES&quot; in the top HUD to unleash Gemini 2.5 Flash sorting!
                  </p>
                </TiltSpotlightCard>
              )}
            </div>
          )}

          {/* VIEWS: UPLOADS / BIN / SPAM */}
          {(activeTab === "uploads" || activeTab === "bin" || activeTab === "spam") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold uppercase">
                  <DecryptedText
                    text={
                      activeTab === "uploads"
                        ? "UPLOADS & DRIVE SYNC QUEUE"
                        : activeTab === "bin"
                        ? "RECOVERABLE BIN"
                        : "SHA-256 SPAM QUARANTINE"
                    }
                  />
                </h2>
                {activeTab === "bin" && documents.length > 0 && (
                  <MagneticButton
                    onClick={handleHardDeleteAll}
                    className="px-4 py-2 rounded-2xl bg-[#FF007F] text-white text-xs font-extrabold uppercase"
                  >
                    Wipe Bin Forever
                  </MagneticButton>
                )}
              </div>

              <div className="graffiti-card rounded-3xl overflow-hidden gsap-3d-item">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/80 text-[#CCFF00] font-mono-code uppercase text-[11px] border-b-2 border-white">
                    <tr>
                      <th className="py-4 px-4">File & Summary</th>
                      <th className="py-4 px-4">Folder Override</th>
                      <th className="py-4 px-4">Footprint / Hash</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/15 font-bold">
                    {documents.length > 0 ? (
                      documents.map((d) => (
                        <tr key={d.id} className="hover:bg-white/5">
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-extrabold text-white truncate">{d.filename}</p>
                            <p className="text-[11px] text-slate-300 truncate">{d.summary}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={d.category}
                              onChange={(e) => handleCategoryChange(d.id, e.target.value)}
                              className="rounded-xl graffiti-input px-2.5 py-1.5 text-xs font-extrabold text-[#CCFF00]"
                            >
                              {allCategoryOptions.map((cOpt) => (
                                <option key={cOpt} value={cOpt}>{cOpt}</option>
                              ))}
                              <option value="__NEW_CUSTOM__">+ Custom Folder...</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 font-mono-code text-[11px] text-[#00F0FF]">
                            {d.size_kb} KB {d.file_hash && <span>• #{d.file_hash}</span>}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {activeTab === "bin" ? (
                              <>
                                <MagneticButton onClick={() => handleRestoreSingle(d.id)} className="px-3 py-1 rounded-xl bg-[#CCFF00] text-black font-extrabold">
                                  Restore
                                </MagneticButton>
                                <MagneticButton onClick={() => handleDeleteSingle(d.id, d.filename, true)} className="px-3 py-1 rounded-xl bg-[#FF007F] text-white font-extrabold">
                                  Purge
                                </MagneticButton>
                              </>
                            ) : activeTab === "spam" ? (
                              <>
                                <MagneticButton onClick={() => handleToggleSpam(d.id)} className="px-3 py-1 rounded-xl bg-[#00F0FF] text-black font-extrabold">
                                  Restore
                                </MagneticButton>
                                <MagneticButton onClick={() => handleDeleteSingle(d.id, d.filename, true)} className="px-3 py-1 rounded-xl bg-[#FF007F] text-white font-extrabold">
                                  Purge
                                </MagneticButton>
                              </>
                            ) : (
                              <>
                                <MagneticButton onClick={() => setPreviewDoc(d)} className="p-1.5 rounded-xl bg-[#00F0FF] text-black">
                                  <Eye className="w-3.5 h-3.5" />
                                </MagneticButton>
                                <MagneticButton onClick={() => handleToggleSpam(d.id)} className="p-1.5 rounded-xl bg-[#FFBE0B] text-black">
                                  <AlertOctagon className="w-3.5 h-3.5" />
                                </MagneticButton>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-10 text-center font-mono-code text-slate-400">
                          NO RECORDS IN THIS SECTOR.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: CLOUD BRIDGE & MAINTENANCE SUBSCRIPTIONS */}
          {activeTab === "storage" && (
            <div className="space-y-6">
              <TiltSpotlightCard variant="cyan" maxTilt={5} className="rounded-3xl p-6 gsap-3d-item">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-lg bg-[#00F0FF] text-black font-mono-code text-xs font-extrabold border-2 border-black">
                      1-TO-1 GMAIL IDENTITY LOCK ACTIVE
                    </span>
                    <h3 className="text-2xl font-extrabold uppercase mt-2">
                      {summary.cloud_linked
                        ? `${summary.cloud_provider} BOUND TO ${currentUser.email}`
                        : `ISOLATED 100 MB SANDBOX (${currentUser.email})`}
                    </h3>
                    <div className="w-full max-w-md h-4 rounded-full bg-black border-2 border-white overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#CCFF00] via-[#00F0FF] to-[#FF007F]"
                        style={{ width: `${storagePercent}%` }}
                      />
                    </div>
                    <p className="font-mono-code text-xs text-[#CCFF00]">{quotaDisplayLabel}</p>
                  </div>
                  {summary.cloud_linked && (
                    <MagneticButton onClick={handleUnlinkCloudDrive} className="px-4 py-2.5 rounded-2xl bg-[#FF007F] text-white text-xs font-extrabold uppercase">
                      Unlink Drive
                    </MagneticButton>
                  )}
                </div>
              </TiltSpotlightCard>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: "Free", price: "FREE // 100 MB", bg: "bg-[#00F0FF]", variant: "cyan", perks: ["100 MB Isolated Quota", "Gemini Flash Sorting", "SHA-256 Spam Filter"] },
                  { name: "Cloud Bridge Pro", price: "₹199 // MONTH", bg: "bg-[#CCFF00]", variant: "lime", perks: ["Binds " + currentUser.email, "Auto-Sorts Your Google Drive", "SQLite WAL Maintenance"] },
                  { name: "Enterprise Auto-Sort", price: "₹499 // MONTH", bg: "bg-[#FF007F]", variant: "pink", perks: ["1-to-1 Cryptographic Lock", "High-Rate Gemini Synthesis", "Priority Creator SLA"] }
                ].map((tier) => (
                  <TiltSpotlightCard key={tier.name} variant={tier.variant} maxTilt={9} className="rounded-3xl p-6 flex flex-col justify-between gsap-3d-item">
                    <div>
                      <span className={`px-3 py-1 rounded-lg border-2 border-black font-mono-code text-xs font-extrabold text-black ${tier.bg}`}>
                        {tier.name.toUpperCase()}
                      </span>
                      <h4 className="text-3xl font-extrabold text-white mt-4">{tier.price}</h4>
                      <ul className="mt-4 space-y-2 text-xs font-bold text-slate-200">
                        {tier.perks.map((p, i) => <li key={i}>★ {p}</li>)}
                      </ul>
                    </div>
                    <MagneticButton
                      onClick={() => handleActivateSubscription(tier.name)}
                      className={`mt-6 w-full py-3 rounded-2xl text-xs font-extrabold uppercase text-black ${tier.bg}`}
                    >
                      {summary.subscription_plan === tier.name ? "✓ ACTIVE PASS" : `ACTIVATE ${tier.name}`}
                    </MagneticButton>
                  </TiltSpotlightCard>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {activeTab === "settings" && (
            <TiltSpotlightCard variant="lime" maxTilt={5} className="rounded-3xl p-6 max-w-2xl space-y-4 gsap-3d-item">
              <h2 className="text-xl font-extrabold uppercase text-[#CCFF00]">Vault Rules & Security Lock</h2>
              <div className="p-4 rounded-2xl bg-black/70 border-2 border-white/30 flex justify-between items-center text-xs font-bold">
                <span>1-to-1 Gmail Drive Binding ({currentUser.email})</span>
                <span className="px-2.5 py-1 rounded bg-[#CCFF00] text-black font-mono-code font-extrabold">LOCKED</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/70 border-2 border-white/30 flex justify-between items-center text-xs font-bold">
                <span>Auto-Sort Linked Drive by Extension & Gemini AI</span>
                <input type="checkbox" checked={autoSortExt} onChange={(e) => setAutoSortExt(e.target.checked)} className="w-5 h-5 accent-[#CCFF00]" />
              </div>
              <div className="p-4 rounded-2xl bg-black/70 border-2 border-white/30 flex justify-between items-center text-xs font-bold">
                <span>Generate 1-Line AI Summaries on Drop</span>
                <input type="checkbox" checked={aiDeepSummary} onChange={(e) => setAiDeepSummary(e.target.checked)} className="w-5 h-5 accent-[#FF007F]" />
              </div>
            </TiltSpotlightCard>
          )}

          {/* VIEW: SUPPORT & FEEDBACK */}
          {activeTab === "help" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TiltSpotlightCard variant="pink" maxTilt={6} className="rounded-3xl p-6 space-y-4 gsap-3d-item">
                <h3 className="text-lg font-extrabold uppercase text-[#FF007F]">Ping Creator Support Desk</h3>
                <form onSubmit={handleSubmitFeedback} className="space-y-3">
                  <select
                    value={fbCategory}
                    onChange={(e) => setFbCategory(e.target.value)}
                    className="w-full rounded-2xl graffiti-input px-3.5 py-2.5 text-xs font-extrabold text-[#CCFF00]"
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
                    placeholder="Drop your issue or feature request..."
                    className="w-full rounded-2xl graffiti-input p-3.5 text-xs font-bold text-white focus:outline-none"
                  />
                  <MagneticButton type="submit" className="px-5 py-3 rounded-2xl bg-[#CCFF00] text-black text-xs font-extrabold uppercase">
                    Transmit Ticket →
                  </MagneticButton>
                </form>
              </TiltSpotlightCard>

              <TiltSpotlightCard variant="cyan" maxTilt={6} className="rounded-3xl p-6 space-y-3 gsap-3d-item">
                <h3 className="text-lg font-extrabold uppercase text-[#00F0FF]">
                  My Tickets & Creator Replies ({feedbackList.length})
                </h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {feedbackList.map((fb) => (
                    <div key={fb.id} className="p-3.5 rounded-2xl bg-black/70 border-2 border-white/25 text-xs space-y-1.5">
                      <div className="flex justify-between font-mono-code font-extrabold text-[#CCFF00]">
                        <span>#{fb.id} • {fb.category}</span>
                        <span>{fb.status || "Open"}</span>
                      </div>
                      <p className="text-white font-bold">{fb.message}</p>
                      {fb.admin_reply && (
                        <div className="p-2.5 rounded-xl bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF] font-bold">
                          <strong>CREATOR REPLY:</strong> {fb.admin_reply}
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

      {/* 3. REACT BITS FLOATING BOTTOM 3D DOCK */}
      <FloatingGraffitiDock
        items={userDockItems}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id)}
      />

      {/* MODAL: IDENTITY-LOCKED CLOUD DRIVE LINK */}
      {cloudModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <TiltSpotlightCard variant="cyan" maxTilt={5} className="rounded-3xl w-full max-w-md p-6 relative">
            <button onClick={() => setCloudModalOpen(false)} className="absolute right-5 top-5 text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-extrabold uppercase text-[#00F0FF] mb-2">1-to-1 Gmail Drive Lock</h3>
            <p className="text-xs font-bold text-slate-300 mb-4">
              Only the Google Drive owned by your login Gmail ({currentUser.email}) can be bound.
            </p>
            {summary.subscription_plan === "Free" ? (
              <div className="p-4 rounded-2xl bg-black/80 border-2 border-[#FF007F] space-y-3">
                <p className="text-xs text-[#FF007F] font-extrabold uppercase">🔒 Maintenance Pass Required</p>
                <MagneticButton
                  onClick={() => handleActivateSubscription("Cloud Bridge Pro")}
                  className="w-full py-3 rounded-2xl bg-[#CCFF00] text-black text-xs font-extrabold uppercase"
                >
                  Unlock Cloud Bridge Pro (₹199/mo) →
                </MagneticButton>
              </div>
            ) : (
              <form onSubmit={handleLinkCloudDrive} className="space-y-4">
                <select
                  value={cloudProviderInput}
                  onChange={(e) => setCloudProviderInput(e.target.value)}
                  className="w-full rounded-2xl graffiti-input px-3.5 py-2.5 text-xs font-extrabold text-white"
                >
                  <option value="Google Drive">Google Drive (Gmail Bound)</option>
                  <option value="OneDrive">Microsoft OneDrive (Email Bound)</option>
                </select>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={currentUser.email}
                  className="w-full rounded-2xl graffiti-input px-3.5 py-2.5 text-xs text-[#CCFF00] font-mono-code font-extrabold cursor-not-allowed"
                />
                <MagneticButton type="submit" className="w-full py-3 rounded-2xl bg-[#00F0FF] text-black text-xs font-extrabold uppercase">
                  Verify Identity & Bind Drive
                </MagneticButton>
              </form>
            )}
          </TiltSpotlightCard>
        </div>
      )}

      {/* MODAL: UPLOAD FILES */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <TiltSpotlightCard variant="lime" maxTilt={5} className="rounded-3xl w-full max-w-md p-6 relative">
            <button onClick={() => setUploadModalOpen(false)} className="absolute right-5 top-5 text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-extrabold uppercase text-[#CCFF00] mb-1">Drop Files Into Vault</h3>
            <p className="font-mono-code text-xs text-[#00F0FF] mb-4">{quotaDisplayLabel}</p>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="rounded-2xl graffiti-input p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-white file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-2 file:border-black file:text-xs file:font-extrabold file:bg-[#CCFF00] file:text-black cursor-pointer"
                />
              </div>
              <MagneticButton
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full py-3 rounded-2xl bg-[#FF007F] text-white text-xs font-extrabold uppercase"
              >
                {isUploading ? "SPRAYING & SORTING..." : `SORT ${selectedFiles.length} FILE(S)`}
              </MagneticButton>
            </form>
          </TiltSpotlightCard>
        </div>
      )}

      {/* MODAL: SPLIT-SCREEN DOCUMENT PREVIEW + ASK GEMINI */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="graffiti-card rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-white bg-black/70">
              <div className="flex items-center gap-3 overflow-hidden">
                {getFileIcon(previewDoc.filename)}
                <div className="overflow-hidden">
                  <h3 className="text-sm font-extrabold text-white truncate">{previewDoc.filename}</h3>
                  <p className="font-mono-code text-[11px] text-[#CCFF00] truncate">{previewDoc.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MagneticButton onClick={() => handleDownloadFile(previewDoc.id)} className="px-3.5 py-1.5 rounded-xl bg-[#CCFF00] text-black text-xs font-extrabold">
                  Download
                </MagneticButton>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-white hover:text-[#FF007F]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 bg-black/80 flex items-center justify-center p-4">
                {["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(previewDoc.filename.split(".").pop().toLowerCase()) ? (
                  <img src={`${API_BASE}/documents/${previewDoc.id}/file?download=false`} alt={previewDoc.filename} className="max-h-full max-w-full object-contain rounded-xl border-2 border-white" />
                ) : (
                  <iframe title={previewDoc.filename} src={`${API_BASE}/documents/${previewDoc.id}/file?download=false`} className="w-full h-full rounded-xl bg-white border-2 border-black" />
                )}
              </div>

              <div className="w-80 md:w-96 border-l-2 border-white bg-[#120b24] flex flex-col justify-between p-4">
                <div className="pb-3 border-b border-white/20">
                  <div className="flex justify-between items-center">
                    <span className="font-mono-code text-xs font-extrabold text-[#CCFF00]">⚡ ASK GEMINI AI</span>
                    <button onClick={() => handleExportNotesMarkdown(previewDoc.filename, qaMessages)} className="px-2.5 py-1 rounded-lg bg-[#00F0FF] text-black text-[10px] font-extrabold">
                      💾 SAVE .MD
                    </button>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => handleAskDocument("Summarize key points.")} className="px-2.5 py-1 rounded-lg bg-[#FF007F] text-white text-[10px] font-extrabold">📄 Summarize</button>
                    <button onClick={() => handleAskDocument("Generate 3 quiz questions.")} className="px-2.5 py-1 rounded-lg bg-[#FFBE0B] text-black text-[10px] font-extrabold">📝 Quiz Me</button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 py-3">
                  {qaMessages.map((m, idx) => (
                    <div key={idx} className={`p-3 rounded-2xl text-xs font-bold whitespace-pre-wrap border-2 border-black ${m.role === "user" ? "bg-[#CCFF00] text-black ml-6" : "bg-black/80 text-white border-white/30 mr-2"}`}>
                      {m.text}
                    </div>
                  ))}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAskDocument(); }} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                    placeholder="Ask Gemini..."
                    className="flex-1 rounded-2xl graffiti-input px-3.5 py-2 text-xs font-bold text-white focus:outline-none"
                  />
                  <MagneticButton type="submit" className="px-4 py-2 rounded-2xl bg-[#CCFF00] text-black text-xs font-extrabold">Ask</MagneticButton>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASK FOLDER AI */}
      {folderAiTarget && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="graffiti-card-pink rounded-3xl w-full max-w-2xl h-[75vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-white bg-black/70">
              <h3 className="text-sm font-extrabold uppercase text-[#CCFF00]">🔥 FOLDER SYNTHESIS // {folderAiTarget}</h3>
              <button onClick={() => setFolderAiTarget(null)}><X className="w-5 h-5 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 p-6">
              {folderAiMessages.map((m, idx) => (
                <div key={idx} className={`p-3.5 rounded-2xl text-xs font-bold whitespace-pre-wrap border-2 border-black ${m.role === "user" ? "bg-[#00F0FF] text-black ml-10" : "bg-black/80 text-white border-white/30 mr-6"}`}>
                  {m.text}
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAskFolderAi(); }} className="p-4 border-t-2 border-white bg-black/70 flex gap-2">
              <input
                type="text"
                value={folderAiQuestion}
                onChange={(e) => setFolderAiQuestion(e.target.value)}
                placeholder={`Synthesize all files in "${folderAiTarget}"...`}
                className="flex-1 rounded-2xl graffiti-input px-4 py-2.5 text-xs font-bold text-white focus:outline-none"
              />
              <MagneticButton type="submit" className="px-4 py-2.5 rounded-2xl bg-[#CCFF00] text-black text-xs font-extrabold uppercase">Synthesize</MagneticButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}