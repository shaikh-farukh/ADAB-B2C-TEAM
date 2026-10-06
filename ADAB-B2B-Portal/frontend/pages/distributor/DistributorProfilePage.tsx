import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, User, Mail, Phone, MapPin, FileText, Edit3, Save, CheckCircle2, 
  AlertCircle, Briefcase, ShieldCheck, ChevronLeft, ChevronRight, Loader2, Globe, CreditCard
} from 'lucide-react';
import { requiredField, validateEmail, validateMobile, validateGST } from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import authService from '../../services/authService';

interface DistributorProfile {
  companyName: string;
  businessType: string;
  gstNumber: string;
  panNumber: string;
  state: string;
  city: string;
  address: string;
  email: string;
  mobile: string;
  isInternational: boolean;
  selectedCountries: string[];
  vatNumber: string;
  exportHsCode: string;
  preferredCurrency: string;
  marketScope: string;
  companyLogo: string;
}

const EMPTY_DISTRIBUTOR_PROFILE: DistributorProfile = {
  companyName: '',
  businessType: 'pvt',
  gstNumber: '',
  panNumber: '',
  state: '',
  city: '',
  address: '',
  email: '',
  mobile: '',
  isInternational: false,
  selectedCountries: [],
  vatNumber: '',
  exportHsCode: '',
  preferredCurrency: 'INR',
  marketScope: 'Domestic',
  companyLogo: '',
};

const BUSINESS_TYPES = [
  { value: 'pvt', label: 'Private Limited' },
  { value: 'public', label: 'Public Limited' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'proprietorship', label: 'Proprietorship' },
];

const COUNTRIES = [
  { value: 'in', label: 'India' },
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ae', label: 'United Arab Emirates' },
  { value: 'de', label: 'Germany' },
  { value: 'sg', label: 'Singapore' },
];

const CURRENCIES = [
  { value: 'INR', label: 'US Dollar (INR)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'AED', label: 'UAE Dirham (AED)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
];

const DistributorProfilePage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<DistributorProfile>(EMPTY_DISTRIBUTOR_PROFILE);
  const [formData, setFormData] = useState<DistributorProfile>(EMPTY_DISTRIBUTOR_PROFILE);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSafeToSave, setIsSafeToSave] = useState(false);

  useEffect(() => {
    if (currentStep === 5) {
      setIsSafeToSave(false);
      const timer = setTimeout(() => setIsSafeToSave(true), 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await authService.getProfile();
        const apiData = response?.data || response;

        const mappedProfile: DistributorProfile = {
          companyName: apiData?.company_name || '',
          businessType: apiData?.business_type || 'pvt',
          gstNumber: apiData?.gst_number || '',
          panNumber: apiData?.pan_number || '',
          state: apiData?.state || '',
          city: apiData?.city || '',
          address: apiData?.address || '',
          email: apiData?.email || '',
          mobile: apiData?.mobile || '',
          isInternational: apiData?.international_business || false,
          selectedCountries: Array.isArray(apiData?.wish_to_export_countries) 
            ? apiData.wish_to_export_countries.map((c: string) => c.toLowerCase()) 
            : [],
          vatNumber: apiData?.vat_number || '',
          exportHsCode: apiData?.export_hs_code || '',
          preferredCurrency: apiData?.preferred_currency || 'INR',
          marketScope: apiData?.market_scope || (apiData?.international_business ? 'Both' : 'Domestic'),
          companyLogo: apiData?.company_logo || '',
        };

        setProfile(mappedProfile);
        setFormData(mappedProfile);
      } catch (err: any) {
        showError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [showError]);

  const errors = useMemo(() => {
    const errs: Record<string, string | null> = {
      companyName: requiredField(formData.companyName, 'Company Name'),
      businessType: requiredField(formData.businessType, 'Business Category'),
      gstNumber: validateGST(formData.gstNumber),
      panNumber: requiredField(formData.panNumber, 'PAN Number'),
      state: requiredField(formData.state, 'State'),
      city: requiredField(formData.city, 'City'),
      address: requiredField(formData.address, 'Warehouse Address'),
    };

    if (formData.isInternational) {
      if (formData.selectedCountries.length === 0) {
        errs.selectedCountries = 'Select at least one country';
      }
      if (!formData.vatNumber) errs.vatNumber = 'VAT Number is required';
      if (!formData.exportHsCode) errs.exportHsCode = 'HS Code is required';
    }

    return errs;
  }, [formData]);

  const isFormValid = !Object.values(errors).some(err => err !== null);

  const isStep1Valid = !errors.companyName && !errors.businessType;
  const isStep2Valid = true; // Scope selection
  const isStep3Valid = !errors.gstNumber && !errors.panNumber && !errors.state && !errors.city && !errors.address;
  const isStep4Valid = !formData.isInternational || (!errors.selectedCountries && !errors.vatNumber && !errors.exportHsCode);

  const canGoNext = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    if (currentStep === 3) return isStep3Valid;
    if (currentStep === 4) return isStep4Valid;
    return true;
  };

  const handleEditClick = () => {
    setFormData({ ...profile });
    setTouched({});
    setIsEditMode(true);
    setCurrentStep(1);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      showError("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        company_name: formData.companyName.trim(),
        gst_number: formData.gstNumber.toUpperCase().trim(),
        pan_number: formData.panNumber.toUpperCase().trim(),
        state: formData.state.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        international_business: formData.isInternational,
        wish_to_export_countries: formData.selectedCountries,
        vat_number: formData.vatNumber,
        export_hs_code: formData.exportHsCode,
        preferred_currency: formData.preferredCurrency,
        market_scope: formData.marketScope,
        company_logo: formData.companyLogo
      };

      const response = await authService.updateProfile(payload);
      if (response?.success === false) {
        showError(response?.message || "Update failed");
        return;
      }

      const sanitizedData = {
        ...formData,
        companyName: formData.companyName.trim(),
        gstNumber: formData.gstNumber.toUpperCase().trim(),
        panNumber: formData.panNumber.toUpperCase().trim(),
        state: formData.state.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
      };
      setProfile(sanitizedData);
      setFormData(sanitizedData);
      setIsEditMode(false);
      showSuccess(response?.message || "Profile updated successfully");
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB");
      return;
    }

    try {
      setIsSubmitting(true);
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await authService.uploadImage(formDataUpload);
      if (response.success && response.url) {
        setFormData(prev => ({ ...prev, companyLogo: response.url }));
        showSuccess("Logo uploaded successfully");
      } else {
        showError(response.message || "Failed to upload logo");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred during upload");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCountryLabel = (code: string) => COUNTRIES.find(c => c.value === code.toLowerCase())?.label || code;
  const getBusinessTypeLabel = (code: string) => BUSINESS_TYPES.find(b => b.value === code)?.label || code;

  const inputClasses = (field: string) => `
    w-full px-5 py-3 border rounded-2xl outline-none transition-all text-sm font-bold tracking-tight
    ${touched[field] && errors[field as keyof typeof errors]
      ? 'border-adab-orange/50 focus:ring-4 focus:ring-adab-orange/10 focus:border-adab-orange bg-orange-50/10 placeholder-orange-200' 
      : 'border-gray-200 focus:ring-4 focus:ring-adab-green/10 focus:border-adab-green bg-white text-gray-900 dark:text-gray-200'}
  `;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in">
        <Loader2 className="w-10 h-10 text-adab-orange animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Synchronizing Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="mb-10 md:mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8 border-b border-gray-100 pb-10">
        <div>
          <div className="flex items-center gap-2 text-adab-orange mb-2">
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Distributor Account Settings</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-200 tracking-tight leading-none">Enterprise Profile</h1>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-xl">Manage your verified corporate identities, tax credentials, and liaison details for the ADAB network.</p>
        </div>
        
        {!isEditMode ? (
          <button 
            onClick={handleEditClick}
            className="w-full md:w-auto inline-flex items-center justify-center px-8 py-4 bg-adab-orange text-white dark:bg-gray-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/10 active:scale-95"
          >
            <Edit3 className="w-4 h-4 mr-3" />
            Modify Credentials
          </button>
        ) : (
          <button 
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-4 text-xs font-black text-gray-400 hover:text-gray-900 dark:text-gray-200 uppercase tracking-[0.2em] transition-colors"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {isEditMode ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Scope' },
              { num: 3, label: 'Domestic' },
              { num: 4, label: 'International' },
              { num: 5, label: 'Fee Summary' }
            ].map(step => (
              <div 
                key={step.num}
                onClick={() => setCurrentStep(step.num)}
                className={`flex-1 min-w-[120px] px-4 py-4 cursor-pointer transition-all border-b-2 text-center flex flex-col items-center justify-center ${
                  currentStep === step.num 
                  ? 'border-adab-orange bg-white' 
                  : 'border-transparent hover:bg-gray-100/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black mb-2 ${
                  currentStep === step.num ? 'bg-adab-orange text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.num}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  currentStep === step.num ? 'text-gray-900' : 'text-gray-500'
                }`}>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="p-8 md:p-12 min-h-[400px]">
            {currentStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 1: Business Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Registered Company Entity</label>
                    <input name="companyName" value={formData.companyName} onChange={handleInputChange} onBlur={() => handleBlur('companyName')} className={inputClasses('companyName')} />
                    {touched.companyName && errors.companyName && (
                      <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.companyName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Business Category / Type</label>
                    <select name="businessType" value={formData.businessType} onChange={handleInputChange} className={inputClasses('businessType')}>
                      {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Company Logo</label>
                    <div className="flex items-center gap-4">
                      {formData.companyLogo ? (
                        <div className="relative w-14 h-14 rounded-2xl border-2 border-gray-100 overflow-hidden shrink-0 group">
                          <img src={formData.companyLogo} alt="Logo" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                            <Edit3 className="w-4 h-4 text-white" />
                          </div>
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} disabled={isSubmitting} />
                        </div>
                      ) : (
                        <label className="w-14 h-14 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-adab-orange hover:bg-orange-50/50 transition-colors shrink-0 overflow-hidden relative">
                          <div className="text-gray-400 font-black text-2xl leading-none mb-1">+</div>
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} disabled={isSubmitting} />
                        </label>
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-bold">Upload a clear logo (JPG, PNG).</p>
                        <p className="text-[10px] text-gray-400 font-medium">Max size: 5MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 2: Market Scope Selection</h3>
                <p className="text-sm text-gray-500 mb-6">Select the regions where you plan to distribute or source products.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'Domestic', title: 'Domestic Only', desc: 'Trade strictly within your home country.', icon: MapPin },
                    { id: 'International', title: 'International', desc: 'Export and Import strictly overseas.', icon: Globe },
                    { id: 'Both', title: 'Both', desc: 'Trade both domestically and internationally.', icon: Building2 }
                  ].map(scope => {
                    const isSelected = formData.marketScope === scope.id;
                    return (
                      <div 
                        key={scope.id}
                        onClick={() => setFormData(p => ({ 
                          ...p, 
                          marketScope: scope.id, 
                          isInternational: scope.id !== 'Domestic' 
                        }))}
                        className={`p-8 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-adab-orange bg-orange-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <scope.icon className={`w-10 h-10 mb-6 ${isSelected ? 'text-adab-orange' : 'text-gray-300'}`} />
                        <h4 className={`font-black mb-2 tracking-tight ${isSelected ? 'text-adab-orange' : 'text-gray-900'}`}>{scope.title}</h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{scope.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 3: Domestic Compliance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">GST Identification</label>
                    <input name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} onBlur={() => handleBlur('gstNumber')} className={`uppercase ${inputClasses('gstNumber')}`} />
                    {touched.gstNumber && errors.gstNumber && (
                      <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.gstNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">PAN Number</label>
                    <input name="panNumber" value={formData.panNumber} onChange={handleInputChange} onBlur={() => handleBlur('panNumber')} className={`uppercase ${inputClasses('panNumber')}`} />
                    {touched.panNumber && errors.panNumber && (
                      <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.panNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">State</label>
                    <input name="state" value={formData.state} onChange={handleInputChange} onBlur={() => handleBlur('state')} className={inputClasses('state')} />
                    {touched.state && errors.state && (
                      <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.state}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">City</label>
                    <input name="city" value={formData.city} onChange={handleInputChange} onBlur={() => handleBlur('city')} className={inputClasses('city')} />
                    {touched.city && errors.city && (
                      <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.city}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Registered Warehouse Address</label>
                    <textarea name="address" rows={3} value={formData.address} onChange={handleInputChange} onBlur={() => handleBlur('address')} className={`resize-none ${inputClasses('address')}`} />
                    {touched.address && errors.address && (
                      <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.address}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 4: International Compliance</h3>
                
                {!formData.isInternational ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
                    <Globe className="w-16 h-16 text-gray-300 mb-6" />
                    <p className="text-gray-900 font-black text-lg">You selected Domestic Only.</p>
                    <p className="text-sm font-medium text-gray-500 mt-2">This step is not required for your account.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Export Regions / Countries</label>
                      <select multiple className="w-full h-32 p-4 border border-gray-200 rounded-2xl text-sm font-bold bg-white" value={formData.selectedCountries} disabled={isSubmitting} onChange={(e) => {
                        const options = e.target.options;
                        const selected: string[] = [];
                        for (let i = 0; i < options.length; i++) if (options[i].selected) selected.push(options[i].value);
                        setFormData(p => ({ ...p, selectedCountries: selected }));
                      }}>
                        {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      {touched.selectedCountries && errors.selectedCountries && (
                        <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.selectedCountries}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Import VAT Number</label>
                      <input name="vatNumber" value={formData.vatNumber} onChange={handleInputChange} onBlur={() => handleBlur('vatNumber')} className={inputClasses('vatNumber')} disabled={isSubmitting} />
                      {touched.vatNumber && errors.vatNumber && (
                        <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.vatNumber}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Default Import HS Code</label>
                      <input name="exportHsCode" value={formData.exportHsCode} onChange={handleInputChange} onBlur={() => handleBlur('exportHsCode')} className={inputClasses('exportHsCode')} disabled={isSubmitting} />
                      {touched.exportHsCode && errors.exportHsCode && (
                        <p className="mt-2 text-[10px] text-adab-orange font-black flex items-center gap-2 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> {errors.exportHsCode}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Settlement Currency</label>
                      <select name="preferredCurrency" value={formData.preferredCurrency} onChange={handleInputChange} className={inputClasses('preferredCurrency')} disabled={isSubmitting}>
                        {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 5: Dynamic Platform Setup Fee Summary</h3>
                
                <div className="max-w-xl mx-auto mt-10">
                  <div className="bg-gradient-to-br from-gray-900 to-black p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-10">
                      <CreditCard className="w-48 h-48" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 mb-8">
                        <span className="w-2.5 h-2.5 rounded-full bg-adab-orange animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Pricing</span>
                      </div>

                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Plan Selected</h4>
                      <p className="text-3xl font-black tracking-tight mb-10">
                        {formData.isInternational ? 'Global Exporter (Premium Tier)' : 'Domestic Supplier (Standard Tier)'}
                      </p>

                      <div className="space-y-5 mb-10">
                        <div className="flex justify-between items-center pb-5 border-b border-white/10">
                          <span className="text-sm font-bold text-gray-300">Standard Subscription Fee</span>
                          <span className="font-mono font-bold">₹199.00</span>
                        </div>
                        <div className="flex justify-between items-center pb-5 border-b border-white/10 text-adab-orange">
                          <span className="text-sm font-bold">Early-Bird Launch Promotion</span>
                          <span className="font-mono font-bold">-100% (-₹199.00)</span>
                        </div>
                        <div className="flex justify-between items-center pt-3">
                          <span className="text-lg font-black uppercase tracking-widest">Total Payable Today</span>
                          <span className="text-4xl font-black text-white">₹0.00</span>
                        </div>
                      </div>

                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
                        <p className="text-xs font-black text-adab-orange uppercase tracking-widest leading-relaxed">✨ Early Bird Founder Offer: Premium Features Activated for Free!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className={`px-6 py-3 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 ${currentStep === 1 ? 'invisible' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {currentStep < 5 ? (
              <button 
                type="button"
                disabled={!canGoNext()}
                onClick={(e) => { e.preventDefault(); setCurrentStep(prev => Math.min(5, prev + 1)); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                  canGoNext() ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleSave}
                disabled={!isFormValid || isSubmitting || !isSafeToSave}
                className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95
                  ${isFormValid && !isSubmitting && isSafeToSave ? 'bg-adab-orange text-white hover:bg-orange-700 shadow-xl shadow-orange-900/10' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSubmitting ? 'Saving...' : 'Complete Profile & Save'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          <div className="md:col-span-2 space-y-10">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="px-10 py-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 flex items-center justify-center text-adab-orange shadow-sm overflow-hidden">
                  {profile.companyLogo ? (
                    <img src={profile.companyLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Briefcase className="w-6 h-6" />
                  )}
                </div>
                <h3 className="font-black text-gray-900 dark:text-gray-200 text-sm uppercase tracking-widest">Enterprise Credentials & Compliance</h3>
              </div>
              <div className="p-10 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-y-10 md:gap-y-12 md:gap-x-16">
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Registered Company Domain</p>
                  <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-200 tracking-tighter leading-none">{profile.companyName}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Business Category</p>
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-adab-orange" />
                    <p className="text-base font-bold text-gray-800">{getBusinessTypeLabel(profile.businessType)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Market Scope</p>
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-adab-orange" />
                    <p className="text-base font-bold text-gray-800">{profile.marketScope}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Validated GST ID</p>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-adab-orange" />
                    <p className="text-base font-mono font-black text-gray-800">{profile.gstNumber}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Validated PAN ID</p>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-adab-orange" />
                    <p className="text-base font-mono font-black text-gray-800">{profile.panNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="md:col-span-2 pt-10 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Operational Warehouse Address</p>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100 shrink-0"><MapPin className="w-5 h-5" /></div>
                    <p className="text-base font-bold text-gray-600 leading-relaxed pt-1.5">{profile.address}, {profile.city}, {profile.state}</p>
                  </div>
                </div>
              </div>
            </div>

            {profile.isInternational && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                 <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                  <Globe className="w-5 h-5 text-adab-orange" />
                  <h3 className="font-bold text-gray-900">Import Compliance</h3>
                </div>
                <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">VAT Number</p>
                     <p className="text-sm font-mono font-bold text-gray-700">{profile.vatNumber || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">HS Code</p>
                     <p className="text-sm font-mono font-bold text-gray-700">{profile.exportHsCode || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Preferred Currency</p>
                     <p className="text-sm font-bold text-gray-700">{profile.preferredCurrency}</p>
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-10">
            <div className="bg-adab-orange rounded-[2.5rem] p-10 md:p-12 text-white shadow-2xl shadow-orange-900/30 flex flex-col h-full overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <ShieldCheck className="w-48 h-48" />
               </div>
               <div className="relative z-10">
                 <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                   <ShieldCheck className="w-8 h-8" />
                 </div>
                 <h4 className="font-black text-2xl tracking-tighter leading-none mb-4 uppercase">Verified Distributor</h4>
                 <p className="text-orange-50 text-sm font-bold leading-relaxed mb-10 opacity-80 uppercase tracking-widest">Trust Engine Identity Phase 1 Complete</p>
                 <div className="mt-auto flex flex-col gap-3">
                    <button className="w-full py-4 bg-white text-adab-orange rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-orange-50 transition-all active:scale-95">
                      Download Merchant Certificate
                    </button>
                    <button 
                      onClick={() => navigate('/common/kyb-verification')}
                      className="w-full py-4 bg-orange-900/40 border border-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-orange-900/60 transition-all active:scale-95"
                    >
                      Go to KYB Verification Portal
                    </button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributorProfilePage;
