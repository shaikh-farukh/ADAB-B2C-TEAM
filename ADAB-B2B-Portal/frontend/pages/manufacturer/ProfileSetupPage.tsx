import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Upload, 
  Save, 
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { 
  requiredField, 
  validateEmail, 
  validateMobile, 
  validateGST 
} from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import authService from '../../services/authService';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import { ImageUploader } from '../../components/ui/ImageUploader';

/**
 * Responsibility: UI-only Profile Setup page for Manufacturer users with enterprise validation.
 * Features: Multi-section form, real-time field validation, and conditional international market logic.
 */
const ProfileSetupPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    businessType: '',
    gstNumber: '',
    address: '',
    country: 'in',
    email: '',
    mobile: '',
    isInternational: null as boolean | null,
    selectedCountries: [] as string[],
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived validation state
  const errors = useMemo(() => {
    const errs: Record<string, string | null> = {
      companyName: requiredField(formData.companyName, 'Company Legal Name'),
      businessType: requiredField(formData.businessType, 'Business Type'),
      gstNumber: validateGST(formData.gstNumber),
      address: requiredField(formData.address, 'Registered Address'),
      country: requiredField(formData.country, 'Country'),
      email: validateEmail(formData.email),
      mobile: validateMobile(formData.mobile),
    };

    // Conditional validation for international business
    if (formData.isInternational === true) {
      if (formData.selectedCountries.length === 0) {
        errs.selectedCountries = 'Please select at least one export country';
      } else {
        errs.selectedCountries = null;
      }
    } else if (formData.isInternational === null) {
      errs.isInternational = 'Please select your market reach preference';
    }

    return errs;
  }, [formData]);

  const isFormValid = !Object.values(errors).some(err => err !== null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleCountryToggle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selected: string[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setFormData(prev => ({ ...prev, selectedCountries: selected }));
    setTouched(prev => ({ ...prev, selectedCountries: true }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      setIsSubmitting(true);
      const response = await authService.updateProfile({
        company_name: formData.companyName,
        business_type: formData.businessType,
        gst_number: formData.gstNumber,
        address: formData.address,
        country: formData.country,
        email: formData.email,
        mobile: formData.mobile,
        international_business: !!formData.isInternational,
        wish_to_export_countries: formData.selectedCountries,
      });
      if (response?.success === false) {
        showError(response?.message || "Failed to save profile");
        return;
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      showSuccess(response?.message || "Profile saved successfully");
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = (field: string) => {
    if (touched[field] && errors[field]) {
      return (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-adab-orange animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="w-3.5 h-3.5" />
          {errors[field]}
        </div>
      );
    }
    return null;
  };

  const inputClasses = (field: string) => `
    w-full px-4 py-2.5 border rounded-lg outline-none transition-all
    ${touched[field] && errors[field]
      ? 'border-adab-orange/50 focus:ring-2 focus:ring-adab-orange/20 focus:border-adab-orange' 
      : 'border-gray-300 focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green'}
  `;

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Profile Setup</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Complete your business profile to start receiving orders.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-adab-green bg-green-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-green-100">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Onboarding Phase
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8" noValidate>
        {/* Section 1: Business Details */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-adab-green" />
            <h3 className="font-bold text-gray-900">Business Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Legal Name</label>
              <input 
                name="companyName"
                type="text" 
                value={formData.companyName}
                onChange={handleInputChange}
                onBlur={() => handleBlur('companyName')}
                placeholder="e.g. ADAB Manufacturing Solutions"
                className={inputClasses('companyName')}
              />
              {renderError('companyName')}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Type</label>
              <select 
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                onBlur={() => handleBlur('businessType')}
                className={`bg-white ${inputClasses('businessType')}`}
              >
                <option value="">Select Type</option>
                <option value="pvt">Private Limited</option>
                <option value="public">Public Limited</option>
                <option value="partnership">Partnership</option>
                <option value="proprietorship">Proprietorship</option>
              </select>
              {renderError('businessType')}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST Number</label>
              <div className="relative">
                <FileText className={`absolute left-3 top-3 w-4 h-4 transition-colors ${touched.gstNumber && errors.gstNumber ? 'text-adab-orange' : 'text-gray-400'}`} />
                <input 
                  name="gstNumber"
                  type="text" 
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('gstNumber')}
                  placeholder="22AAAAA0000A1Z5"
                  className={`pl-10 uppercase ${inputClasses('gstNumber')}`}
                />
              </div>
              {renderError('gstNumber')}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Registered Address</label>
              <div className="relative">
                <MapPin className={`absolute left-3 top-3 w-4 h-4 transition-colors ${touched.address && errors.address ? 'text-adab-orange' : 'text-gray-400'}`} />
                <textarea 
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('address')}
                  placeholder="Street address, City, State, Zip Code"
                  className={`pl-10 resize-none ${inputClasses('address')}`}
                ></textarea>
              </div>
              {renderError('address')}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
              <select 
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                onBlur={() => handleBlur('country')}
                className={`bg-white ${inputClasses('country')}`}
              >
                <option value="in">India</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="ae">UAE</option>
              </select>
              {renderError('country')}
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Mail className="w-5 h-5 text-adab-green" />
            <h3 className="font-bold text-gray-900">Contact Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Primary Business Email</label>
              <div className="relative">
                <Mail className={`absolute left-3 top-3 w-4 h-4 transition-colors ${touched.email && errors.email ? 'text-adab-orange' : 'text-gray-400'}`} />
                <input 
                  name="email"
                  type="email" 
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('email')}
                  placeholder="business@example.com"
                  className={`pl-10 ${inputClasses('email')}`}
                />
              </div>
              {renderError('email')}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile Number</label>
              <div className="relative">
                <Phone className={`absolute left-3 top-3 w-4 h-4 transition-colors ${touched.mobile && errors.mobile ? 'text-adab-orange' : 'text-gray-400'}`} />
                <input 
                  name="mobile"
                  type="tel" 
                  value={formData.mobile}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('mobile')}
                  placeholder="+91 98765 43210"
                  className={`pl-10 ${inputClasses('mobile')}`}
                />
              </div>
              {renderError('mobile')}
            </div>
          </div>
        </div>

        {/* Section 3: Brand Identity */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
            <Upload className="w-5 h-5 text-adab-green" />
            <h3 className="font-bold text-gray-900 dark:text-gray-200">Brand Identity</h3>
          </div>
          <div className="p-6">
            <ImageUploader 
              label="Company Logo (Optional)" 
              onUploadSuccess={(url) => console.log('Logo uploaded:', url)} 
            />
          </div>
        </div>

        {/* Section 4: KYB Documents (Cloudinary) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
            <FileText className="w-5 h-5 text-adab-green" />
            <h3 className="font-bold text-gray-900 dark:text-gray-200">Business Documents (KYB)</h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Business Verification (KYB/KYC) is now handled in a dedicated secure portal. Please complete your profile details first, then proceed to the verification portal.</p>
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => navigate('/common/kyb-verification')}
                className="px-6 py-3 bg-adab-green text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                Go to KYB Verification Portal
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Market Reach */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Globe className="w-5 h-5 text-adab-orange" />
            <h3 className="font-bold text-gray-900">Market Reach</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-4">Do you do International Business?</p>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, isInternational: true }))}
                  className={`flex-1 flex items-center justify-center py-3 border-2 rounded-xl font-bold transition-all ${formData.isInternational === true ? 'border-adab-orange bg-orange-50 text-adab-orange' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  Yes
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, isInternational: false, selectedCountries: [] }))}
                  className={`flex-1 flex items-center justify-center py-3 border-2 rounded-xl font-bold transition-all ${formData.isInternational === false ? 'border-adab-green bg-green-50 text-adab-green' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  No
                </button>
              </div>
              {renderError('isInternational')}
            </div>

            {formData.isInternational && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                  Countries You Export To
                  <span className="text-[10px] bg-orange-100 text-adab-orange px-2 py-0.5 rounded-full uppercase tracking-tighter">Export Mode Active</span>
                </label>
                <div className="relative group">
                   <select 
                    multiple
                    value={formData.selectedCountries}
                    onChange={handleCountryToggle}
                    onBlur={() => handleBlur('selectedCountries')}
                    className={`min-h-[120px] bg-white ${inputClasses('selectedCountries')}`}
                  >
                    <option value="us">United States</option>
                    <option value="ca">Canada</option>
                    <option value="de">Germany</option>
                    <option value="fr">France</option>
                    <option value="ae">UAE</option>
                    <option value="sg">Singapore</option>
                    <option value="au">Australia</option>
                  </select>
                  <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic flex items-center gap-1">
                    <InfoIcon /> Hold Ctrl/Cmd to select multiple countries.
                  </p>
                </div>
                {renderError('selectedCountries')}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <button 
            type="button"
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg active:scale-[0.98] 
              ${isSaved ? 'bg-green-600' : 
                isFormValid && !isSubmitting ? 'bg-adab-green hover:bg-green-800' : 'bg-gray-300 cursor-not-allowed opacity-80'}`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Saved Successfully
              </>
            ) : isSubmitting ? (
              <>
                <Save className="w-5 h-5 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const InfoIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default ProfileSetupPage;
