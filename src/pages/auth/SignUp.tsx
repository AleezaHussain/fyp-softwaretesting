import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/store";
import {
  Mail,
  Lock,
  User,
  Wind,
  Zap,
  Shield,
  Eye,
  EyeOff,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useThemeStore } from "../../hooks/useTheme";
import { Logo } from "../../components/shared/Logo";

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
}> = ({
  icon: Icon,
  type,
  name,
  value,
  onChange,
  placeholder,
  error,
  showPasswordToggle = false,
  onTogglePassword,
  showPassword = false,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors duration-200 ${
          error
            ? isDark
              ? "border-red-500/50 bg-red-500/5"
              : "border-red-400 bg-red-50"
            : isDark
              ? "border-[#3f4a68] bg-[#1a1f3a] focus-within:border-[#5ce1e5]"
              : "border-gray-200 bg-white focus-within:border-[#0ea5e9]"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0 text-gray-400" />
        <input
          type={showPasswordToggle && showPassword ? "text" : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`flex-1 min-w-0 bg-transparent outline-none text-sm ${isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"}`}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className={`p-1 rounded-lg transition-colors ${isDark ? "hover:bg-[#27304a]" : "hover:bg-gray-100"}`}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-gray-400" />
            ) : (
              <Eye className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const isDark = useThemeStore((s) => s.isDark);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const getFriendlySignupError = (rawError?: string) => {
    const msg = (rawError || "").toLowerCase();

    if (
      msg.includes("over_email_send_rate_limit") ||
      msg.includes("email rate limit exceeded") ||
      msg.includes("rate limit")
    ) {
      return "Too many email requests right now. Please wait a few minutes, then try again. ";
    }

    if (msg.includes("already registered") || msg.includes("already exists")) {
      return "This email is already registered. Please log in instead, or use Forgot Password if needed.";
    }

    return rawError || "Registration failed. Please try again.";
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = "Full name is required";
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Email is invalid";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < 8) e.password = "Min 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password))
      e.password = "Needs uppercase, lowercase & number";
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!formData.acceptTerms) e.acceptTerms = "You must accept the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const result = await signup(
        formData.fullName,
        formData.email,
        formData.password,
      );
      if (!result.success) {
        setErrors({
          submit: getFriendlySignupError(result.error),
        });
        setIsSubmitting(false);
        return;
      }
      // Show confirmation screen only if backend indicates email confirmation is required.
      if ((result as any).requiresEmailConfirmation) {
        setEmailSent(true);
      } else {
        navigate("/login");
      }
      setIsSubmitting(false);
    } catch {
      setErrors({ submit: "An unexpected error occurred. Please try again." });
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const pwReqs = [
    { label: "8+ chars", valid: formData.password.length >= 8 },
    { label: "Uppercase", valid: /[A-Z]/.test(formData.password) },
    { label: "Lowercase", valid: /[a-z]/.test(formData.password) },
    { label: "Number", valid: /\d/.test(formData.password) },
  ];

  return (
    <div
      className={`min-h-screen transition-colors duration-500 overflow-hidden ${
        isDark
          ? "bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-50"
      }`}
    >
      {/* Email confirmation screen */}
      {emailSent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: isDark
              ? "rgba(10,14,39,0.95)"
              : "rgba(255,255,255,0.95)",
          }}
        >
          <div
            className={`max-w-md w-full rounded-3xl p-8 text-center shadow-2xl border ${
              isDark
                ? "bg-[#1a1f3a] border-[#3f4a68]"
                : "bg-white border-gray-200"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDark ? "bg-green-500/20" : "bg-green-100"
              }`}
            >
              <Mail className="w-8 h-8 text-green-500" />
            </div>
            <h2
              className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Check your email
            </h2>
            <p
              className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              We sent a confirmation link to
            </p>
            <p
              className={`font-semibold mb-4 ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}
            >
              {formData.email}
            </p>
            <p
              className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Click the link in the email to verify your account, then come back
              and sign in.
            </p>
            <button
              onClick={() => navigate("/login")}
              className={`w-full py-3 rounded-xl font-bold transition-all hover:scale-105 ${
                isDark
                  ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                  : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
              }`}
            >
              Go to Login
            </button>
            <p
              className={`text-xs mt-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              Didn't receive it? Check your spam folder.
            </p>
          </div>
        </div>
      )}

      <Link to="/" className="fixed left-2 z-50 ">
        <Logo className="w-28 h-28" />
      </Link>
      {/* Floating particles + orbs */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${isDark ? "bg-gradient-to-br from-[#5ce1e5]/10 to-[#fd5757]/10" : "bg-gradient-to-br from-[#0ea5e9]/10 to-[#ef4444]/10"}`}
            style={{
              width: `${40 + i * 10}px`,
              height: `${40 + i * 10}px`,
              left: `${10 + i * 5}%`,
              top: `${20 + i * 8}%`,
              animation: `float ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-[#5ce1e5]/5" : "bg-[#0ea5e9]/5"}`}
          style={{ animation: "float 8s ease-in-out infinite" }}
        />
        <div
          className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${isDark ? "bg-[#fd5757]/5" : "bg-[#ef4444]/5"}`}
          style={{ animation: "float 6s ease-in-out 2s infinite reverse" }}
        />
      </div>

      {/* Page layout — full height, no page scroll */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 gap-8">
        {/* ── Left side ── */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center max-w-md">
          <div className="space-y-6">
            <div
              className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
            >
              <div
                className={`p-1.5 rounded-lg ${isDark ? "bg-[#27304a]" : "bg-gray-100"}`}
              >
                <Sparkles className="w-4 h-4 text-[#5ce1e5]" />
              </div>
              <span
                className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Join the Future of Cooling
              </span>
            </div>

            <h1
              className={`text-4xl font-bold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Start Your{" "}
              <span
                className={`bg-gradient-to-r ${isDark ? "from-[#5ce1e5] to-[#fd5757]" : "from-[#0ea5e9] to-[#5ce1e5]"} bg-clip-text text-transparent`}
              >
                Cooling Journey
              </span>
            </h1>

            <p
              className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Join thousands of data centers optimizing their cooling systems.
              Save up to 40% on energy costs.
            </p>

            <div className="space-y-2.5">
              {[
                "AI-powered cooling optimization",
                "Real-time monitoring & alerts",
                "Detailed analytics & reporting",
                "Scalable for any data center size",
              ].map((b) => (
                <div key={b} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-green-500/20" : "bg-green-100"}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  </div>
                  <span
                    className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {b}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Zap, label: "Energy Efficient", color: "#fbbf24" },
                { icon: Shield, label: "Secure", color: "#10b981" },
                { icon: Wind, label: "Sustainable", color: "#5ce1e5" },
                { icon: Sparkles, label: "Smart", color: "#8b5cf6" },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 p-3 rounded-xl ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span
                    className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right side — scrollable card ── */}
        <div className="flex-1 max-w-md flex flex-col">
          <div
            className={`relative rounded-3xl overflow-hidden shadow-2xl ${
              isDark
                ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
            }`}
          >
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none">
              <div
                className={`absolute inset-0 rounded-3xl opacity-20 ${isDark ? "bg-gradient-to-r from-[#5ce1e5] via-[#fd5757] to-[#5ce1e5]" : "bg-gradient-to-r from-[#0ea5e9] via-[#ef4444] to-[#0ea5e9]"}`}
                style={{
                  backgroundSize: "200% 100%",
                  animation: "gradientShift 3s ease-in-out infinite",
                }}
              />
            </div>

            {/* Scrollable inner content */}
            <div className="relative p-6">
              {/* Header */}
              <div className="text-center mb-4 space-y-2">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${isDark ? "bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]" : "bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]"}`}
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2
                  className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Create Account
                </h2>
                <p
                  className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Start optimizing your data center cooling
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.submit && (
                  <div
                    className={`p-3 rounded-xl ${isDark ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-200"}`}
                  >
                    <p className="text-red-500 text-sm text-center">
                      {errors.submit}
                    </p>
                  </div>
                )}

                {/* Inputs — vertical stack, no horizontal scroll */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <AuthInput
                      icon={User}
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Full Name"
                      error={errors.fullName}
                    />
                    <AuthInput
                      icon={Mail}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email"
                      error={errors.email}
                    />
                  </div>
                  <AuthInput
                    icon={Lock}
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    error={errors.password}
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((p) => !p)}
                  />
                  <AuthInput
                    icon={Lock}
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    error={errors.confirmPassword}
                    showPasswordToggle
                    showPassword={showConfirmPassword}
                    onTogglePassword={() => setShowConfirmPassword((p) => !p)}
                  />
                </div>

                {/* Password requirements */}
                {formData.password && (
                  <div
                    className={`p-3 rounded-xl ${isDark ? "bg-[#27304a]" : "bg-gray-50 border border-gray-200"}`}
                  >
                    <div className="grid grid-cols-2 gap-1.5">
                      {pwReqs.map(({ label, valid }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div
                            className={`w-3 h-3 rounded-full flex items-center justify-center ${valid ? (isDark ? "bg-green-500/20" : "bg-green-100") : isDark ? "bg-gray-700" : "bg-gray-200"}`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-green-500" : "bg-transparent"}`}
                            />
                          </div>
                          <span
                            className={`text-xs ${valid ? (isDark ? "text-green-400" : "text-green-600") : isDark ? "text-gray-500" : "text-gray-400"}`}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terms */}
                <div
                  className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? "bg-[#27304a]" : "bg-gray-50 border border-gray-200"}`}
                >
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className={`mt-0.5 w-4 h-4 rounded focus:ring-0 ${isDark ? "bg-[#27304a] border-[#3f4a68] text-[#5ce1e5]" : "bg-white border-gray-300 text-[#0ea5e9]"}`}
                  />
                  <label
                    htmlFor="acceptTerms"
                    className={`text-xs ${isDark ? "text-gray-300" : "text-gray-600"}`}
                  >
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className={`font-semibold  ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}
                    >
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className={`font-semibold  ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <span>⚠</span>
                    {errors.acceptTerms}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`group relative w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 overflow-hidden ${isSubmitting ? "opacity-80 cursor-not-allowed" : ""} ${isDark ? "bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white" : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"}`}
                >
                  <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transition-all duration-700 group-hover:left-full" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              <p
                className={`mt-4 text-center text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                Already have an account?{" "}
                <Link
                  to="/login"
                  className={`font-semibold ${isDark ? "text-[#5ce1e5] hover:text-[#5ce1e5]/80" : "text-[#0ea5e9] hover:text-[#0ea5e9]/80"} transition-colors`}
                >
                  Sign in here
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
