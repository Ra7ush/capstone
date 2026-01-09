import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../lib/api";
import {
  DollarSign,
  PieChart,
  Wallet,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import PagerLoader from "../components/PagerLoader";

function Dashboard() {
  const [timeRange, setTimeRange] = useState("1M"); // 1W, 1M, 3M, 1Y
  const {
    data: statsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard-stats", timeRange],
    queryFn: () => dashboardApi.getDashboardStats(timeRange),
    refetchInterval: 30000,
  });

  const stats = statsResponse?.data || {};
  const chartData = stats.revenue_history || [];
  const filteredChartData = chartData;

  // Formatter for currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Formatter for trends
  const renderTrend = (trend) => {
    const isPositive = trend >= 0;
    return (
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${
          isPositive
            ? "bg-[#00A86B]/10 text-[#00A86B]"
            : "bg-red-50 text-red-500"
        }`}
      >
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(trend || 0).toFixed(1)}%
      </div>
    );
  };

  if (isLoading)
    return (
      <PagerLoader message="Analyzing platform metrics..." fullScreen={false} />
    );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-[2.5rem] border border-red-100 p-8 text-center space-y-4">
        <div className="bg-white p-4 rounded-full shadow-sm text-red-500">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <div>
          <h3 className="text-xl font-black text-black">Metrics Unavailable</h3>
          <p className="text-red-400 font-medium text-sm">
            Could not fetch dashboard statistics.
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Platform Revenue",
      value: formatCurrency(stats.revenue?.value),
      trend: stats.revenue?.trend,
      icon: <DollarSign size={24} />,
      color: "text-[#00A86B]",
      bgColor: "bg-[#00A86B]/10",
      borderColor: "border-[#00A86B]/20",
    },
    {
      title: "Net Profit (20%)",
      value: formatCurrency(stats.profit?.value),
      trend: stats.profit?.trend,
      icon: <PieChart size={24} />,
      color: "text-[#6366f1]",
      bgColor: "bg-[#6366f1]/10",
      borderColor: "border-[#6366f1]/20",
    },
    {
      title: "Pending Payouts",
      value: formatCurrency(stats.pending_payouts?.value),
      trend: stats.pending_payouts?.trend,
      icon: <Wallet size={24} />,
      color: "text-[#FFB000]",
      bgColor: "bg-[#FFB000]/10",
      borderColor: "border-[#FFB000]/20",
    },
    {
      title: "Total Users",
      value: (stats.users?.value || 0).toLocaleString(),
      trend: stats.users?.trend,
      icon: <Users size={24} />,
      color: "text-[#0066FF]",
      bgColor: "bg-[#0066FF]/10",
      borderColor: "border-[#0066FF]/20",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tight leading-none mb-2">
            Dashboard
          </h1>
          <p className="text-gray-400 font-bold text-lg">
            Real-time platform insights and performance metrics.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bgColor} ${stat.color} transition-transform group-hover:scale-110 duration-300`}
              >
                {stat.icon}
              </div>
              {renderTrend(stat.trend)}
            </div>

            <div className="space-y-1">
              <h3 className="text-3xl font-black text-black tracking-tight">
                {stat.value}
              </h3>
              <p className="text-gray-400 font-bold text-sm">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart Section */}
      <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-xl font-black text-black tracking-tight">
              Revenue Trajectory
            </h3>
            <p className="text-gray-400 font-bold text-sm mt-1">
              Gross transaction volume per month
            </p>
          </div>

          <div className="bg-gray-50 p-1 rounded-xl flex gap-1">
            {["1W", "1M", "3M", "1Y"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  timeRange === range
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                cursor={{ fill: "#f9fafb" }}
                contentStyle={{
                  backgroundColor: "#000",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px",
                }}
                itemStyle={{ color: "#fff", fontWeight: 700, fontSize: "12px" }}
                labelStyle={{ display: "none" }}
                formatter={(value) => [formatCurrency(value), "Revenue"]}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 6, 6]}
                barSize={40}
                animationDuration={1500}
              >
                {filteredChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index % 2 === 0 ? "#000000" : "#e5e7eb"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
