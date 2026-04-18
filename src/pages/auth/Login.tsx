import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/store";
import {
  Mail, Lock, Wind, Zap, Shield, Eye, EyeOff,
  ChevronRight, Sparkles, Activity,
} from "lucide-react";
import { useThemeStore } from "../../hooks/useTheme";
import { Logo } from "../../components/shared/Logo";

const REMEMBER_KEY = "coolsim_remembered_email";
const REMEMBER_FLAG = "coolsim_remember_me";

const AuthInput: React.FC<{
  icon: React.ElementType;
  type: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error?: string;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
}> = ({ icon: Icon, type, name, value, onChange, placeholder, error, showPasswordToggle = false, onTogglePassword, showPassword = false }) => {
  const isDark = useThemeStore((s) => s.isDark);
  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors duration-200 ${
        error
          ? isDark ? "border-red-500/50 bg-red-500/5" : "border-red-400 bg-red-50"
          : isDark ? "border-[#3f4a68] bg-[#1a1f3a] focus-within:border-[#5ce1e5]"
                   : "border-gray-200 bg-white focus-within:border-[#0ea5e9]"
      }`}>
        <Icon className={`w-4 h-4 shrink-0 ${error ? "text-red-500" : isDark ? "text-gray-400" : "text-gray-400"}`} />
        <input
          type={showPasswordToggle && showPassword ? "text" : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none text-base ${isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"}`}
        />
        {showPasswordToggle && (
          <button type="button" onClick={onTogglePassword}
            className={`p-1 rounded-lg transition-colors ${isDark ? "hover:bg-[#27304a]" : "hover:bg-gray-100"}`}>
            {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isDark = useThemeStore((s) => s.isDark);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    const flag  = localStorage.getItem(REMEMBER_FLAG);
    if (saved && flag === "true") {
      setFormData((p) => ({ ...p, email: saved, rememberMe: true }));
    }
  }, []);

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Email is invalid";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setErrors({ submit: result.error || "Invalid credentials. Please try again." });
        setIsSubmitting(false);
        return;
      }
      // Handle remember me
      if (formData.rememberMe) {
        localStorage.setItem(REMEMBER_KEY, formData.email);
        localStorage.setItem(REMEMBER_FLAG, "true");
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(REMEMBER_FLAG);
      }

      navigate("/dashboard");
    } catch {
      setErrors({ submit: "An unexpected error occurred. Please try again." });
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-hidden ${
      isDark ? "bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
             : "bg-gradient-to-br from-slate-50 via-white to-slate-50"
    }`}>

      <Link to="/" className="fixed top-2 left-2 z-50 ">
        <Logo className="w-28 h-28" />
      </Link>
      {/* Background orbs + floating particles */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i}
            className={`absolute rounded-full ${isDark ? "bg-gradient-to-br from-[#5ce1e5]/10 to-[#fd5757]/10" : "bg-gradient-to-br from-[#0ea5e9]/10 to-[#ef4444]/10"}`}
            style={{ width: `${40 + i * 10}px`, height: `${40 + i * 10}px`, left: `${10 + i * 5}%`, top: `${20 + i * 8}%`, animation: `float ${8 + i * 2}s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }} />
        ))}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-[#5ce1e5]/5" : "bg-[#0ea5e9]/5"}`}
          style={{ animation: "float 8s ease-in-out infinite" }} />
        <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-[#fd5757]/5" : "bg-[#ef4444]/5"}`}
          style={{ animation: "float 6s ease-in-out 2s infinite reverse" }} />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Left side */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 max-w-lg">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block animate-in slide-in-from-left-8 duration-1000">
                <div className={`relative px-4 py-2.5 text-sm font-semibold rounded-full backdrop-blur-sm border shadow-lg overflow-hidden ${
                  isDark ? "text-cyan-100 border-cyan-500/30 bg-gradient-to-r from-cyan-900/40 to-blue-900/40"
                         : "text-blue-800 border-blue-300/50 bg-gradient-to-r from-blue-50/80 to-cyan-50/80"
                }`}>
                  <div className={`absolute inset-0 rounded-full opacity-30 animate-pulse ${isDark ? "bg-gradient-to-r from-cyan-500 to-blue-500" : "bg-gradient-to-r from-blue-400 to-cyan-400"}`} />
                  <span className="relative flex items-center gap-2 pl-5">
                    <Activity className="w-4 h-4" />
                    Live Cooling Optimization Active
                  </span>
                </div>
              </div>
              <h1 className={`text-5xl font-bold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                Intelligent{" "}
                <span className={`bg-gradient-to-r ${isDark ? "from-[#5ce1e5] to-[#fd5757]" : "from-[#0ea5e9] to-[#5ce1e5]"} bg-clip-text text-transparent`}>
                  Data Center
                </span>{" "}
                Cooling System
              </h1>
              <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Optimize your data center cooling with AI-powered insights. Reduce energy costs by up to 40% while maintaining peak performance.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: "Energy Efficient", color: "#fbbf24" },
                { icon: Shield, label: "Secure", color: "#10b981" },
                { icon: Wind, label: "Sustainable", color: "#5ce1e5" },
                { icon: Sparkles, label: "Smart", color: "#8b5cf6" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}>
                  <Icon className="w-5 h-5" style={{ color }} />
                  <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side — form card */}
        <div className="flex-1 max-w-md">
          <div className={`relative rounded-3xl overflow-hidden shadow-2xl ${
            isDark ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                   : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
          }`}>
            <div className="absolute inset-0 rounded-3xl p-1">
              <div className={`absolute inset-0 rounded-3xl opacity-20 ${isDark ? "bg-gradient-to-r from-[#5ce1e5] via-[#fd5757] to-[#5ce1e5]" : "bg-gradient-to-r from-[#0ea5e9] via-[#ef4444] to-[#0ea5e9]"}`}
                style={{ backgroundSize: "200% 100%", animation: "gradientShift 3s ease-in-out infinite" }} />
            </div>

            <div className="relative p-5">
              
              {/* Header */}
              <div className="text-center mb-4 space-y-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${isDark ? "bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]" : "bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]"}`}>
                  <Wind className="w-6 h-6 text-white" />
                </div>
                <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Welcome Back</h2>
                <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>Sign in to your account</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {errors.submit && (
                  <div className={`p-3 rounded-xl ${isDark ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
                    <p className="text-red-500 text-sm text-center">{errors.submit}</p>
                  </div>
                )}

                <AuthInput icon={Mail} type="email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="Enter your email" error={errors.email} />

                <AuthInput icon={Lock} type="password" name="password" value={formData.password}
                  onChange={handleChange} placeholder="Enter your password" error={errors.password}
                  showPasswordToggle showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)} />

                {/* Remember me & forgot password */}
                <div className="flex items-center mt-4 justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" name="rememberMe" checked={formData.rememberMe}
                      onChange={handleChange}
                      className={`w-4 h-4 rounded focus:ring-0 ${isDark ? "bg-[#27304a] border-[#3f4a68] text-[#5ce1e5]" : "bg-white border-gray-300 text-[#0ea5e9]"}`} />
                    <span className={`text-base ${isDark ? "text-gray-300" : "text-gray-700"}`}>Remember me</span>
                  </label>
                  <Link to="/forgot-password"
                    className={`text-base font-medium transition-colors ${isDark ? "text-[#5ce1e5] hover:text-[#5ce1e5]/80" : "text-[#0ea5e9] hover:text-[#0ea5e9]/80"}`}>
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" disabled={isSubmitting}
                  className={`group relative w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 mt-5 overflow-hidden ${isSubmitting ? "opacity-80 cursor-not-allowed" : ""} ${isDark ? "bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white" : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"}`}>
                  <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transition-all duration-700 group-hover:left-full" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
                      : <><span>Sign In</span><ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                    }
                  </span>
                </button>
              </form>


              <p className={` mt-4 text-center text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Don't have an account?{" "}
                <Link to="/signup" className={`font-semibold ${isDark ? "text-[#5ce1e5] hover:text-[#5ce1e5]/80" : "text-[#0ea5e9] hover:text-[#0ea5e9]/80"} transition-colors`}>
                  Sign up now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
      `}</style>
    </div>
  );
};
