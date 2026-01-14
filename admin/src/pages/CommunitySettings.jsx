import React, { useState } from "react";
import { Upload, Save, X, ChevronDown } from "lucide-react";

function CommunitySettings() {
  const [communityName, setCommunityName] = useState("UI/UX Designers Hub");
  const [privacy, setPrivacy] = useState("Public (Anyone can join)");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-black tracking-tight uppercase">
            Community Settings
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">
            Configure your community parameters
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 lg:p-12 border border-gray-100 shadow-xl shadow-black/5">
        {/* Banner Section */}
        <div className="mb-10">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-4">
            Community Banner
          </label>
          <div className="relative group">
            <div className="w-full h-64 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center transition-all group-hover:bg-gray-100 group-hover:border-gray-300">
              <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                <Upload size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-400 font-bold text-sm">
                Click to upload or drag and drop
              </p>
              <p className="text-gray-300 text-[10px] font-black uppercase mt-2">
                Recommended: 1200 x 400 PX
              </p>
            </div>
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Inputs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block ml-4">
              Community Name
            </label>
            <input
              type="text"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-black focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
              placeholder="Enter name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block ml-4">
              Privacy
            </label>
            <div className="relative">
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-black appearance-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none"
              >
                <option>Public (Anyone can join)</option>
                <option>Private (Approval required)</option>
                <option>Restricted (View only)</option>
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown size={18} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-6 pt-8 border-t border-gray-50">
          <button className="text-gray-400 hover:text-black font-black uppercase tracking-widest text-xs transition-colors">
            Cancel
          </button>

          <button className="bg-black hover:bg-gray-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-lg shadow-black/10 active:scale-95">
            <Save size={18} />
            <span className="font-black uppercase tracking-widest text-sm">
              Save Changes
            </span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-black rounded-[2rem] p-6 flex items-start gap-4">
        <div className="bg-white/10 p-2 rounded-xl">
          <Upload size={16} className="text-white" />
        </div>
        <div>
          <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">
            Community Node info
          </h4>
          <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-2xl">
            Updating your community parameters will synchronize across the Nexus
            Protocol. Ensure your assets meet the recommended dimensions for
            optimal presentation across all device nodes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CommunitySettings;
