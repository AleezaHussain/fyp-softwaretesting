import React, { useState } from "react";
import {
  LogOut, Home, BarChart3, FileText, User,
  Menu, X, BookOpen, MessageSquare,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useThemeStore } from "../../hooks/useTheme";
import { useAuthStore } from "@/store/store";

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();
  const { isDark } = useThemeStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/dashboard",       icon: Home,           label: "Home" },
    { path: "/simulations",     icon: BarChart3,       label: "Simulations" },
    { path: "/reports",         icon: FileText,        label: "Reports" },
    { path: "/advisory",        icon: MessageSquare,   label: "Advisory" },
    { path: "/technical-guide", icon: BookOpen,        label: "Technical Guide" },
    { path: "/profile",         icon: User,            label: "Profile" },
  ];

  const bg       = isDark ? "bg-[#1a1f3a] border-r border-[#3f4a68]" : "bg-white border-r border-gray-200";
  const divider  = isDark ? "border-[#3f4a68]" : "border-gray-200";
  const active   = isDark ? "bg-[#5ce1e5]/20 text-[#5ce1e5] font-semibold" : "bg-[#0ea5e9]/10 text-[#0ea5e9] font-semibold";
  const inactive = isDark ? "text-gray-300 hover:bg-[#27304a] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900";
  const logoutCls = isDark ? "text-gray-400 hover:bg-[#27304a] hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900";

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className={`lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg transition-all ${
          isDark ? "bg-[#27304a] text-white" : "bg-white text-gray-900 shadow"
        }`}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar — fixed w-56 */}
      <aside
        className={`fixed left-0 top-0 h-screen w-56 flex flex-col z-40 transition-transform duration-300 ${bg}
          lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ overflowY: "auto", overflowX: "hidden" }}
      >
        {/* Logo — centered */}
        <div className={`flex items-center justify-center border-b ${divider} py-3`}>
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <img
              src={isDark ? "/logo1.png" : "/logo.png"}
              alt="COOLIENCE"
              className="w-28 h-28 object-contain"
            />
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive(path) ? active : inactive
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="font-medium text-sm truncate">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className={`p-3 border-t ${divider}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${logoutCls}`}
          >
            <LogOut size={20} className="shrink-0" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
        />
      )}
    </>
  );
};
