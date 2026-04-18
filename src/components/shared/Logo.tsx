import React from "react";
import { useThemeStore } from "../../hooks/useTheme";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-28 h-28" }) => {
  const { isDark } = useThemeStore();
  return (
    <img
      src={isDark ? "/logo1.png" : "/logo.png"}
      alt="COOLIENCE"
      className={className}
    />
  );
};
