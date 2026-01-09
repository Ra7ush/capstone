import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutGrid,
  Users,
  CircleDollarSign,
  ShieldAlert,
  Activity,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Menu,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function DashBoardLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItems = [
    {
      group: "MAIN MENU",
      items: [
        {
          name: "Dashboard",
          icon: <LayoutGrid size={20} />,
          path: "/dashboard",
        },
        { name: "User Management", icon: <Users size={20} />, path: "/users" },
        {
          name: "Financials",
          icon: <CircleDollarSign size={20} />,
          path: "/finances",
        },
        {
          name: "Moderation",
          icon: <ShieldAlert size={20} />,
          path: "/moderations",
        },
      ],
    },
    {
      group: "SYSTEM",
      items: [
        {
          name: "System Health",
          icon: <Activity size={20} />,
          path: "/health",
        },
        {
          name: "Global Settings",
          icon: <Settings size={20} />,
          path: "/settings",
        },
      ],
    },
  ];

  return (
    <div className="drawer lg:drawer-open bg-white min-h-screen text-black">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />

      {/* Page Content */}
      <div className="drawer-content flex flex-col min-h-screen overflow-x-hidden">
        {/* Navbar */}
        <div className="navbar bg-white border-b border-gray-100 px-4 lg:px-8 h-20 sticky top-0 z-10">
          <div className="flex-none lg:hidden">
            <label
              htmlFor="my-drawer-2"
              className="btn btn-square btn-ghost drawer-button"
            >
              <Menu size={24} />
            </label>
          </div>

          <div className="flex-1">
            <div className="relative w-full max-w-md hidden md:block">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="input bg-gray-50 border-none w-full pl-10 focus:bg-gray-100 transition-all font-medium text-black focus:ring-0"
              />
            </div>
          </div>

          <div className="flex-none gap-4 items-center">
            <button className="btn btn-ghost btn-circle text-gray-500 relative">
              <Bell size={22} />
              <span className="badge badge-error badge-xs absolute top-2 right-2 border-none"></span>
            </button>

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 hidden sm:flex">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">
                System Live
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <main className="flex-1 p-6 lg:p-10 bg-gray-50/50">
          <Outlet />
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-20">
        <label
          htmlFor="my-drawer-2"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>

        <div className="w-72 min-h-screen bg-white border-r border-gray-100 flex flex-col p-6">
          {/* Logo Section - Nexus Style */}
          <div
            className="flex items-center gap-2 mb-10 px-2 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <div className="bg-black w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xl italic shadow-md">
              N
            </div>
            <h1 className="text-xl font-black text-black tracking-tight">
              Nexus
            </h1>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar">
            {navItems.map((group) => (
              <div key={group.group}>
                <h2 className="px-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.1em] mb-4">
                  {group.group}
                </h2>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
                        ${
                          isActive
                            ? "bg-gray-50 text-black font-extrabold"
                            : "text-gray-400 hover:bg-gray-50 hover:text-black font-medium"
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={
                              isActive ? "text-[#FF4D00]" : "transition-colors"
                            }
                          >
                            {item.icon}
                          </span>
                          <span className="text-sm">{item.name}</span>
                          {isActive && (
                            <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-[#FF4D00] rounded-l-full"></div>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* User Profile Card */}
          <div className="mt-auto pt-6 border-t border-gray-100">
            <div
              className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer group"
              onClick={handleLogout}
            >
              <div className="avatar placeholder text-white">
                <div className="bg-black rounded-xl w-10 h-10 flex items-center justify-center border border-gray-100">
                  <span className="text-xs font-black uppercase">
                    {user?.email?.substring(0, 2) || "SA"}
                  </span>
                </div>
              </div>
              <div className="flex-1 truncate">
                <h3 className="text-sm font-black truncate text-black">
                  {user?.user_metadata?.full_name || "Super Admin"}
                </h3>
                <p className="text-[10px] font-bold text-gray-400 truncate">
                  {user?.email || "owner@nexus.app"}
                </p>
              </div>
              <LogOut
                size={16}
                className="text-gray-400 group-hover:text-[#FF4D00] transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashBoardLayout;
