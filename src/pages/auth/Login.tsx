import React, { useState, useEffect } from "react";
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
  Activity,
} from "lucide-react";
import { useThemeStore } from "../../hooks/useTheme";
import Confetti from "react-confetti";

// AuthInput component (specific to Login file)
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
  const isDark = useThemeStore((state) => state.isDark);

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 focus-within:scale-105 focus-within:shadow-lg ${
          error
            ? isDark
              ? "border-red-500/50 bg-red-500/5"
              : "border-red-500 bg-red-50"
            : isDark
              ? "border-[#3f4a68] bg-[#1a1f3a] focus-within:border-[#5ce1e5]"
              : "border-gray-200 bg-white focus-within:border-[#0ea5e9]"
        }`}
      >
        <Icon
          className={`w-5 h-5 ${error ? "text-red-500" : isDark ? "text-gray-400" : "text-gray-500"}`}
        />
        <input
          type={showPasswordToggle && showPassword ? "text" : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none text-base ${
            isDark
              ? "text-white placeholder-gray-500"
              : "text-gray-900 placeholder-gray-500"
          }`}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? "hover:bg-[#27304a]" : "hover:bg-gray-100"
            }`}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-gray-500" />
            ) : (
              <Eye className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isDark = useThemeStore((state) => state.isDark);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Handle window resize for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await login(formData.email, formData.password);

      if (!result.success) {
        console.error("Login failed with error:", result.error);
        setErrors({
          submit: result.error || "Invalid credentials. Please try again.",
        });
        setIsSubmitting(false);
        return;
      }

      // Trigger confetti on successful login
      setShowConfetti(true);
      setConfettiKey((prev) => prev + 1);

      // Navigate to dashboard after confetti animation
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000); // 3 seconds of confetti before navigation
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred. Please try again." });
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 overflow-hidden ${
        isDark
          ? "bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-50"
      }`}
    >
      {/* Confetti Overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti
            key={confettiKey}
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.1}
            colors={
              isDark
                ? ["#5ce1e5", "#fd5757", "#8b5cf6", "#fbbf24", "#10b981"]
                : ["#0ea5e9", "#ef4444", "#8b5cf6", "#f59e0b", "#10b981"]
            }
            onConfettiComplete={() => setShowConfetti(false)}
          />

          {/* Success Message Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`p-8 rounded-2xl backdrop-blur-md border ${
                isDark
                  ? "bg-black/40 border-cyan-500/30"
                  : "bg-white/90 border-blue-300"
              } shadow-2xl transform transition-all duration-500 animate-in zoom-in`}
            >
              <div className="text-center space-y-4">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                    isDark
                      ? "bg-gradient-to-br from-cyan-500 to-blue-500"
                      : "bg-gradient-to-br from-blue-500 to-cyan-400"
                  }`}
                >
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3
                  className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Login Successful!
                </h3>
                <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  Redirecting to your dashboard...
                </p>
                <div className="pt-4">
                  <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
                    <div
                      className={`h-full rounded-full ${
                        isDark
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                          : "bg-gradient-to-r from-blue-500 to-cyan-400"
                      } animate-progress`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${
              isDark
                ? "bg-gradient-to-br from-[#5ce1e5]/10 to-[#fd5757]/10"
                : "bg-gradient-to-br from-[#0ea5e9]/10 to-[#ef4444]/10"
            }`}
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

        {/* Gradient Orbs */}
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
            isDark ? "bg-[#5ce1e5]/5" : "bg-[#0ea5e9]/5"
          }`}
          style={{ animation: "float 8s ease-in-out infinite" }}
        />
        <div
          className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${
            isDark ? "bg-[#fd5757]/5" : "bg-[#ef4444]/5"
          }`}
          style={{ animation: "float 6s ease-in-out 2s infinite reverse" }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Left Side - Brand & Info */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 max-w-lg">
          <div className="space-y-8">
            <div className="space-y-4">
              {/* Enhanced Badge */}
              <div className="inline-block animate-in slide-in-from-left-8 duration-1000">
                <div
                  className={`
                  relative px-4 py-2.5 text-sm font-semibold rounded-full
                  backdrop-blur-sm border shadow-lg overflow-hidden
                  ${
                    isDark
                      ? "text-cyan-100 border-cyan-500/30 bg-gradient-to-r from-cyan-900/40 to-blue-900/40"
                      : "text-blue-800 border-blue-300/50 bg-gradient-to-r from-blue-50/80 to-cyan-50/80"
                  }
                `}
                >
                  {/* Animated glow effect */}
                  <div
                    className={`
                    absolute inset-0 rounded-full opacity-30
                    ${isDark ? "bg-gradient-to-r from-cyan-500 to-blue-500" : "bg-gradient-to-r from-blue-400 to-cyan-400"}
                    animate-pulse
                  `}
                  ></div>

                  {/* Pulsing dot */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <div
                      className={`
                      relative w-2 h-2 rounded-full
                      ${isDark ? "bg-cyan-400" : "bg-blue-500"}
                      animate-ping
                    `}
                    ></div>
                    <div
                      className={`
                      absolute inset-0 w-2 h-2 rounded-full
                      ${isDark ? "bg-cyan-400" : "bg-blue-500"}
                    `}
                    ></div>
                  </div>

                  <span className="relative flex items-center gap-2 pl-5">
                    <Activity className="w-4 h-4" />
                    Live Cooling Optimization Active
                  </span>
                </div>
              </div>

              <h1
                className={`text-5xl font-bold leading-tight ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Intelligent{" "}
                <span
                  className={`bg-gradient-to-r ${
                    isDark
                      ? "from-[#5ce1e5] to-[#fd5757]"
                      : "from-[#0ea5e9] to-[#5ce1e5]"
                  } bg-clip-text text-transparent`}
                >
                  Data Center
                </span>{" "}
                Cooling System
              </h1>

              <p
                className={`text-lg ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Optimize your data center cooling with AI-powered insights.
                Reduce energy costs by up to 40% while maintaining peak
                performance.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: "Energy Efficient", color: "#fbbf24" },
                { icon: Shield, label: "Secure", color: "#10b981" },
                { icon: Wind, label: "Sustainable", color: "#5ce1e5" },
                { icon: Sparkles, label: "Smart", color: "#8b5cf6" },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isDark
                      ? "bg-[#1a1f3a] border border-[#3f4a68]"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <feature.icon
                    className="w-5 h-5"
                    style={{ color: feature.color }}
                  />
                  <span
                    className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 max-w-md">
          <div
            className={`relative rounded-3xl overflow-hidden ${
              isDark
                ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
            } shadow-2xl`}
          >
            {/* Animated Border */}
            <div className="absolute inset-0 rounded-3xl p-1">
              <div
                className={`absolute inset-0 rounded-3xl ${
                  isDark
                    ? "bg-gradient-to-r from-[#5ce1e5] via-[#fd5757] to-[#5ce1e5]"
                    : "bg-gradient-to-r from-[#0ea5e9] via-[#ef4444] to-[#0ea5e9]"
                } opacity-20`}
                style={{
                  backgroundSize: "200% 100%",
                  animation: "gradientShift 3s ease-in-out infinite",
                }}
              />
            </div>

            <div className="relative p-8">
              {/* Header */}
              <div className="text-center mb-8 space-y-4">
                <div className="inline-block">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                      isDark
                        ? "bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]"
                        : "bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]"
                    }`}
                  >
                    <Wind className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h2
                    className={`text-3xl font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Welcome Back
                  </h2>
                  <p
                    className={`mt-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Sign in to your account
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {errors.submit && (
                  <div
                    className={`p-4 rounded-xl ${
                      isDark
                        ? "bg-red-500/10 border border-red-500/30"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <p className="text-red-500 text-sm text-center">
                      {errors.submit}
                    </p>
                  </div>
                )}

                <AuthInput
                  icon={Mail}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  error={errors.email}
                />

                <AuthInput
                  icon={Lock}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  error={errors.password}
                  showPasswordToggle={true}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className={`w-4 h-4 rounded focus:ring-0 ${
                        isDark
                          ? "bg-[#27304a] border-[#3f4a68] text-[#5ce1e5]"
                          : "bg-white border-gray-300 text-[#0ea5e9]"
                      }`}
                    />
                    <label
                      htmlFor="rememberMe"
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Remember me
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className={`text-sm font-medium ${
                      isDark
                        ? "text-[#5ce1e5] hover:text-[#5ce1e5]/80"
                        : "text-[#0ea5e9] hover:text-[#0ea5e9]/80"
                    } transition-colors`}
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`group relative w-full py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 overflow-hidden ${
                    isSubmitting ? "opacity-80 cursor-not-allowed" : ""
                  } ${
                    isDark
                      ? "bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white"
                      : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
                  }`}
                >
                  {/* Shine Effect */}
                  <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 transition-all duration-700 group-hover:left-full" />

                  <span className="relative flex items-center justify-center gap-3">
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="my-6">
                <div className="relative">
                  <div
                    className={`absolute inset-0 flex items-center ${
                      isDark ? "border-[#3f4a68]" : "border-gray-200"
                    }`}
                  >
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span
                      className={`px-4 ${
                        isDark
                          ? "bg-[#1a1f3a] text-gray-400"
                          : "bg-white text-gray-500"
                      }`}
                    >
                      Or continue with
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Login */}
              <button
                className={`w-full py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <img
                    src="https://www.google.com/favicon.ico"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  <span>Sign in with Google</span>
                </div>
              </button>

              {/* Sign Up Link */}
              <p
                className={`text-center mt-6 text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className={`font-medium ${
                    isDark
                      ? "text-[#5ce1e5] hover:text-[#5ce1e5]/80"
                      : "text-[#0ea5e9] hover:text-[#0ea5e9]/80"
                  } transition-colors`}
                >
                  Sign up now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 2.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};
