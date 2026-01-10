import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../lib/axios";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  User,
  ShieldCheck,
  Eye,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

function Verifications() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState(null);

  //TODO: add the function in the api.js
  const { data: verifications, isLoading } = useQuery({
    queryKey: ["verifications", "pending"],
    queryFn: async () => {
      const response = await axiosInstance.get("/admin/verifications/pending");
      return response.data.data;
    },
  });

  //TODO: add the function in the api.js
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }) => {
      const response = await axiosInstance.put(
        `/admin/verifications/${id}/status`,
        {
          status,
          admin_notes,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["verifications"]);
      toast.success("Verification updated successfully");
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Update failed");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-black"></span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter mb-2">
            Creator Identity
          </h1>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">
            Identity Validation Portal (Kurdistan)
          </p>
        </div>
        <div className="bg-black px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <ShieldCheck className="text-[#FF4D00]" size={20} />
          <span className="text-white font-black text-xs uppercase tracking-widest">
            {verifications?.length || 0} Pending Reviews
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {verifications?.map((req) => (
          <div
            key={req.id}
            className="group bg-white rounded-3xl border border-gray-100 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <User size={24} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-black">
                    {req.full_legal_name}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    @{req.user?.username} • {req.id_type}
                  </p>
                </div>
              </div>
              <div className="bg-orange-50 text-[#FF4D00] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} />
                New Application
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  ID Front
                </p>
                <div className="aspect-[4/3] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                  <img
                    src={req.id_front_url}
                    className="w-full h-full object-cover"
                    alt={`ID front for ${req.full_legal_name}`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Selfie Check
                </p>
                <div className="aspect-[4/3] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                  <img
                    src={req.selfie_url}
                    className="w-full h-full object-cover"
                    alt={`Selfie verification for ${req.full_legal_name}`}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRequest(req)}
                className="flex-1 h-14 rounded-2xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                <Eye size={16} /> Review Details
              </button>
              <button
                onClick={() =>
                  statusMutation.mutate({ id: req.id, status: "approved" })
                }
                className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-all border border-green-100"
              >
                <CheckCircle2 size={24} />
              </button>
            </div>
          </div>
        ))}

        {verifications?.length === 0 && (
          <div className="col-span-full py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-sm mb-6">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h2 className="text-xl font-black text-black mb-2">Queue Clear</h2>
            <p className="text-sm font-bold text-gray-400 max-w-xs leading-relaxed uppercase tracking-widest">
              All identity verifications for Kurdistan region have been
              processed correctly.
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black italic">
                    Identity Verification Detail
                  </h2>
                  <p className="text-[10px] font-black text-[#FF4D00] uppercase tracking-widest">
                    Document Integrity Review
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="btn btn-ghost btn-circle text-gray-400"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Info size={14} /> Applicant Metadata
                    </h3>
                    <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
                      <div className="flex justify-between border-b border-gray-100 pb-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase">
                          Legal Name
                        </span>
                        <span className="text-sm font-black">
                          {selectedRequest.full_legal_name}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase">
                          Username
                        </span>
                        <span className="text-sm font-black">
                          @{selectedRequest.user?.username}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase">
                          ID Type
                        </span>
                        <span className="text-sm font-black italic uppercase tracking-widest">
                          {selectedRequest.id_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} /> Selfie Analysis
                    </h3>
                    <div className="bg-gray-100 rounded-[2rem] aspect-square overflow-hidden border-4 border-white shadow-xl">
                      <img
                        src={selectedRequest.selfie_url}
                        className="w-full h-full object-cover"
                        alt={`Selfie of ${selectedRequest.full_legal_name}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <p>National Identity Card</p>
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-gray-100 rounded-[2rem] aspect-[3/2] overflow-hidden border-4 border-white shadow-lg relative">
                        <img
                          src={selectedRequest.id_front_url}
                          className="w-full h-full object-cover"
                          alt={`ID front side for ${selectedRequest.full_legal_name}`}
                        />
                        <div className="absolute top-4 left-4 bg-black/80 px-4 py-1.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest">
                          Front Side
                        </div>
                      </div>
                      {selectedRequest.id_back_url && (
                        <div className="bg-gray-100 rounded-[2rem] aspect-[3/2] overflow-hidden border-4 border-white shadow-lg relative">
                          <img
                            src={selectedRequest.id_back_url}
                            className="w-full h-full object-cover"
                            alt={`ID back side for ${selectedRequest.full_legal_name}`}
                          />
                          <div className="absolute top-4 left-4 bg-black/80 px-4 py-1.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest">
                            Back Side
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() =>
                  statusMutation.mutate({
                    id: selectedRequest.id,
                    status: "rejected",
                    admin_notes: "Identity documents do not match profile.",
                  })
                }
                className="flex-1 h-16 rounded-[1.25rem] bg-white border border-red-100 text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Reject Application
              </button>
              <button
                onClick={() =>
                  statusMutation.mutate({
                    id: selectedRequest.id,
                    status: "approved",
                  })
                }
                className="flex-[2] h-16 rounded-[1.25rem] bg-black text-white font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} className="text-[#FF4D00]" /> Approve
                Identity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Verifications;
