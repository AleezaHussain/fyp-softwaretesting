import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useThemeStore } from "../../hooks/useTheme";
import * as authService from "../../services/authService";
import {
  Mail, ArrowLeft, Lock, Eye, EyeOff,
  Shield, AlertCircle, ChevronRight,
} from "lucide-react";

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<"email" | "reset">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email is invalid";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateReset = () => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) newErrors.newPassword = "Password is required";
    else if (newPassword.length < 8)
      newErrors.newPassword = "Password must be at least 8 characters";
    else if (!/(?=.*[A-Z])/.test(newPassword))
      newErrors.newPassword = "Must contain at least one uppercase letter";
    else if (!/(?=.*\d)/.test(newPassword))
      newErrors.newPassword = "Must contain at least one number";

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const passwordStrength = (password: string) => {
    if (!password) return { score: 0, label: "None", color: "gray" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*])/.test(password)) score++;

    const strengths = [
      { label: "Weak", color: isDark ? "#ef4444" : "#dc2626" },
      { label: "Fair", color: isDark ? "#f59e0b" : "#d97706" },
      { label: "Good", color: isDark ? "#10b981" : "#059669" },
      { label: "Strong", color: isDark ? "#10b981" : "#059669" },
      { label: "Very Strong", color: isDark ? "#10b981" : "#059669" },
    ];

    return strengths[score];
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateEmail()) {
      setIsLoading(true);
      const response = await authService.resetPassword(email);
      setIsLoading(false);

      if (!response.success) {
        setErrors((prev) => ({
          ...prev,
          email: response.error || "Unable to verify this email",
        }));
        return;
      }

      setStep("reset");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateReset()) {
      setIsLoading(true);
      const response = await authService.updatePassword(email, newPassword);
      setIsLoading(false);

      if (!response.success) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: response.error || "Failed to reset password",
        }));
        return;
      }

      navigate("/login");
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 overflow-hidden ${
      isDark ? "bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
             : "bg-gradient-to-br from-slate-50 via-white to-slate-50"
    }`}>


      <Link to="/" className="fixed top-2 left-2 z-50 ">
        <img src={isDark ? "/logo1.png" : "/logo.png"} alt="COOLIENCE" className="w-28 h-28" />
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

      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className={`relative rounded-3xl overflow-hidden shadow-2xl ${
          isDark ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                 : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
        }`}>
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-3xl p-1">
            <div className={`absolute inset-0 rounded-3xl opacity-20 ${isDark ? "bg-gradient-to-r from-[#5ce1e5] via-[#fd5757] to-[#5ce1e5]" : "bg-gradient-to-r from-[#0ea5e9] via-[#ef4444] to-[#0ea5e9]"}`}
              style={{ backgroundSize: "200% 100%", animation: "gradientShift 3s ease-in-out infinite" }} />
          </div>

          <div className="relative p-5">
            {/* Back button */}
            <button onClick={() => navigate("/login")}
              className={`flex items-center gap-2 mb-4 text-sm font-medium transition-colors ${isDark ? "text-[#5ce1e5] hover:text-[#5ce1e5]/80" : "text-[#0ea5e9] hover:text-[#0ea5e9]/80"}`}>
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>

            {/* Header */}
            <div className="text-center mb-4 space-y-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${isDark ? "bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]" : "bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]"}`}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Reset Password</h2>
              <p className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {step === "email" ? "Enter your email to verify your account" : "Create a new password for your account"}
              </p>
            </div>

            {/* Input helper */}
            {(() => {
              const inputCls = (hasError: boolean) =>
                `flex items-center gap-3 p-3 rounded-xl border-2 transition-colors duration-200 ${
                  hasError
                    ? isDark ? "border-red-500/50 bg-red-500/5" : "border-red-400 bg-red-50"
                    : isDark ? "border-[#3f4a68] bg-[#1a1f3a] focus-within:border-[#5ce1e5]"
                             : "border-gray-200 bg-white focus-within:border-[#0ea5e9]"
                }`;
              const inputText = `flex-1 bg-transparent outline-none text-base ${isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"}`;
              const iconCls = `w-4 h-4 shrink-0 ${isDark ? "text-gray-400" : "text-gray-400"}`;

              return step === "email" ? (
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div>
                    <div className={inputCls(!!errors.email)}>
                      <Mail className={iconCls} />
                      <input type="email" value={email}
                        onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }}
                        placeholder="Enter your email" className={inputText} />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
                  </div>
                  <button type="submit" disabled={isLoading}
                    className={`group relative w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 overflow-hidden disabled:opacity-80 disabled:cursor-not-allowed ${isDark ? "bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white" : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"}`}>
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transition-all duration-700 group-hover:left-full" />
                    <span className="relative flex items-center justify-center gap-2">
                      {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</> : <><span>Continue</span><ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                    </span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleReset} className="space-y-3">
                  {/* New password */}
                  <div>
                    <div className={inputCls(!!errors.newPassword)}>
                      <Lock className={iconCls} />
                      <input type={showNewPassword ? "text" : "password"} value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: "" })); }}
                        placeholder="New password" className={inputText} />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                        className={`p-1 rounded-lg ${isDark ? "hover:bg-[#27304a]" : "hover:bg-gray-100"}`}>
                        {showNewPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="mt-2">
                        <div className={`h-1 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((newPassword.length / 12) * 100, 100)}%`, background: passwordStrength(newPassword).color }} />
                        </div>
                        <p className="text-xs mt-1" style={{ color: passwordStrength(newPassword).color }}>{passwordStrength(newPassword).label}</p>
                      </div>
                    )}
                    {errors.newPassword && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.newPassword}</p>}
                  </div>
                  {/* Confirm password */}
                  <div>
                    <div className={inputCls(!!errors.confirmPassword)}>
                      <Lock className={iconCls} />
                      <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: "" })); }}
                        placeholder="Confirm new password" className={inputText} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`p-1 rounded-lg ${isDark ? "hover:bg-[#27304a]" : "hover:bg-gray-100"}`}>
                        {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPassword}</p>}
                  </div>
                  <button type="submit" disabled={isLoading}
                    className={`group relative w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 overflow-hidden disabled:opacity-80 disabled:cursor-not-allowed ${isDark ? "bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white" : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"}`}>
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transition-all duration-700 group-hover:left-full" />
                    <span className="relative flex items-center justify-center gap-2">
                      {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting...</> : <><span>Reset Password</span><ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                    </span>
                  </button>
                </form>
              );
            })()}
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
