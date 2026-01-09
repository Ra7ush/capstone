import React from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../lib/api";
import { Cpu, Activity, HardDrive, AlertTriangle, Loader2 } from "lucide-react";
import PagerLoader from "../components/PagerLoader";

function Health() {
  const {
    data: healthResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["system-health"],
    queryFn: dashboardApi.getSystemHealth,
    refetchInterval: 5000, // Real-time pulse every 5s
  });

  const metrics = healthResponse?.data || {};

  if (isLoading && !metrics.cpu) {
    return (
      <PagerLoader message="Connecting to system core..." fullScreen={false} />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-[2.5rem] border border-red-100 p-8 text-center space-y-4">
        <div className="bg-white p-4 rounded-full shadow-sm text-red-500">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h3 className="text-xl font-black text-black">System Unreachable</h3>
          <p className="text-red-400 font-medium text-sm">
            Could not fetch infrastructure metrics.
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "HEALTHY":
        return "bg-[#00A86B]/10 text-[#00A86B]";
      case "HEAVY":
        return "bg-[#6366f1]/10 text-[#6366f1]";
      case "ATTENTION":
        return "bg-red-50 text-red-500";
      case "CRITICAL":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case "HEALTHY":
        return "bg-[#00A86B]";
      case "HEAVY":
        return "bg-[#6366f1]";
      case "ATTENTION":
        return "bg-red-500";
      case "CRITICAL":
        return "bg-red-600";
      default:
        return "bg-gray-300";
    }
  };

  const cards = [
    {
      title: "Avg. CPU Usage",
      value: `${metrics.cpu?.usage}%`,
      subtext: null,
      status: metrics.cpu?.status,
      icon: <Cpu size={24} />,
      progress: metrics.cpu?.usage,
      iconColor: "text-[#6366f1]",
      iconBg: "bg-[#6366f1]/10",
    },
    {
      title: "Memory",
      value: metrics.memory?.used,
      unit: "GB",
      subtext: `(${metrics.memory?.total}GB Total)`,
      status: metrics.memory?.status,
      icon: <Activity size={24} />,
      progress: (metrics.memory?.used / metrics.memory?.total) * 100,
      iconColor: "text-[#0066FF]",
      iconBg: "bg-[#0066FF]/10",
    },
    {
      title: "Storage Used (SSD)",
      value: `${metrics.storage?.usedPercent}%`,
      subtext: null,
      status: metrics.storage?.status,
      icon: <HardDrive size={24} />,
      progress: metrics.storage?.usedPercent,
      iconColor: "text-[#a855f7]",
      iconBg: "bg-[#a855f7]/10",
    },
    {
      title: "Error Rate (1h)",
      value: `${metrics.errorRate?.value}%`,
      subtext: null,
      status: metrics.errorRate?.status,
      icon: <AlertTriangle size={24} />,
      progress: metrics.errorRate?.value * 100, // Scale for visibility
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">
            System Health & Infrastructure
          </h1>
          <p className="text-gray-400 font-bold text-lg">
            Real-time infrastructure monitoring and system logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-6">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.iconBg} ${card.iconColor}`}
              >
                {card.icon}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(
                  card.status
                )}`}
              >
                {card.status}
              </span>
            </div>

            <div className="space-y-1 mb-6">
              <div className="flex items-baseline gap-1">
                <h3 className="text-4xl font-black text-black tracking-tight">
                  {card.value}
                </h3>
                {card.unit && (
                  <span className="text-lg font-bold text-gray-400">
                    {card.unit}
                  </span>
                )}
              </div>
              <p className="text-gray-400 font-bold text-sm">
                {card.title}{" "}
                {card.subtext && (
                  <span className="opacity-75">{card.subtext}</span>
                )}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-50">
              <div
                className={`h-full transition-all duration-1000 ease-out ${getProgressColor(
                  card.status
                )}`}
                style={{ width: `${Math.min(card.progress, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Health;
