import React from 'react';
import {
  ShieldAlert,
  Lock,
  Eye,
  Database,
  Cookie,
  Share2,
  UserCheck,
  Clock,
  Mail,
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Responsibility: Static privacy and data protection documentation.
 * Design: High-readability layout optimized for long-form legal text with industrial branding.
 */
const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Page Header */}
      <div className="mb-10 md:mb-12 border-b border-gray-100 pb-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-adab-green transition-colors mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Return
        </button>

        <div className="flex items-center gap-2 text-adab-green mb-2">
          <Lock className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Data Governance</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none">Privacy Policy</h1>
        <p className="mt-4 text-sm text-gray-500 dark:text-dark-text-muted font-medium">How we collect, utilize, and protect your corporate and personal data within the ADAB ecosystem.</p>
        <div className="mt-6 flex items-center gap-3 text-xs font-bold text-gray-400 dark:text-dark-text-disabled uppercase tracking-widest">
          <Clock className="w-4 h-4" />
          Effective Date: March 22, 2024
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 space-y-12">

          {/* Section: Introduction */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">1. Introduction</h2>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed font-medium">
              ADAB B2B Portal ("we", "our", or "the Platform") is committed to protecting the privacy of our manufacturing and distribution partners. This Privacy Policy outlines our practices regarding the collection, use, and disclosure of information that identifies or can be associated with you ("Personal Data") and your business entity.
            </p>
          </section>

          {/* Section: Information We Collect */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Database className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">2. Information We Collect</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-100 dark:border-dark-border-primary rounded-3xl">
                <h3 className="text-xs font-black text-gray-900 dark:text-dark-text-secondary uppercase tracking-widest mb-3">Corporate Data</h3>
                <ul className="text-xs text-gray-500 dark:text-dark-text-muted font-bold space-y-2 uppercase tracking-tighter">
                  <li>• Legal Entity Name & Tax ID (GST)</li>
                  <li>• Business Registration Certificates</li>
                  <li>• Operational Facility Addresses</li>
                  <li>• Procurement & Sales History</li>
                </ul>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-100 dark:border-dark-border-primary rounded-3xl">
                <h3 className="text-xs font-black text-gray-900 dark:text-dark-text-secondary uppercase tracking-widest mb-3">Liaison Data</h3>
                <ul className="text-xs text-gray-500 dark:text-dark-text-muted font-bold space-y-2 uppercase tracking-tighter">
                  <li>• Full Name & Professional Title</li>
                  <li>• Work Email & Mobile Contacts</li>
                  <li>• Account Credentials (Encrypted)</li>
                  <li>• Communication Logs</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section: How We Use Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Eye className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">3. Usage Architecture</h2>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed font-medium">
              Collected data is utilized strictly for operational efficiency within the B2B pipeline, including:
            </p>
            <ul className="space-y-3 text-gray-600 dark:text-dark-text-secondary font-medium">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-adab-green shrink-0"></span>
                <span>Verification of partner credentials through the ADAB Trust Layer.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-adab-green shrink-0"></span>
                <span>Facilitating secure purchase orders and fulfillment tracking.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-adab-green shrink-0"></span>
                <span>Generating industrial analytics and facility utilization reports.</span>
              </li>
            </ul>
          </section>

          {/* Section: Data Security */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Lock className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">4. Security Protocols</h2>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed font-medium">
              We implement industry-standard technical and organizational measures to safeguard your data. This includes AES-256 encryption at rest, TLS 1.3 for data in transit, and multi-factor authentication (MFA) for portal access. Access to sensitive data is restricted to authorized personnel based on the principle of least privilege.
            </p>
          </section>

          {/* Section: Cookies */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Cookie className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">5. Cookies & Tracking</h2>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed font-medium">
              The Platform uses essential cookies to maintain secure sessions and performance cookies to optimize the dashboard experience. We do not use third-party advertising cookies or cross-site tracking mechanisms.
            </p>
          </section>

          {/* Section: Third-Party Sharing */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Share2 className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">6. Information Disclosure</h2>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed font-medium">
              We do not sell partner data to third-party marketing firms. Data is shared only with:
            </p>
            <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-3xl p-6 italic text-sm text-gray-500 dark:text-dark-text-muted font-medium">
              "Logistics partners, payment processors, and regulatory authorities where mandatory for order fulfillment or legal compliance under the governing law."
            </div>
          </section>

          {/* Section: User Rights */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <UserCheck className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">7. User Rights</h2>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed font-medium">
              You maintain the right to access, rectify, or request the erasure of your Personal Data. Distributors and Manufacturers can update their primary business profile at any time through the Account Settings module.
            </p>
          </section>

          {/* Section: Contact */}
          <section className="space-y-4 border-t border-gray-100 dark:border-dark-border-secondary pt-10 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-dark-surface-card flex items-center justify-center text-adab-green border border-gray-100 dark:border-dark-border-primary">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">Privacy Concerns</h2>
              <p className="text-gray-500 dark:text-dark-text-muted text-sm font-medium max-w-sm">
                For inquiries regarding our data processing practices, please contact our Data Protection Officer at:
              </p>
              <span className="text-adab-green font-black text-lg">privacy@adab.portal</span>
            </div>
          </section>

        </div>

        {/* Footer Note */}
        <div className="px-8 py-10 bg-gray-50/50 border-t border-gray-100 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Official Privacy Repository</p>
          <div className="flex justify-center gap-6">
            <button className="text-xs font-black text-adab-green hover:underline uppercase tracking-widest">Request Data Export</button>
            <button className="text-xs font-black text-adab-green hover:underline uppercase tracking-widest">Print Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;