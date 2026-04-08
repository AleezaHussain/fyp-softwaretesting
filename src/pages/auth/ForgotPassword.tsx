import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../../hooks/useTheme";
import * as authService from "../../services/authService";
import {
  Mail,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Zap,
  AlertCircle,
  ChevronRight,
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
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-50"
      } flex items-center justify-center p-4`}
    >
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className={`absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl ${
            isDark ? "bg-[#fd5757]/5" : "bg-[#fd5757]/5"
          }`}
          style={{ animation: "float 8s ease-in-out infinite" }}
        />
        <div
          className={`absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl ${
            isDark ? "bg-[#8b5cf6]/5" : "bg-[#8b5cf6]/5"
          }`}
          style={{ animation: "float 10s ease-in-out infinite reverse" }}
        />
      </div>

      <div
        className={`relative z-10 rounded-3xl p-8 w-full max-w-md transition-all duration-500 transform hover:scale-[1.01] ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a]/80 to-[#27304a]/80 backdrop-blur-xl border border-[#3f4a68] shadow-2xl shadow-black/30"
            : "bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-xl border border-gray-200 shadow-2xl shadow-gray-200/30"
        }`}
      >
        {/* Back Button */}
        <button
          onClick={() => navigate("/login")}
          className={`flex items-center gap-2 mb-6 font-medium transition-all duration-300 hover:gap-3 ${
            isDark
              ? "text-[#5ce1e5] hover:text-[#5ce1e5]/80"
              : "text-[#0ea5e9] hover:text-[#0ea5e9]/80"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </button>

        {/* Header */}
        <div className="text-center mb-8 space-y-6">
          <div className="flex flex-col items-center">
            <div
              className={`p-4 rounded-2xl mb-4 ${
                isDark
                  ? "bg-gradient-to-br from-[#fd5757]/10 to-[#ff8888]/10"
                  : "bg-gradient-to-br from-[#fd5757]/10 to-[#ff8888]/10"
              }`}
            >
              <Shield
                className={`w-12 h-12 ${isDark ? "text-[#fd5757]" : "text-[#fd5757]"}`}
              />
            </div>
            <div>
              <h1
                className={`text-3xl font-bold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Reset Password
              </h1>
              <p
                className={`text-lg ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {step === "email"
                  ? "Enter your email to receive a reset link"
                  : "Create a new password for your account"}
              </p>
            </div>
          </div>
        </div>

        {/* Email Step */}
        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Email Address
              </label>
              <div
                className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isDark
                    ? "bg-[#1a1f3a] border border-[#3f4a68] focus-within:border-[#fd5757] focus-within:shadow-[0_0_0_2px_#fd5757/20]"
                    : "bg-gray-100 border border-gray-300 focus-within:border-[#fd5757] focus-within:shadow-[0_0_0_2px_#fd5757/20]"
                }`}
              >
                <Mail
                  className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email)
                      setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  placeholder="user.xyz@gmail.com"
                  className={`flex-1 bg-transparent outline-none text-lg ${
                    isDark
                      ? "text-white placeholder-gray-500"
                      : "text-gray-900 placeholder-gray-400"
                  }`}
                />
              </div>
              {errors.email && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle
                    className={`w-4 h-4 ${isDark ? "text-red-400" : "text-red-500"}`}
                  />
                  <span
                    className={`text-sm ${isDark ? "text-red-400" : "text-red-500"}`}
                  >
                    {errors.email}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`relative w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-gradient-to-r from-[#fd5757] to-[#ff8888] text-white shadow-lg shadow-[#fd5757]/20"
                  : "bg-gradient-to-r from-[#fd5757] to-[#ff8888] text-white shadow-lg shadow-[#fd5757]/20"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying Email...
                </div>
              ) : (
                <>
                  Continue
                  <div className="absolute right-6 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Reset Step */
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className={`block text-sm font-medium ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={`text-sm font-medium transition-colors ${
                    isDark
                      ? "text-[#fd5757] hover:text-[#fd5757]/80"
                      : "text-[#fd5757] hover:text-[#fd5757]/80"
                  }`}
                >
                </button>
              </div>
              <div
                className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isDark
                    ? "bg-[#1a1f3a] border border-[#3f4a68] focus-within:border-[#fd5757] focus-within:shadow-[0_0_0_2px_#fd5757/20]"
                    : "bg-gray-100 border border-gray-300 focus-within:border-[#fd5757] focus-within:shadow-[0_0_0_2px_#fd5757/20]"
                }`}
              >
                <Lock
                  className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword)
                      setErrors((prev) => ({ ...prev, newPassword: "" }));
                  }}
                  placeholder="Enter new password"
                  className={`flex-1 bg-transparent outline-none text-lg ${
                    isDark
                      ? "text-white placeholder-gray-500"
                      : "text-gray-900 placeholder-gray-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={`p-1 rounded-lg ${
                    isDark ? "hover:bg-[#27304a]" : "hover:bg-gray-200"
                  }`}
                >
                  {showNewPassword ? (
                    <EyeOff
                      className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    />
                  ) : (
                    <Eye
                      className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    />
                  )}
                </button>
              </div>

              {/* Password Strength */}
              {newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Password strength
                    </span>
                    <span
                      className={`text-sm font-medium`}
                      style={{
                        color: passwordStrength(newPassword).color,
                      }}
                    >
                      {passwordStrength(newPassword).label}
                    </span>
                  </div>
                  <div
                    className={`h-1 rounded-full overflow-hidden ${
                      isDark ? "bg-gray-800" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(newPassword.length / 16) * 100}%`,
                        background: passwordStrength(newPassword).color,
                      }}
                    />
                  </div>
                </div>
              )}

              {errors.newPassword && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle
                    className={`w-4 h-4 ${isDark ? "text-red-400" : "text-red-500"}`}
                  />
                  <span
                    className={`text-sm ${isDark ? "text-red-400" : "text-red-500"}`}
                  >
                    {errors.newPassword}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Confirm Password
              </label>
              <div
                className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isDark
                    ? "bg-[#1a1f3a] border border-[#3f4a68] focus-within:border-[#fd5757] focus-within:shadow-[0_0_0_2px_#fd5757/20]"
                    : "bg-gray-100 border border-gray-300 focus-within:border-[#fd5757] focus-within:shadow-[0_0_0_2px_#fd5757/20]"
                }`}
              >
                <Lock
                  className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  placeholder="Confirm new password"
                  className={`flex-1 bg-transparent outline-none text-lg ${
                    isDark
                      ? "text-white placeholder-gray-500"
                      : "text-gray-900 placeholder-gray-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`p-1 rounded-lg ${
                    isDark ? "hover:bg-[#27304a]" : "hover:bg-gray-200"
                  }`}
                >
                  {showConfirmPassword ? (
                    <EyeOff
                      className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    />
                  ) : (
                    <Eye
                      className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle
                    className={`w-4 h-4 ${isDark ? "text-red-400" : "text-red-500"}`}
                  />
                  <span
                    className={`text-sm ${isDark ? "text-red-400" : "text-red-500"}`}
                  >
                    {errors.confirmPassword}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`relative w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-gradient-to-r from-[#fd5757] to-[#ff8888] text-white shadow-lg shadow-[#fd5757]/20"
                  : "bg-gradient-to-r from-[#fd5757] to-[#ff8888] text-white shadow-lg shadow-[#fd5757]/20"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resetting Password...
                </div>
              ) : (
                <>
                  Reset Password
                  <div className="absolute right-6 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
