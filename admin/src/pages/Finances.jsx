import React from "react";
import { payoutApi } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  History,
  PieChart,
  Activity,
  Check,
  X,
  AlertTriangle,
  ShieldCheck,
  Zap,
} from "lucide-react";
import PagerLoader from "../components/PagerLoader";
import { useRealtimeSync } from "../hooks/useRealtimeSync";

function Finances() {
  const queryClient = useQueryClient();

  // --- Real-Time Synchronization ---
  // Listen to payouts table and invalidate both queries when changes occur
  useRealtimeSync("payouts", ["payout-history", "payout-stats"]);
  // Listen to creators table for balance changes that affect both stats and history
  useRealtimeSync("creators", ["payout-stats", "payout-history"]);
  // ---------------------------------
  const [confirmation, setConfirmation] = React.useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning", // warning or success
  });

  const {
    data: statsResponse,
    isLoading: isLoadingStats,
    error: errorStats,
  } = useQuery({
    queryKey: ["payout-stats"],
    queryFn: payoutApi.getAllFinancialsStatus,
  });

  const {
    data: historyResponse,
    isLoading: isLoadingHistory,
    error: errorHistory,
  } = useQuery({
    queryKey: ["payout-history"],
    queryFn: payoutApi.getTransactionsHistory,
  });

  const processAllPayoutsMutation = useMutation({
    mutationFn: payoutApi.processAllPayouts,
    onSuccess: () => {
      toast.success("Mass payout synchronization complete");
      queryClient.invalidateQueries({ queryKey: ["payout-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payout-history"] });
    },
    onError: (error) => {
      const errorObj = error.response?.data?.error;
      const errorMsg =
        typeof errorObj === "string"
          ? errorObj
          : errorObj?.message || error.message || "Finance protocol failure";
      toast.error(errorMsg);
    },
  });

  const processSinglePayoutMutation = useMutation({
    mutationFn: (id) => payoutApi.processSinglePayout(id),
    onSuccess: () => {
      toast.success("Individual payout settled successfully");
      queryClient.invalidateQueries({ queryKey: ["payout-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payout-history"] });
    },
    onError: (error) => {
      const errorObj = error.response?.data?.error;
      const errorMsg =
        typeof errorObj === "string"
          ? errorObj
          : errorObj?.message || error.message || "Payout settlement failed";
      toast.error(errorMsg);
    },
  });

  const stats = statsResponse?.data || {};
  const history = historyResponse?.data || [];

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val || 0);

  if (errorStats || errorHistory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-10 bg-white rounded-[3rem] border border-gray-100">
        <div className="bg-red-50 p-6 rounded-full text-red-500 mb-6">
          <Activity size={48} />
        </div>
        <h2 className="text-2xl font-black text-black mb-2">
          Financial Feed Interrupted
        </h2>
        <p className="text-gray-400 font-bold max-w-md">
          We encountered a synchronization error while fetching the protocol's
          financial data.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn mt-8 bg-black text-white hover:bg-gray-900 border-none rounded-2xl px-8 h-12 font-black uppercase text-xs tracking-widest"
        >
          Retry Protocol
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {(processAllPayoutsMutation.isPending ||
        (isLoadingStats && !statsResponse)) && (
        <PagerLoader message="Calculating financial equilibrium..." />
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-black tracking-tight leading-none">
            Financials & Payouts
          </h1>
          <p className="text-gray-400 font-bold text-lg">
            Manage creator payouts and platform transactions.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm h-16">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-pulse"></div>
            <span className="text-[11px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap size={14} className="text-[#FF4D00]" />
              Live Sync
            </span>
          </div>

          <button
            onClick={() => {
              setConfirmation({
                isOpen: true,
                title: "Execute Mass Settlement",
                message:
                  "This will process all pending transactions and synchronize the financial ledger. This action cannot be undone.",
                onConfirm: () => processAllPayoutsMutation.mutate(),
                type: "warning",
              });
            }}
            disabled={processAllPayoutsMutation.isPending}
            className="btn bg-[#00A86B] hover:bg-[#008F5B] text-white border-none rounded-2xl px-8 h-16 shadow-[0_15px_30px_rgba(0,168,107,0.2)] flex items-center gap-3 transition-all active:scale-95 group font-black uppercase text-xs tracking-widest disabled:opacity-50"
          >
            <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
            Process All Payouts
          </button>
        </div>
      </div>

      {/* Statistics Hero Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Pending Payouts */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-50 relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                Pending Payouts
              </p>
              <h3 className="text-4xl font-black text-black tracking-tighter">
                {formatCurrency(stats.pending_payouts)}
              </h3>
              <div className="flex items-center gap-2 text-[#FF4D00] font-black text-[10px] uppercase tracking-widest bg-orange-50 w-fit px-3 py-1.5 rounded-full border border-orange-100/50">
                <Clock size={12} strokeWidth={3} />
                Due this Friday
              </div>
            </div>
            <div className="bg-orange-50/50 p-5 rounded-[2rem] text-orange-400 group-hover:scale-110 transition-transform duration-500">
              <Clock size={32} />
            </div>
          </div>
        </div>

        {/* Paid Last 30 Days */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-50 relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                Paid Last 30 Days
              </p>
              <h3 className="text-4xl font-black text-black tracking-tighter">
                {formatCurrency(stats.paid_last_30_days)}
              </h3>
              <div className="flex items-center gap-2 text-[#00A86B] font-black text-[10px] uppercase tracking-widest bg-green-50 w-fit px-3 py-1.5 rounded-full border border-green-100/50">
                <TrendingUp size={12} strokeWidth={3} />
                +12% vs last month
              </div>
            </div>
            <div className="bg-green-50/50 p-5 rounded-[2rem] text-green-400 group-hover:scale-110 transition-transform duration-500">
              <CheckCircle2 size={32} />
            </div>
          </div>
        </div>

        {/* Platform Fees */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-50 relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                Platform Fees Collected
              </p>
              <h3 className="text-4xl font-black text-black tracking-tighter">
                {formatCurrency(stats.platform_fees_collected)}
              </h3>
              <div className="flex items-center gap-2 text-[#6366F1] font-black text-[10px] uppercase tracking-widest bg-indigo-50 w-fit px-3 py-1.5 rounded-full border border-indigo-100/50">
                <PieChart size={12} strokeWidth={3} />
                20% of total volume
              </div>
            </div>
            <div className="bg-indigo-50/50 p-5 rounded-[2rem] text-indigo-400 group-hover:scale-110 transition-transform duration-500">
              <PieChart size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="bg-black p-3 rounded-2xl text-white">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-black tracking-tight leading-none mb-1">
                Transaction History
              </h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">
                Audit Log of Recent Protocol Activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#00A86B] animate-pulse"></div>
              <span className="text-[10px] font-black text-black uppercase tracking-widest">
                Ledger Live
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-8 px-10">
                    Creator
                  </th>
                  <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-8 px-6 text-center">
                    Amount
                  </th>
                  <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-8 px-6 text-center">
                    Protocol Status
                  </th>
                  <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-8 px-6 text-center">
                    Method
                  </th>
                  <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-8 px-10 text-right space-x-2">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoadingHistory ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="py-8 px-10">
                        <div className="h-4 bg-gray-100 rounded-full w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : history.length > 0 ? (
                  history.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="py-8 px-10">
                        <div className="flex items-center gap-4">
                          <div className="bg-black text-white w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-black text-sm uppercase group-hover:scale-105 transition-transform duration-300">
                            {tx.creator?.substring(0, 1)}
                          </div>
                          <div>
                            <div className="font-black text-black text-sm mb-0.5">
                              {tx.creator}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 lowercase">
                              {tx.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-8 px-6 text-center">
                        <span className="font-black text-black text-base tracking-tighter">
                          {tx.amount}
                        </span>
                      </td>
                      <td className="py-8 px-6 text-center">
                        {tx.status?.toLowerCase() === "paid" ? (
                          <div className="inline-flex items-center gap-1.5 bg-[#ECFDF5] px-4 py-1.5 rounded-full border border-[#10B981]/20 text-[#059669]">
                            <Check size={12} strokeWidth={4} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">
                              Paid
                            </span>
                          </div>
                        ) : tx.status?.toLowerCase() === "failed" ? (
                          <div className="inline-flex items-center gap-1.5 bg-[#FFF1F2] px-4 py-1.5 rounded-full border border-[#F43F5E]/20 text-[#E11D48]">
                            <X size={12} strokeWidth={4} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">
                              Failed
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 bg-[#FFFBEB] px-4 py-1.5 rounded-full border border-[#F59E0B]/20 text-[#D97706]">
                            <Clock size={12} strokeWidth={4} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">
                              Pending
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-8 px-6 text-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg">
                          {tx.method}
                        </span>
                      </td>
                      <td className="py-8 px-10 text-right">
                        <div className="flex items-center justify-end gap-6">
                          <span className="text-xs font-bold text-gray-400">
                            {tx.date}
                          </span>

                          {tx.status?.toLowerCase() === "pending" && (
                            <button
                              onClick={() => {
                                setConfirmation({
                                  isOpen: true,
                                  title: "Process Individual Payout",
                                  message: `Confirm financial settlement for ${tx.creator} in the amount of ${tx.amount}?`,
                                  onConfirm: () =>
                                    processSinglePayoutMutation.mutate(tx.id),
                                  type: "warning",
                                });
                              }}
                              disabled={processSinglePayoutMutation.isPending}
                              className="btn btn-xs bg-black hover:bg-gray-800 text-white border-none rounded-lg font-black uppercase tracking-widest text-[8px] h-8 px-3 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {processSinglePayoutMutation.isPending &&
                              processSinglePayoutMutation.variables ===
                                tx.id ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                "Settle"
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <p className="text-gray-300 font-black uppercase text-xs tracking-widest">
                        No transaction logs in current block
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Nexus Confirmation Modal */}
      {confirmation.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() =>
              setConfirmation((prev) => ({ ...prev, isOpen: false }))
            }
          ></div>
          <div className="bg-white rounded-[3rem] w-full max-w-lg relative z-10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.3)] border border-white/20">
            {/* Modal Header/Icon */}
            <div
              className={`p-10 text-center space-y-6 ${
                confirmation.type === "warning" ? "bg-orange-50" : "bg-green-50"
              }`}
            >
              <div
                className={`mx-auto w-24 h-24 rounded-[2rem] flex items-center justify-center ${
                  confirmation.type === "warning"
                    ? "bg-white text-[#FF4D00] shadow-[0_15px_30px_rgba(255,77,0,0.15)]"
                    : "bg-white text-[#00A86B] shadow-[0_15px_30px_rgba(0,168,107,0.15)]"
                }`}
              >
                {confirmation.type === "warning" ? (
                  <AlertTriangle size={48} strokeWidth={2.5} />
                ) : (
                  <ShieldCheck size={48} strokeWidth={2.5} />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-black tracking-tight">
                  {confirmation.title}
                </h3>
                <p className="text-gray-500 font-bold text-lg leading-relaxed">
                  {confirmation.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-10 flex gap-4">
              <button
                onClick={() =>
                  setConfirmation((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1 btn bg-gray-50 hover:bg-gray-100 text-gray-400 border-none rounded-2xl h-16 font-black uppercase text-xs tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmation.onConfirm();
                  setConfirmation((prev) => ({ ...prev, isOpen: false }));
                }}
                className={`flex-1 btn border-none rounded-2xl h-16 font-black uppercase text-xs tracking-widest text-white transition-all active:scale-95 ${
                  confirmation.type === "warning"
                    ? "bg-[#FF4D00] hover:bg-[#E64500] shadow-[0_15px_30px_rgba(255,77,0,0.2)]"
                    : "bg-[#00A86B] hover:bg-[#008F5B] shadow-[0_15px_30px_rgba(0,168,107,0.2)]"
                }`}
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finances;
