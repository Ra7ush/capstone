import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Mail, Lock, LogIn, Chrome, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { login } from "../lib/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: login.AdminLogin,
    onSuccess: (data) => {
      const { session } = data.data || {};
      if (session) {
        supabase.auth.setSession(session);
        navigate("/dashboard");
      }
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error || error.message || "Login failed";
      setError(errorMsg);
    },
  });

  const handleEmailLogin = (e) => {
    e.preventDefault();
    setError("");

    // Quick client-side check
    if (email !== import.meta.env.VITE_ADMIN_EMAIL) {
      setError("Access denied: Restricted to administrator only.");
      return;
    }

    loginMutation.mutate({ email, password });
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  const isLoading = loginMutation.isPending;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 selection:bg-[#FF4D00] selection:text-white text-black">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-12 space-y-10 border border-gray-50 relative overflow-hidden">
        {/* Branding Section */}
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-black w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-3xl italic shadow-xl">
              N
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tighter text-black">
                Nexus<span className="text-gray-300">Admin</span>
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4D00]">
                Secure Workforce Portal
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert bg-red-50 text-red-600 border-none rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-start gap-3">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <span className="text-xs font-bold leading-tight uppercase tracking-wide">
              {error}
            </span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Administrator ID
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-300 group-focus-within:text-black transition-colors">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="Email"
                className="input w-full pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:bg-gray-100 transition-all duration-300 font-bold text-black placeholder:text-gray-300 focus:ring-0"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Access Token
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-300 group-focus-within:text-black transition-colors">
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                className="input w-full pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:bg-gray-100 transition-all duration-300 font-bold text-black placeholder:text-gray-300 focus:ring-0"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-neutral w-full h-16 text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all duration-300 gap-3 border-none bg-black text-white hover:bg-gray-900 active:scale-95 ${
              isLoading ? "loading" : ""
            }`}
            disabled={isLoading}
          >
            {!isLoading && <LogIn size={18} />}
            Initialize Session
          </button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-black">
            <span className="bg-white px-6 text-gray-300">
              Third Party Auth
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="btn btn-outline w-full h-14 rounded-2xl border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 gap-3 font-black text-xs uppercase tracking-widest text-gray-500 group"
          disabled={isLoading}
        >
          <Chrome
            size={18}
            className="text-[#FF4D00] group-hover:scale-110 transition-transform duration-300"
          />
          Authorize with Google
        </button>

        <div className="flex flex-col items-center gap-1 pt-4">
          <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.2em]">
            AES-256 Cloud Infrastructure
          </p>
          <div className="w-8 h-1 bg-[#FF4D00] rounded-full opacity-30"></div>
        </div>
      </div>
    </div>
  );
}

export default Login;
