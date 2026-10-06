import React, { useState, useMemo } from 'react';
import {
  Mail,
  User,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Headphones,
  Globe,
  ChevronLeft,
  Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requiredField, validateEmail } from '../../../utils/validation';
import { useNotification } from '../../../context/NotificationContext';
import supportService from '../../../services/supportService';

/**
 * Responsibility: General inquiry form for the portal.
 * Design: Minimalist enterprise form with real-time validation and a persistent information panel.
 */
const ContactUsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const errors = useMemo(() => ({
    name: requiredField(formData.name, 'Name'),
    email: validateEmail(formData.email),
    message: requiredField(formData.message, 'Message'),
  }), [formData]);

  const isFormValid = !Object.values(errors).some(err => err !== null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const response = await supportService.submitContact(formData);
      if (response?.success === false) {
        showError(response?.message || "Submission failed");
        return;
      }

      setIsSuccess(true);
      showSuccess(response?.message || "Form submitted successfully");
      setFormData({ name: '', email: '', phone: '', message: '' });
      setTouched({});
    } catch (err: any) {
      showError(err.response?.data?.message || "Unable to submit inquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = (field: string) => `
    w-full px-5 py-3 border rounded-2xl outline-none transition-all text-sm font-bold tracking-tight
    ${touched[field] && errors[field as keyof typeof errors]
      ? 'border-adab-orange/50 dark:border-adab-orange/30 focus:ring-4 focus:ring-adab-orange/10 focus:border-adab-orange bg-orange-50/10 dark:bg-orange-900/10 placeholder-orange-200 dark:placeholder-orange-900/50' 
      : 'border-gray-200 dark:border-dark-border-primary focus:ring-4 focus:ring-adab-green/10 focus:border-adab-green bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary'}
  `;

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 md:py-20 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="bg-adab-green p-10 flex flex-col items-center text-center text-white">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 border border-white/20">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-none mb-3 uppercase">Inquiry Transmitted</h2>
            <p className="text-green-50 text-sm font-medium opacity-80 uppercase tracking-widest">General Correspondence Registry Complete</p>
          </div>
          <div className="p-10 md:p-14 text-center">
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto mb-10 font-medium">
              Thank you for reaching out. Your message has been routed to our global relations team. Our support team will contact you shortly via the email address provided.
            </p>
            <button
              onClick={() => setIsSuccess(false)}
              className="px-10 py-4 bg-adab-green text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-green-900/20 hover:bg-green-800 transition-all active:scale-95"
            >
              Back to Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Page Header */}
      <div className="mb-10 md:mb-12 border-b border-gray-100 pb-10">
        <div className="flex items-center gap-2 text-adab-orange mb-2">
          <Mail className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Contact Node</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none">Global Reach-out</h1>
        <p className="mt-2 text-sm text-gray-500 font-medium max-w-2xl">Connect with our corporate office for partnerships, technical inquiries, or platform feedback.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-12 items-start">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="px-8 md:px-10 py-6 border-b border-gray-100 dark:border-dark-border-primary bg-gray-50/50 dark:bg-dark-surface-elevated flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-adab-orange" />
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-dark-text-primary">General Inquiry Form</h3>
            </div>
            <div className="p-8 md:p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-gray-300" />
                    <input
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('name')}
                      placeholder="e.g. Robert Smith"
                      className={`pl-11 ${inputClasses('name')}`}
                    />
                  </div>
                  {touched.name && errors.name && (
                    <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest animate-in slide-in-from-top-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.name}</p>
                  )}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gray-300" />
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('email')}
                      placeholder="name@company.com"
                      className={`pl-11 ${inputClasses('email')}`}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest animate-in slide-in-from-top-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.email}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-4 h-4 text-gray-300" />
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('phone')}
                      placeholder="+1 (555) 000-0000"
                      className={`pl-11 ${inputClasses('phone')}`}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Detailed Message</label>
                  <textarea
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('message')}
                    placeholder="Describe your inquiry with relevant context..."
                    className={`resize-none ${inputClasses('message')}`}
                  />
                  {touched.message && errors.message && (
                    <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest animate-in slide-in-from-top-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-10 py-8 bg-gray-50/50 dark:bg-dark-surface-elevated border-t border-gray-100 dark:border-dark-border-primary flex justify-end">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`inline-flex items-center justify-center px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95
                  ${isFormValid && !isSubmitting ? 'bg-adab-green text-white hover:bg-green-800 shadow-green-900/20' : 'bg-gray-100 dark:bg-dark-surface-card text-gray-300 dark:text-dark-text-muted cursor-not-allowed border border-gray-200 dark:border-dark-border-secondary'}`}
              >
                {isSubmitting ? (
                  <>Transmitting...</>
                ) : (
                  <>
                    Send Message
                    <Send className="w-4 h-4 ml-3" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Panel */}
        <div className="space-y-8">
          <div className="bg-adab-orange rounded-[2.5rem] p-10 text-white shadow-2xl shadow-orange-900/30 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Headphones className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <h4 className="text-2xl font-black tracking-tighter uppercase mb-4 leading-none">Operational Support</h4>
              <p className="text-orange-50 text-sm font-medium mb-8 leading-relaxed uppercase tracking-widest">Our support team will contact you shortly regarding your submission.</p>
              <div className="pt-6 border-t border-white/20 space-y-4">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                     <Clock className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Turnaround Time</p>
                     <p className="text-sm font-bold truncate tracking-tight">4 - 6 Business Hours</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                     <Globe className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Regional Centers</p>
                     <p className="text-sm font-bold truncate tracking-tight">APAC, EMEA, AMER</p>
                   </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2.5rem] p-8 shadow-sm">
             <h4 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-dark-text-secondary mb-6 flex items-center gap-3">
               <AlertCircle className="w-5 h-5 text-adab-green" />
               Critical Alerts
             </h4>
             <p className="text-xs text-gray-500 leading-relaxed font-medium">
               For active procurement emergencies or technical platform outages, registered partners should use the dedicated <strong>High Priority Support</strong> channel in the main navigation.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUsPage;
