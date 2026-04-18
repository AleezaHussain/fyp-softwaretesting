import React from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../../hooks/useTheme";

export const AuthNavbar: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div
        className="inline-flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
        onClick={() => navigate("/")}
      >
        <img src={isDark ? "/logo1.png" : "/logo.png"} alt="COOLIENCE" className="w-8 h-8" />
        <span className={`text-xl font-bold ${isDark ? "text-[#fd5757]" : "text-[#5ce1e5]"}`}>
          COOLIENCE
        </span>
      </div>
    </div>
  );
};
