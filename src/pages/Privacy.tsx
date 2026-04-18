import React from "react";
import { Link } from "react-router-dom";
import { useThemeStore } from "../hooks/useTheme";
import { ArrowLeft, Lock } from "lucide-react";

const Section: React.FC<{ title: string; children: React.ReactNode; isDark: boolean }> = ({ title, children, isDark }) => (
  <div className="mb-8">
    <h2 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>{title}</h2>
    <div className={`text-base leading-relaxed space-y-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{children}</div>
  </div>
);

export const Privacy: React.FC = () => {
  const { isDark } = useThemeStore();

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-x-hidden ${
      isDark ? "bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
             : "bg-gradient-to-br from-slate-50 via-white to-slate-50"
    }`}>
      {/* Logo */}
      <Link to="/" className="fixed top-2 left-2 z-50 hover:opacity-80 transition-opacity">
        <img src={isDark ? "/logo1.png" : "/logo.png"} alt="COOLIENCE" className="w-28 h-28" />
      </Link>

      {/* Animated background */}
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

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 pt-32">
        {/* Page header */}
        <div className="flex items-center gap-4 mb-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? "bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]" : "bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]"}`}>
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Privacy Policy</h1>
            <p className={`text-base mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Last updated: April 2026</p>
          </div>
        </div>

        <p className={`text-base leading-relaxed mb-10 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          This Privacy Policy explains how COOLIENCE collects, uses, and protects your personal information when you use our platform. We are committed to protecting your privacy and handling your data responsibly.
        </p>

        <Section title="1. Information We Collect" isDark={isDark}>
          <p><strong>Account information:</strong> When you register, we collect your name, email address, organisation, and role.</p>
          <p><strong>Simulation data:</strong> Input parameters you provide for simulations and the results generated.</p>
          <p><strong>Usage data:</strong> Pages visited, features used, simulation history, and activity logs to help us improve the platform.</p>
          <p><strong>Technical data:</strong> IP address, browser type, device information, and cookies necessary for the platform to function.</p>
        </Section>

        <Section title="2. How We Use Your Information" isDark={isDark}>
          <p>We use your information to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Provide, operate, and maintain the COOLIENCE platform</li>
            <li>Personalise your experience and remember your preferences</li>
            <li>Send you important service notifications and updates</li>
            <li>Analyse usage patterns to improve platform performance and features</li>
            <li>Respond to your support requests and enquiries</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>
        </Section>

        <Section title="3. Data Storage and Security" isDark={isDark}>
          <p>Your data is stored securely using Supabase, a cloud database provider with industry-standard encryption at rest and in transit (TLS 1.2+). We implement access controls, authentication, and regular security reviews to protect your information.</p>
          <p>While we take reasonable precautions, no system is completely secure. We encourage you to use a strong, unique password.</p>
        </Section>

        <Section title="4. Data Retention" isDark={isDark}>
          <p>We retain your account data for as long as your account is active. If you delete your account, your personal data and simulation records are removed within 30 days, except where retention is required by law.</p>
        </Section>

        <Section title="5. Cookies" isDark={isDark}>
          <p>We use essential cookies to maintain your session and authentication state. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, but this may affect platform functionality.</p>
        </Section>

        <Section title="6. Third-Party Services" isDark={isDark}>
          <p>We use the following third-party services to operate the platform:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Supabase</strong> — database and authentication</li>
            <li><strong>EnergyPlus / NREL</strong> — weather data (no personal data shared)</li>
            <li><strong>OpenRouter / Groq</strong> — AI advisory responses (only simulation context is sent, no personal identifiers)</li>
          </ul>
        </Section>

        <Section title="7. Your Rights" isDark={isDark}>
          <p>Depending on your location, you may have the right to access, correct, delete, or export your personal data. To exercise any of these rights, contact us at <span className={`font-semibold ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}>privacy@coolience.io</span>.</p>
        </Section>

        <Section title="8. Children's Privacy" isDark={isDark}>
          <p>COOLIENCE is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.</p>
        </Section>

        <Section title="9. Changes to This Policy" isDark={isDark}>
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-platform notification.</p>
        </Section>

        <Section title="10. Contact Us" isDark={isDark}>
          <p>If you have questions regarding this Privacy Policy, please contact us at <span className={`font-semibold ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}>privacy@coolience.io</span>.</p>
        </Section>

        <div className={`pt-6 border-t ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
          <Link to="/auth/signup" className={`inline-flex items-center gap-2 text-base font-semibold transition-colors ${isDark ? "text-[#5ce1e5] hover:text-[#5ce1e5]/80" : "text-[#0ea5e9] hover:text-[#0ea5e9]/80"}`}>
            <ArrowLeft className="w-4 h-4" />
            Back to Sign Up
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
      `}</style>
    </div>
  );
};
