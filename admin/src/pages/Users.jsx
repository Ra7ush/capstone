import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../lib/api";
import toast from "react-hot-toast";
import {
  MoreHorizontal,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  X,
  UserCircle,
  BadgeCheck,
  Zap,
  Users as UsersIcon,
} from "lucide-react";
import PagerLoader from "../components/PagerLoader";
import { useRealtimeSync } from "../hooks/useRealtimeSync";

function Users() {
  const queryClient = useQueryClient();

  // --- Real-Time Synchronization Protocol ---
  useRealtimeSync("users", "users");
  // ------------------------------------------
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    verification_status: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.getAllUsers,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, formData }) => usersApi.updateUser(id, formData),
    onSuccess: () => {
      toast.success("User synchronization complete");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      const errorObj = error.response?.data?.error;
      const errorMsg =
        typeof errorObj === "string"
          ? errorObj
          : errorObj?.message || error.message || "Update protocol failed";
      toast.error(errorMsg);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      toast.success("Resident removed from ecosystem");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      const errorObj = error.response?.data?.error;
      const errorMsg =
        typeof errorObj === "string"
          ? errorObj
          : errorObj?.message || error.message || "Exclusion protocol failed";
      toast.error(errorMsg);
    },
  });

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      status: user.status || "active",
      verification_status: user.creators?.verification_status || "none",
    });
    setIsEditModalOpen(true);
  };

  const handleBan = (user) => {
    if (!user?.id) return;
    updateUserMutation.mutate({
      id: user.id,
      formData: { status: "banned" },
    });
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!userToDelete?.id) return;
    deleteUserMutation.mutate(userToDelete.id);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!selectedUser?.id) {
      toast.error("Technical Fault: User identity missing");
      return;
    }
    updateUserMutation.mutate({
      id: selectedUser.id,
      formData: {
        status: editForm.status,
        verification_status:
          editForm.verification_status === "none"
            ? null
            : editForm.verification_status,
      },
    });
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return (
          <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-green-700 uppercase tracking-tighter">
              Active
            </span>
          </div>
        );
      case "reviewing":
        return (
          <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-orange-700 uppercase tracking-tighter">
              Reviewing
            </span>
          </div>
        );
      case "banned":
        return (
          <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full border border-red-100">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            <span className="text-[10px] font-black text-red-700 uppercase tracking-tighter">
              Banned
            </span>
          </div>
        );
      case "suspended":
        return (
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
              Suspended
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const getVerificationBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "verified":
        return (
          <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs uppercase tracking-tight">
            <CheckCircle2 size={14} className="opacity-70" />
            Verified
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-1.5 text-orange-500 font-bold text-xs uppercase tracking-tight">
            <Clock size={14} className="opacity-70" />
            Pending Review
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs uppercase tracking-tight">
            <X size={14} className="opacity-70" />
            Rejected
          </div>
        );
      default:
        return <span className="text-gray-300 font-black">—</span>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case "creator":
        return (
          <span className="badge border-none bg-purple-50 text-purple-600 font-black text-[10px] uppercase px-3 py-3 rounded-lg">
            Creator
          </span>
        );
      case "super_admin":
        return (
          <span className="badge border-none bg-black text-white font-black text-[10px] uppercase px-3 py-3 rounded-lg shadow-sm">
            Admin
          </span>
        );
      default:
        return (
          <span className="badge border-none bg-gray-50 text-gray-400 font-black text-[10px] uppercase px-3 py-3 rounded-lg">
            User
          </span>
        );
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="bg-red-50 p-4 rounded-full text-red-500 border border-red-100">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-xl font-black text-black">Network Interference</h2>
        <p className="text-gray-400 text-sm font-medium">
          Unable to establish connection with user database.
        </p>
        <button
          className="btn btn-neutral btn-sm rounded-xl px-6 bg-black text-white hover:bg-gray-800 border-none"
          onClick={() => window.location.reload()}
        >
          Retry Sync
        </button>
      </div>
    );
  }

  const users = data?.data || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {(updateUserMutation.isPending ||
        deleteUserMutation.isPending ||
        (isLoading && !data)) && (
        <PagerLoader message="Synchronizing ecosystem changes..." />
      )}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-black tracking-tight">
            User Management
          </h1>
          <p className="text-gray-400 font-medium leading-none">
            Manage platform residents, credentials, and compliance.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Query User DB..."
              className="input bg-white border border-gray-100 w-full pl-10 rounded-xl focus:ring-0 focus:border-black font-bold text-sm placeholder:text-gray-300 transition-all h-11"
            />
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm h-11">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
              <Zap size={12} className="text-orange-500" />
              Live Sync
            </span>
          </div>
          <button className="btn btn-square bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 rounded-xl h-11 w-11 shadow-sm">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/30">
                <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-6 px-10">
                  User
                </th>
                <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-6 px-6 text-center">
                  Type
                </th>
                <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-6 px-6">
                  Verification
                </th>
                <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-6 px-6">
                  Total Earnings
                </th>
                <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-6 px-6">
                  Status
                </th>
                <th className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-6 px-10 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                // Skeleton Rows
                [...Array(5)].map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="py-6 px-10">
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-100 rounded-xl w-12 h-12"></div>
                        <div className="space-y-2">
                          <div className="bg-gray-100 h-4 w-32 rounded"></div>
                          <div className="bg-gray-100 h-3 w-48 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td colSpan={5} className="py-6">
                      <div className="bg-gray-50 h-6 w-full rounded-full"></div>
                    </td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="py-6 px-10">
                      <div className="flex items-center gap-4">
                        <div className="avatar placeholder">
                          <div className="bg-black text-white rounded-2xl w-12 h-12 border-2 border-white shadow-sm font-black text-sm uppercase flex items-center justify-center">
                            {user.username?.substring(0, 1) ||
                              user.email?.substring(0, 1) ||
                              "?"}
                          </div>
                        </div>
                        <div>
                          <div className="font-black text-black text-sm group-hover:text-[#FF4D00] transition-colors">
                            {user.username || "Anonymous User"}
                          </div>
                          <div className="text-[11px] font-bold text-gray-400 lowrcase">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-6 text-center">
                      {getTypeBadge(user.role)}
                    </td>
                    <td className="py-6 px-6">
                      {user.role === "creator" ? (
                        getVerificationBadge(user.creators?.verification_status)
                      ) : (
                        <span className="text-gray-300 font-black">—</span>
                      )}
                    </td>
                    <td className="py-6 px-6">
                      <span className="font-black text-black text-sm">
                        {user.creators?.total_earnings != null
                          ? `$${user.creators.total_earnings.toLocaleString()}`
                          : user.role === "creator"
                          ? "$0"
                          : "-"}
                      </span>
                    </td>
                    <td className="py-6 px-6">
                      {getStatusBadge(user.status || "active")}
                    </td>
                    <td className="py-6 px-10 text-right">
                      <div className="dropdown dropdown-left">
                        <button
                          tabIndex={0}
                          className="btn btn-ghost btn-xs rounded-lg text-gray-300 hover:text-black hover:bg-gray-100 transition-all p-1"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        <ul
                          tabIndex={0}
                          className="dropdown-content z-[1] menu p-2 shadow-2xl bg-white rounded-2xl w-48 border border-gray-50 animate-in fade-in zoom-in duration-200"
                        >
                          <li>
                            <button
                              onClick={() => handleEdit(user)}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl group"
                            >
                              <div className="bg-orange-50 p-2 rounded-lg text-[#FF4D00] group-hover:bg-[#FF4D00] group-hover:text-white transition-all">
                                <UserCircle size={16} />
                              </div>
                              <span className="font-bold text-black text-xs">
                                Edit Access
                              </span>
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleBan(user)}
                              disabled={
                                updateUserMutation.isPending ||
                                user.status === "banned"
                              }
                              className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 rounded-xl group disabled:opacity-50"
                            >
                              <div className="bg-orange-50 p-2 rounded-lg text-[#FF4D00] group-hover:bg-[#FF4D00] group-hover:text-white transition-all">
                                <ShieldAlert size={16} />
                              </div>
                              <span className="font-bold text-black text-xs">
                                Ban Resident
                              </span>
                            </button>
                          </li>
                          <div className="divider my-1 opacity-50"></div>
                          <li>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              disabled={deleteUserMutation.isPending}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-xl group disabled:opacity-50"
                            >
                              <div className="bg-red-50 p-2 rounded-lg text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                                <X size={16} />
                              </div>
                              <span className="font-bold text-red-600 text-xs text-left">
                                Exclude Resident
                              </span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="bg-gray-50 p-4 rounded-full text-gray-300">
                        <UsersIcon size={32} />
                      </div>
                      <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
                        No matching records found in ecosystem
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
          ></div>

          <div className="bg-white rounded-[2.5rem] shadow-[0_25px_100px_rgba(0,0,0,0.2)] border border-gray-100 w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-black w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl italic shadow-lg">
                  N
                </div>
                <div>
                  <h2 className="text-xl font-black text-black tracking-tight leading-none mb-1">
                    Modify Access
                  </h2>
                  <p className="text-[10px] font-black text-[#FF4D00] uppercase tracking-widest">
                    Protocol ID: {selectedUser?.email?.split("@")[0]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-ghost btn-circle btn-sm text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-8">
              {/* User Identity Info */}
              <div className="bg-gray-50 p-6 rounded-3xl flex items-center gap-4 border border-gray-100">
                <div className="avatar placeholder">
                  <div className="bg-black text-white rounded-2xl w-14 h-14 border-2 border-white shadow-md font-black text-lg uppercase flex items-center justify-center">
                    {selectedUser?.username?.substring(0, 1) ||
                      selectedUser?.email?.substring(0, 1)}
                  </div>
                </div>
                <div>
                  <div className="font-black text-black text-lg">
                    {selectedUser?.username || "Anonymous"}
                  </div>
                  <div className="text-xs font-bold text-gray-400">
                    {selectedUser?.email}
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    System Status
                  </label>
                  <select
                    className="select bg-gray-50 border-gray-100 rounded-2xl w-full font-bold text-black focus:ring-0 focus:border-black transition-all h-14"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="active">ACTIVE</option>
                    <option value="reviewing">REVIEWING</option>
                    <option value="suspended">SUSPENDED</option>
                    <option value="banned">BANNED</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    Verification
                  </label>
                  <select
                    className="select bg-gray-50 border-gray-100 rounded-2xl w-full font-bold text-black focus:ring-0 focus:border-black transition-all h-14"
                    value={editForm.verification_status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        verification_status: e.target.value,
                      })
                    }
                    disabled={selectedUser?.role !== "creator"}
                  >
                    <option value="pending">PENDING</option>
                    <option value="verified">VERIFIED</option>
                    <option value="rejected">REJECTED</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-ghost flex-1 h-16 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black hover:bg-gray-50 transition-all border-none"
                >
                  Terminate
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className={`btn flex-[2] h-16 rounded-2xl bg-black text-white hover:bg-gray-900 border-none shadow-2xl shadow-black/10 transition-all duration-300 gap-3 text-xs font-black uppercase tracking-widest ${
                    updateUserMutation.isPending ? "loading" : ""
                  }`}
                >
                  {!updateUserMutation.isPending && <BadgeCheck size={18} />}
                  Execute Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setUserToDelete(null);
            }}
          ></div>

          <div className="bg-white rounded-[2.5rem] shadow-[0_25px_100px_rgba(0,0,0,0.2)] border border-gray-100 w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 space-y-8 text-center">
              <div className="mx-auto bg-red-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-red-500 shadow-inner">
                <ShieldAlert size={40} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-black tracking-tight">
                  Exclusion Protocol
                </h2>
                <p className="text-gray-400 font-medium px-4">
                  You are about to permanently remove{" "}
                  <span className="text-black font-black">
                    {userToDelete?.username || userToDelete?.email}
                  </span>{" "}
                  from the ecosystem. This action is irreversible.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={deleteUserMutation.isPending}
                  className={`btn h-16 rounded-2xl bg-red-600 text-white hover:bg-red-700 border-none shadow-2xl shadow-red-200 transition-all duration-300 font-black uppercase tracking-widest text-xs ${
                    deleteUserMutation.isPending ? "loading" : ""
                  }`}
                >
                  Confirm Exclusion
                </button>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                  }}
                  className="btn btn-ghost h-16 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black hover:bg-gray-50 transition-all border-none"
                >
                  Abort Operation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
