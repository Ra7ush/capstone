import React, { useState } from "react";
import { moderationApi } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  FileText,
  User,
  Image as ImageIcon,
  ShieldAlert,
  CheckCircle,
  Clock,
  Zap,
  X,
  Send,
  Ban,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import PagerLoader from "../components/PagerLoader";
import { useRealtimeSync } from "../hooks/useRealtimeSync";

function Moderations() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [resolutionModal, setResolutionModal] = useState({
    isOpen: false,
    report: null,
    notes: "",
    action: "dismiss", // default action
  });

  // --- Real-Time Sync ---
  useRealtimeSync("moderation_reports", "moderations");
  // ----------------------

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["moderations"],
    queryFn: moderationApi.getAllModerations,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, admin_notes, action }) =>
      moderationApi.updateModeration(id, { status, admin_notes, action }),
    onSuccess: ({ message }) => {
      toast.success(message || "Moderation protocol executed");
      queryClient.invalidateQueries({ queryKey: ["moderations"] });
      setResolutionModal({
        isOpen: false,
        report: null,
        notes: "",
        action: "dismiss",
      });
    },
    onError: () => toast.error("Protocol failure"),
  });

  const handleResolveClick = (report) => {
    setResolutionModal({
      isOpen: true,
      report,
      notes: "",
      action: "dismiss",
    });
  };

  const confirmResolution = (e) => {
    e.preventDefault();
    if (!resolutionModal.report) return;

    updateMutation.mutate({
      id: resolutionModal.report.id,
      status: "resolved",
      admin_notes: resolutionModal.notes,
      action: resolutionModal.action,
    });
  };

  const reports = response?.data || [];

  const filteredReports = reports.filter((report) => {
    if (filter === "all") return true;
    if (filter === "banned")
      return report.reported_user?.status?.toLowerCase() === "banned";
    return report.status?.toLowerCase() === filter;
  });

  const getIcon = (type) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("comment")) return <MessageSquare size={18} />;
    if (t.includes("post")) return <FileText size={18} />;
    if (t.includes("profile")) return <User size={18} />;
    if (t.includes("image")) return <ImageIcon size={18} />;
    return <ShieldAlert size={18} />;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return "text-[#00A86B] bg-[#00A86B]/10 border-[#00A86B]/20";
      case "pending":
        return "text-[#FFB000] bg-[#FFB000]/10 border-[#FFB000]/20";
      case "reviewing":
        return "text-[#0066FF] bg-[#0066FF]/10 border-[#0066FF]/20";
      default:
        return "text-gray-400 bg-gray-50 border-gray-100";
    }
  };

  const getUserStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "banned":
        return {
          color: "text-red-600 bg-red-50 border-red-200",
          icon: <Ban size={12} />,
          label: "Banned",
        };
      case "suspended":
        return {
          color: "text-orange-600 bg-orange-50 border-orange-200",
          icon: <AlertTriangle size={12} />,
          label: "Suspended",
        };
      default:
        return null; // Don't show badge for active users
    }
  };

  const getBadgeStyle = (type) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("comment")) return "bg-blue-50 text-blue-600";
    if (t.includes("post")) return "bg-purple-50 text-purple-600";
    if (t.includes("profile")) return "bg-orange-50 text-orange-600";
    if (t.includes("image")) return "bg-pink-50 text-pink-600";
    return "bg-gray-50 text-gray-600";
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="bg-red-50 p-4 rounded-full text-red-500 border border-red-100">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-xl font-black text-black">Signal Lost</h2>
        <p className="text-gray-400 text-sm font-medium">
          Unable to establish connection with moderation feed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {(isLoading || updateMutation.isPending) && (
        <PagerLoader message="Scanning content streams..." />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-black tracking-tight leading-none">
            Content Moderation
          </h1>
          <p className="text-gray-400 font-bold text-lg">
            Review flagged content to maintain ecosystem integrity.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm h-16">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-pulse"></div>
            <span className="text-[11px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap size={14} className="text-[#FF4D00]" />
              Live Feed
            </span>
          </div>

          <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex gap-1">
            {["all", "pending", "reviewing", "resolved", "banned"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filter === f
                    ? f === "banned"
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/10"
                      : "bg-black text-white shadow-lg shadow-black/10"
                    : "text-gray-400 hover:text-black hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="group bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getBadgeStyle(
                    report.type_display
                  )}`}
                >
                  {getIcon(report.type_display)}
                </div>
                <div>
                  <h3 className="font-black text-lg text-black leading-tight">
                    {report.type_display}
                  </h3>
                  <p className="text-[10px] font-black text-[#6366f1] uppercase tracking-widest mt-1">
                    {report.report_number_display}
                  </p>
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-xl border ${getStatusColor(
                  report.status
                )} font-black text-[10px] uppercase tracking-widest`}
              >
                {report.status}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-3 mb-6">
              <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                Reason
              </div>
              <div className="flex items-center gap-2 text-red-500 font-bold">
                <ShieldAlert size={16} />
                {report.reason}
              </div>
            </div>

            {/* Content Snippet */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
              <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                Content Snippet:
              </div>
              <p className="text-gray-600 font-medium text-sm italic leading-relaxed">
                "{report.content_snippet}"
              </p>
            </div>

            <div className="divider opacity-50 my-0"></div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-400 border border-white shadow-sm">
                  {report.reported_user.avatar_initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-black">
                      {report.reported_user.name}
                    </span>
                    {getUserStatusBadge(report.reported_user.status) && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          getUserStatusBadge(report.reported_user.status).color
                        }`}
                      >
                        {getUserStatusBadge(report.reported_user.status).icon}
                        {getUserStatusBadge(report.reported_user.status).label}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-gray-300 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(report.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {report.status !== "RESOLVED" &&
                  report.reported_user.status !== "banned" && (
                    <button
                      onClick={() => handleResolveClick(report)}
                      className="h-12 px-4 rounded-xl border border-gray-100 flex items-center justify-center text-gray-300 hover:bg-[#00A86B] hover:text-white hover:border-[#00A86B] transition-all gap-2 font-black text-xs uppercase tracking-widest"
                      title="Review & Resolve"
                    >
                      <CheckCircle size={18} />
                      Review & Action
                    </button>
                  )}
                {report.reported_user.status === "banned" && (
                  <div className="h-12 px-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 gap-2 font-black text-xs uppercase tracking-widest">
                    <Ban size={16} />
                    User Banned
                  </div>
                )}
                {report.reported_user.status === "suspended" &&
                  report.status === "RESOLVED" && (
                    <div className="h-12 px-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-500 gap-2 font-black text-xs uppercase tracking-widest">
                      <AlertTriangle size={16} />
                      Suspended
                    </div>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-gray-50">
          <div className="bg-gray-50 p-6 rounded-full text-gray-300 mb-6">
            <CheckCircle size={40} />
          </div>
          <h3 className="text-xl font-black text-black mb-2">
            All Clear, Admin.
          </h3>
          <p className="text-gray-400">No active reports in this category.</p>
        </div>
      )}

      {/* Resolution Modal */}
      {resolutionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setResolutionModal({
                isOpen: false,
                report: null,
                notes: "",
                action: "dismiss",
              })
            }
          ></div>

          <div className="bg-white rounded-[2.5rem] shadow-[0_25px_100px_rgba(0,0,0,0.2)] border border-gray-100 w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-[#00A86B] text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-black tracking-tight leading-none mb-1">
                    Resolve Report
                  </h2>
                  <p className="text-[10px] font-black text-[#00A86B] uppercase tracking-widest">
                    {resolutionModal.report?.report_number_display}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setResolutionModal({
                    isOpen: false,
                    report: null,
                    notes: "",
                    action: "dismiss",
                  })
                }
                className="btn btn-ghost btn-circle btn-sm text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={confirmResolution} className="p-10 space-y-6">
              {/* Action Selection */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setResolutionModal({
                      ...resolutionModal,
                      action: "dismiss",
                    })
                  }
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 ${
                    resolutionModal.action === "dismiss"
                      ? "bg-black text-white border-black shadow-lg"
                      : "bg-white text-gray-400 border-gray-100 hover:border-black/10"
                  }`}
                >
                  <CheckCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Dismiss
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResolutionModal({
                      ...resolutionModal,
                      action: "suspend",
                    })
                  }
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 ${
                    resolutionModal.action === "suspend"
                      ? "bg-[#FFB000] text-white border-[#FFB000] shadow-lg"
                      : "bg-white text-gray-400 border-gray-100 hover:border-[#FFB000]/30"
                  }`}
                >
                  <Clock size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Suspend 2w
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResolutionModal({ ...resolutionModal, action: "ban" })
                  }
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 ${
                    resolutionModal.action === "ban"
                      ? "bg-[#FF4D00] text-white border-[#FF4D00] shadow-lg"
                      : "bg-white text-gray-400 border-gray-100 hover:border-[#FF4D00]/30"
                  }`}
                >
                  <ShieldAlert size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Hard Ban
                  </span>
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  Administrator Notes
                </label>
                <textarea
                  className="textarea textarea-bordered bg-gray-50 border-gray-100 rounded-2xl w-full h-32 focus:ring-0 focus:border-black font-medium text-black placeholder:text-gray-300 resize-none"
                  placeholder="Enter details about this resolution decision..."
                  value={resolutionModal.notes}
                  onChange={(e) =>
                    setResolutionModal({
                      ...resolutionModal,
                      notes: e.target.value,
                    })
                  }
                  required
                ></textarea>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setResolutionModal({
                      isOpen: false,
                      report: null,
                      notes: "",
                      action: "dismiss",
                    })
                  }
                  className="btn btn-ghost flex-1 h-16 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black hover:bg-gray-50 transition-all border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className={`btn flex-[2] h-16 rounded-2xl  text-white border-none shadow-2xl transition-all duration-300 gap-3 text-xs font-black uppercase tracking-widest ${
                    updateMutation.isPending ? "loading" : ""
                  } ${
                    resolutionModal.action === "ban"
                      ? "bg-[#FF4D00] hover:bg-[#CC3E00] shadow-[#FF4D00]/20"
                      : resolutionModal.action === "suspend"
                      ? "bg-[#FFB000] hover:bg-[#E59E00] shadow-[#FFB000]/20"
                      : "bg-[#00A86B] hover:bg-[#008F5B] shadow-[#00A86B]/20"
                  }`}
                >
                  {!updateMutation.isPending && <Send size={18} />}
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Moderations;
