import React from "react";

/**
 * PagerLoader - A premium, Nexus-branded loading overlay.
 *
 * @param {boolean} fullScreen - If true, covers the entire viewport. Otherwise, covers the parent container.
 * @param {string} message - Optional message to display below the loader.
 */
function PagerLoader({
  fullScreen = true,
  message = "Synchronizing ecosystem...",
}) {
  return (
    <div
      className={`
        ${fullScreen ? "fixed inset-0" : "absolute inset-0"}
        z-[9999] flex flex-col items-center justify-center
        bg-white/40 backdrop-blur-[12px]
        animate-in fade-in duration-500
      `}
    >
      {/* Central Animation Unit */}
      <div className="relative group">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-[#FF4D00] rounded-[2rem] blur-[30px] opacity-20 animate-pulse group-hover:opacity-40 transition-opacity duration-700"></div>

        {/* The Card */}
        <div className="relative bg-black w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-bounce duration-[2000ms]">
          <span className="text-white text-5xl font-black italic select-none tracking-tighter">
            N
          </span>

          {/* Orbiting Ring */}
          <div className="absolute inset-0 border-2 border-[#FF4D00]/30 rounded-[2rem] scale-125 animate-ping opacity-20"></div>
          <div className="absolute inset-0 border-2 border-white/10 rounded-[2rem] scale-150 animate-ping opacity-10 [animation-delay:500ms]"></div>
        </div>
      </div>

      {/* Progress Text */}
      <div className="mt-12 space-y-2 text-center overflow-hidden">
        <p className="text-[10px] font-black text-[#FF4D00] uppercase tracking-[0.4em] animate-in slide-in-from-bottom duration-700">
          Nexus Protocol
        </p>
        <p className="text-black font-black text-sm tracking-tight animate-pulse leading-none">
          {message}
        </p>
      </div>

      {/* Modern Slim Loader Bar */}
      <div className="mt-6 w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-black w-1/2 rounded-full animate-[progress_1.5s_infinite_ease-in-out]"></div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `,
        }}
      />
    </div>
  );
}

export default PagerLoader;
