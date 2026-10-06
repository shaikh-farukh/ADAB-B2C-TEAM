import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LifeBuoy,
  MessageSquare,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  PhoneCall,
  Mail,
  ChevronRight,
  HelpCircle,
  FileText,
  History
} from 'lucide-react';
import { requiredField } from '../../../utils/validation';
import { useNotification } from '../../../context/NotificationContext';
import supportService from '../../../services/supportService';
import { ImageUploader } from '../../../components/ui/ImageUploader';

interface SupportTicket {
  type: string;
  subject: string;
  description: string;
}

const HelpSupportPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState<SupportTicket>({
    type: '',
    subject: '',
    description: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState(`ADAB-TK-${Math.floor(100000 + Math.random() * 900000)}`);
  const [issueTypes, setIssueTypes] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    const fetchIssueTypes = async () => {
      try {
        const response = await supportService.getIssueTypes();
        const data = response?.data || [];
        setIssueTypes(
          (data as string[]).map((item) => ({ value: item, label: item }))
        );
      } catch {
        setIssueTypes([
          { value: 'Technical Issue', label: 'Technical Issue' },
          { value: 'Order Issue', label: 'Order Issue' },
          { value: 'Payment Problem', label: 'Payment Problem' },
          { value: 'General Inquiry', label: 'General Inquiry' },
        ]);
      }
    };

    fetchIssueTypes();
  }, []);

  const errors = useMemo(() => ({
    type: requiredField(formData.type, 'Issue Type'),
    subject: requiredField(formData.subject, 'Subject'),
    description: requiredField(formData.description, 'Description'),
  }), [formData]);

  const isFormValid = !Object.values(errors).some(err => err !== null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      showError("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await supportService.createTicket({
        issue_type: formData.type,
        subject: formData.subject,
        description: formData.description
      });
      if (response?.success === false) {
        showError(response?.message || "Ticket creation failed");
        return;
      }

      const data = response?.data || response;
      const generatedTicketId = data?.ticket_id || data?.id || data?.ticketId;
      if (generatedTicketId) {
        setTicketId(String(generatedTicketId));
      }

      setIsSuccess(true);
      showSuccess(response?.message || "Ticket created successfully");
    } catch (err: any) {
      showError(err.response?.data?.message || "Unable to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ type: '', subject: '', description: '' });
    setTouched({});
    setIsSuccess(false);
    setTicketId(`ADAB-TK-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const inputClasses = (field: string) => `
    w-full px-5 py-3 border rounded-2xl outline-none transition-all text-sm font-bold tracking-tight
    ${touched[field] && errors[field as keyof typeof errors]
      ? 'border-adab-orange/50 focus:ring-4 focus:ring-adab-orange/10 focus:border-adab-orange bg-orange-50/10 dark:bg-orange-900/20 placeholder-orange-200' 
      : 'border-gray-200 dark:border-dark-border-secondary focus:ring-4 focus:ring-adab-green/10 focus:border-adab-green bg-white dark:bg-dark-surface-card text-gray-900 dark:text-dark-text-secondary'}
  `;

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 md:py-20 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="bg-adab-green p-10 flex flex-col items-center text-center text-white">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 border border-white/20">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-none mb-3 uppercase">Ticket Transmitted</h2>
            <p className="text-green-50 text-sm font-medium opacity-80 uppercase tracking-widest">Support Request Registry Complete</p>
          </div>
          <div className="p-10 md:p-14 text-center">
            <div className="inline-block px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl mb-8">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Reference Identifier</p>
              <p className="text-xl font-mono font-black text-gray-900 dark:text-dark-text-secondary">{ticketId}</p>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto mb-10">
              Your inquiry has been logged in the ADAB Support Engine. An industrial liaison will review the details and contact you via your registered work email within 4-6 business hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/common/tickets')}
                className="px-10 py-4 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary text-gray-500 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:border-adab-green hover:text-adab-green transition-all"
              >
                View History
              </button>
              <button
                onClick={handleReset}
                className="px-10 py-4 bg-adab-green text-white dark:bg-dark-app-secondary rounded-3xl dark:border dark:border-dark-border-secondary text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/20 hover:bg-green-800 transition-all active:scale-95"
              >
                Raise Another Query
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Polished Page Header */}
      <div className="mb-10 md:mb-12 border-b border-gray-100 pb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-adab-orange mb-2">
            <LifeBuoy className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Partner Assistance Center</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none">Support Registry</h1>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-2xl">Raise industrial queries, report technical anomalies, or seek clarification on procurement workflows.</p>
        </div>
        <button
          onClick={() => navigate('/common/tickets')}
          className="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all shadow-sm active:scale-95 group"
        >
          <History className="w-4 h-4 mr-3 group-hover:text-adab-orange transition-colors" />
          Support History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-12 items-start">
        {/* Support Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="px-8 md:px-10 py-6 border-b border-gray-100 dark:border-dark-border-primary bg-gray-50/50 dark:bg-dark-surface-elevated flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-adab-orange" />
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-dark-text-secondary">New Support Ticket</h3>
            </div>
            <div className="p-8 md:p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Issue Category</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('type')}
                    className={`bg-white dark:bg-dark-surface-card ${inputClasses('type')}`}
                  >
                    <option value="">Select a Category</option>
                    {issueTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {touched.type && errors.type && (
                    <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest animate-in slide-in-from-top-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.type}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Brief Subject</label>
                  <input
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('subject')}
                    placeholder="e.g. Discrepancy in PO-99201 fulfillment status"
                    className={inputClasses('subject')}
                  />
                  {touched.subject && errors.subject && (
                    <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest animate-in slide-in-from-top-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.subject}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Detailed Description</label>
                  <textarea
                    name="description"
                    rows={6}
                    value={formData.description}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('description')}
                    placeholder="Please provide as much operational context as possible to expedite the resolution process..."
                    className={`resize-none ${inputClasses('description')}`}
                  />
                  {touched.description && errors.description && (
                    <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest animate-in slide-in-from-top-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.description}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <ImageUploader
                    label="Evidence / Attachments (Optional)"
                    onUploadSuccess={(url) => console.log('Support attachment uploaded:', url)}
                  />
                </div>
              </div>
            </div>
            <div className="px-10 py-8 bg-gray-50/50 dark:bg-dark-surface-elevated border-t border-gray-100 dark:border-dark-border-primary flex justify-end">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`inline-flex items-center justify-center px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95
                  ${isFormValid && !isSubmitting ? 'bg-adab-green text-white hover:bg-green-800 shadow-green-900/20' : 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'}`}
              >
                {isSubmitting ? (
                  <>Transmitting...</>
                ) : (
                  <>
                    Transmit Ticket
                    <Send className="w-4 h-4 ml-3" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] p-8 shadow-sm group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-adab-orange shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-dark-text-secondary">Support Availability</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Liaison Team</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-500 uppercase tracking-widest">Mon - Fri</span>
                <span className="font-black text-gray-900 dark:text-dark-text-secondary uppercase">24 Hours</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-500 uppercase tracking-widest">Sat - Sun</span>
                <span className="font-black text-gray-900 dark:text-dark-text-secondary uppercase">09:00 - 18:00 IST</span>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-50">
                 <p className="text-[10px] leading-relaxed text-gray-400 font-medium italic">All queries are prioritized based on SLA tier agreements.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] p-8 shadow-sm">
             <h4 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-dark-text-secondary mb-6 flex items-center gap-3">
               <HelpCircle className="w-5 h-5 text-adab-green" />
               Direct Liaison
             </h4>
             <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-100 dark:border-dark-border-primary rounded-2xl flex items-center gap-4 hover:bg-white dark:hover:bg-dark-surface-hover hover:border-adab-green transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary flex items-center justify-center text-gray-400 group-hover:text-adab-green transition-colors shrink-0">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Corporate Line</p>
                    <p className="text-xs font-black text-gray-900 dark:text-dark-text-secondary">+1-800-ADAB-SUPPORT</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-100 dark:border-dark-border-primary rounded-2xl flex items-center gap-4 hover:bg-white dark:hover:bg-dark-surface-hover hover:border-adab-orange transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary flex items-center justify-center text-gray-400 group-hover:text-adab-orange transition-colors shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Node</p>
                    <p className="text-xs font-black text-gray-900 dark:text-dark-text-secondary truncate">help@adab.portal</p>
                  </div>
                </div>
             </div>
          </div>

          <div className="bg-adab-orange rounded-[2.5rem] p-10 text-white shadow-2xl shadow-orange-900/30 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <LifeBuoy className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <h4 className="text-2xl font-black tracking-tighter uppercase mb-4 leading-none">Resource Hub</h4>
              <p className="text-orange-50 text-sm font-medium opacity-80 mb-8 leading-relaxed uppercase tracking-widest">Access technical manuals and workflow guides.</p>
              <button className="w-full py-4 bg-white text-adab-orange rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-orange-50 transition-all flex items-center justify-center gap-2">
                Knowledge Base
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupportPage;
