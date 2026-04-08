import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useThemeStore } from "../../hooks/useTheme";

export const ConfirmEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = useThemeStore((state) => state.isDark);
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "invalid"
  >("loading");
  const [message, setMessage] = useState("Confirming your email...");

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get token_hash from URL (Supabase sends it as #token_hash=...)
        const hash = window.location.hash.substring(1); // Remove # symbol
        const params = new URLSearchParams(hash);
        const tokenHash = params.get("token_hash");
        const type = params.get("type"); // 'email_change' or 'signup'

        console.log("Token hash:", tokenHash);
        console.log("Type:", type);

        if (!tokenHash) {
          setStatus("invalid");
          setMessage(
            "No confirmation token found. Please check your email link.",
          );
          return;
        }

        // Verify the token with Supabase
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: (type as any) || "email",
        });

        if (error) {
          console.error("Email confirmation error:", error);
          setStatus("error");
          setMessage(
            error.message || "Email confirmation failed. Please try again.",
          );
          return;
        }

        setStatus("success");
        setMessage("Email confirmed successfully! Redirecting to login...");

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } catch (error) {
        console.error("Unexpected error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    confirmEmail();
  }, [navigate]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-50"
      }`}
    >
      <div
        className={`w-full max-w-md mx-4 p-8 rounded-2xl shadow-2xl transition-all duration-500 ${
          isDark
            ? "bg-[#15192e] border border-[#3f4a68]"
            : "bg-white border border-gray-200"
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          {status === "loading" && (
            <div className="flex justify-center mb-4">
              <Loader className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          )}
          {status === "error" && (
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          )}
          {status === "invalid" && (
            <div className="flex justify-center mb-4">
              <Mail className="w-12 h-12 text-orange-500" />
            </div>
          )}

          <h1
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {status === "loading" && "Confirming Email"}
            {status === "success" && "Email Confirmed!"}
            {status === "error" && "Confirmation Failed"}
            {status === "invalid" && "Invalid Link"}
          </h1>
        </div>

        {/* Message */}
        <div className="text-center mb-8">
          <p
            className={`text-lg ${
              isDark ? "text-gray-300" : "text-gray-600"
            } mb-4`}
          >
            {message}
          </p>

          {status === "error" && (
            <div className="space-y-4">
              <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                Your confirmation link may have expired.
              </p>
              <button
                onClick={() => navigate("/signup")}
                className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Try Signing Up Again
              </button>
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-4">
              <button
                onClick={() => navigate("/signup")}
                className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Return to Sign Up
              </button>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                You can now log in with your credentials.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 bg-green-600 hover:bg-green-700 text-white"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div
          className={`p-4 rounded-lg text-center text-sm ${
            status === "success"
              ? isDark
                ? "bg-green-500/10 text-green-400"
                : "bg-green-50 text-green-700"
              : status === "error"
                ? isDark
                  ? "bg-red-500/10 text-red-400"
                  : "bg-red-50 text-red-700"
                : status === "loading"
                  ? isDark
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-blue-50 text-blue-700"
                  : isDark
                    ? "bg-orange-500/10 text-orange-400"
                    : "bg-orange-50 text-orange-700"
          }`}
        >
          {status === "loading" && "Please wait while we confirm your email..."}
          {status === "success" && "✓ Your email has been verified"}
          {status === "error" && "✗ Unable to confirm email"}
          {status === "invalid" && "⚠ Invalid or expired confirmation link"}
        </div>
      </div>
    </div>
  );
};
