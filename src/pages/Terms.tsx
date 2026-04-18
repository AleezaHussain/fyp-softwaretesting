import React from "react";
import { Link } from "react-router-dom";
import { useThemeStore } from "../hooks/useTheme";
import { ArrowLeft, Shield } from "lucide-react";

const Section: React.FC<{ title: string; children: React.ReactNode; isDark: boolean }> = ({ title, children, isDark }) => (
  <div className="mb-8">
    <h2 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>{title}</h2>
    <div className={`text-base leading-relaxed space-y-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{children}</div>
  </div>
);

export const Terms: React.FC = () => {
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
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Terms & Conditions</h1>
            <p className={`text-base mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Last updated: April 2026</p>
          </div>
        </div>

        <p className={`text-base leading-relaxed mb-10 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Please read these Terms and Conditions carefully before using the COOLIENCE platform. By creating an account or using our services, you agree to be bound by these terms.
        </p>

        <Section title="1. Acceptance of Terms" isDark={isDark}>
          <p>By accessing or using COOLIENCE, you confirm that you are at least 18 years old, have the legal authority to enter into these terms, and agree to comply with all applicable laws and regulations.</p>
          <p>If you are using COOLIENCE on behalf of an organisation, you represent that you have the authority to bind that organisation to these terms.</p>
        </Section>

        <Section title="2. Description of Service" isDark={isDark}>
          <p>COOLIENCE is a data center cooling simulation and optimisation platform. It provides tools to model, analyse, and compare cooling strategies including Air-Side Economization, Evaporative Cooling, and Chilled Water Systems.</p>
          <p>Simulation results are estimates based on physics models and should not be used as the sole basis for critical infrastructure decisions without independent engineering review.</p>
        </Section>

        <Section title="3. User Accounts" isDark={isDark}>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorised use of your account.</p>
          <p>You must provide accurate and complete information when creating your account. We reserve the right to suspend or terminate accounts that contain false information or violate these terms.</p>
        </Section>

        <Section title="4. Acceptable Use" isDark={isDark}>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Use the platform for any unlawful purpose or in violation of any regulations</li>
            <li>Attempt to gain unauthorised access to any part of the platform or its infrastructure</li>
            <li>Reverse engineer, decompile, or disassemble any part of the service</li>
            <li>Upload malicious code, viruses, or any software intended to damage or disrupt the service</li>
            <li>Use automated tools to scrape, crawl, or extract data from the platform without permission</li>
          </ul>
        </Section>

        <Section title="5. Intellectual Property" isDark={isDark}>
          <p>All content, software, algorithms, and materials on the COOLIENCE platform are the intellectual property of COOLIENCE and its licensors. You may not reproduce, distribute, or create derivative works without explicit written permission.</p>
          <p>Simulation results generated using your own input data remain your property. You grant COOLIENCE a non-exclusive licence to use anonymised simulation data to improve the platform.</p>
        </Section>

        <Section title="6. Data and Privacy" isDark={isDark}>
          <p>Your use of the platform is also governed by our <Link to="/privacy" className={`font-semibold underline ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}>Privacy Policy</Link>, which is incorporated into these terms by reference.</p>
        </Section>

        <Section title="7. Disclaimer of Warranties" isDark={isDark}>
          <p>The platform is provided "as is" without warranties of any kind, express or implied. COOLIENCE does not warrant that the service will be uninterrupted, error-free, or that simulation results will be accurate for all real-world scenarios.</p>
          <p>Engineering decisions based on simulation outputs should always be validated by qualified professionals.</p>
        </Section>

        <Section title="8. Limitation of Liability" isDark={isDark}>
          <p>To the maximum extent permitted by law, COOLIENCE shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to loss of data, loss of profits, or business interruption.</p>
        </Section>

        <Section title="9. Changes to Terms" isDark={isDark}>
          <p>We reserve the right to modify these terms at any time. We will notify registered users of material changes via email or an in-platform notification. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>
        </Section>

        <Section title="10. Contact" isDark={isDark}>
          <p>If you have questions about these Terms and Conditions, please contact us at <span className={`font-semibold ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}>legal@coolience.io</span>.</p>
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
