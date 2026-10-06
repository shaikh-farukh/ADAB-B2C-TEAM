import React from 'react';
import { ShieldCheck, Scale, FileText, ChevronLeft, Clock, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Responsibility: Static legal documentation page.
 * Design: High-readability layout with structured hierarchy and enterprise typography.
 */
const TermsAndConditionsPage: React.FC = () => {
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
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Legal Framework</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none">Terms & Conditions</h1>
        <div className="mt-4 flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
          <Clock className="w-4 h-4" />
          Last Updated: March 22, 2024 &bull; Version 2.1
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 space-y-12">

          {/* Section: Introduction */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Scale className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest">1. Introduction</h2>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">
              Welcome to the ADAB B2B Portal ("the Platform"). These Terms and Conditions govern your access to and use of our industrial networking services. By registering as a Manufacturer or Distributor, you agree to comply with and be bound by the following contractual obligations.
            </p>
            <p className="text-gray-600 leading-relaxed font-medium">
              This Platform is designed exclusively for business-to-business transactions and industrial procurement. Use by individual retail consumers is strictly prohibited.
            </p>
          </section>

          {/* Section: User Responsibilities */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <FileText className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest">2. User Responsibilities</h2>
            </div>
            <ul className="space-y-4 text-gray-600 font-medium">
              <li className="flex gap-4">
                <span className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black shrink-0">2.1</span>
                <p>Users must provide accurate, current, and complete corporate registration data, including valid tax identification (GST) and legal business documentation.</p>
              </li>
              <li className="flex gap-4">
                <span className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black shrink-0">2.2</span>
                <p>Maintain the confidentiality of login credentials. Users are solely responsible for all activities occurring under their authorized corporate accounts.</p>
              </li>
              <li className="flex gap-4">
                <span className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black shrink-0">2.3</span>
                <p>Users agree to conduct all correspondence and transactions in professional industrial conduct and accordance with global commerce standards.</p>
              </li>
            </ul>
          </section>

          {/* Section: Platform Usage */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Info className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest">3. Platform Usage Guidelines</h2>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">
              The Platform is provided on an "as-is" and "as-available" basis. Users shall not engage in:
            </p>
            <div className="bg-gray-50 dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-secondary rounded-3xl p-6 md:p-8 space-y-4">
              <p className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Prohibited Actions:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                <li className="flex items-center gap-2">Data Scraping or Extraction</li>
                <li className="flex items-center gap-2">Unauthorized API Access</li>
                <li className="flex items-center gap-2">Circumvention of Security Protocols</li>
                <li className="flex items-center gap-2">Transmission of Malicious Code</li>
              </ul>
            </div>
          </section>

          {/* Section: Product & Order Policy */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <FileText className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest">4. Product & Order Policy</h2>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">
              Manufacturers are solely responsible for the accuracy of their product descriptions, technical specifications, and inventory levels. Order acceptance creates a binding contract between the Manufacturer and the Distributor. ADAB acts as a facilitator and is not a party to the underlying sale of goods.
            </p>
          </section>

          {/* Section: Limitation of Liability */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Scale className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest">5. Limitation of Liability</h2>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium italic">
              "To the maximum extent permitted by applicable law, ADAB shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly."
            </p>
          </section>

          {/* Section: Termination */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest">6. Termination</h2>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">
              We reserve the right to suspend or terminate portal access for any user found to be in violation of these terms or engaged in fraudulent activity, without prior notice or liability.
            </p>
          </section>

          {/* Section: Governing Law */}
          <section className="space-y-4 border-t border-gray-100 pt-10">
            <div className="flex items-center gap-3 text-adab-orange mb-2">
              <Scale className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest">7. Governing Law</h2>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">
              These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ADAB is headquartered, without regard to its conflict of law provisions.
            </p>
          </section>

        </div>

        {/* Footer Note */}
        <div className="px-8 py-10 bg-gray-50/50 border-t border-gray-100 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Official Document Repository</p>
          <div className="flex justify-center gap-6">
            <button className="text-xs font-black text-adab-green hover:underline uppercase tracking-widest">Download PDF Version</button>
            <button className="text-xs font-black text-adab-green hover:underline uppercase tracking-widest">Print Agreement</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;