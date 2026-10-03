import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Globe, Mail, Phone, MapPin, FileText, Edit3, Save, X, CheckCircle2,
  AlertCircle, Briefcase, ExternalLink, Loader2, ChevronRight, ChevronLeft, CreditCard
} from 'lucide-react';
import { requiredField, validateEmail, validateMobile, validateGST } from '../../utils/validation';
import { useNotification } from '../../context/NotificationContext';
import authService from '../../services/authService';

interface ManufacturerProfile {
  companyName: string;
  businessType: string;
  gstNumber: string;
  panNumber: string;
  state: string;
  city: string;
  address: string; // Used as warehouse address
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

const EMPTY_MANUFACTURER_PROFILE: ManufacturerProfile = {
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

const ProfilePage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<ManufacturerProfile>(EMPTY_MANUFACTURER_PROFILE);
  const [formData, setFormData] = useState<ManufacturerProfile>(EMPTY_MANUFACTURER_PROFILE);
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
      setIsLoading(true);
      try {
        const response = await authService.getProfile();
        if (response.success && response.data) {
          const apiData = response.data;
          const mappedProfile: ManufacturerProfile = {
            companyName: apiData.company_name || '',
            businessType: apiData.business_type || 'pvt',
            gstNumber: apiData.gst_number || '',
            panNumber: apiData.pan_number || '',
            state: apiData.state || '',
            city: apiData.city || '',
            address: apiData.address || '',
            email: apiData.email || '',
            mobile: apiData.mobile || '',
            isInternational: apiData.international_business || false,
            selectedCountries: Array.isArray(apiData.wish_to_export_countries) 
              ? apiData.wish_to_export_countries.map((c: string) => c.toLowerCase()) 
              : [],
            vatNumber: apiData.vat_number || '',
            exportHsCode: apiData.export_hs_code || '',
            preferredCurrency: apiData.preferred_currency || 'INR',
            marketScope: apiData.market_scope || (apiData.international_business ? 'Both' : 'Domestic'),
            companyLogo: apiData.company_logo || '',
          };
          setProfile(mappedProfile);
          setFormData(mappedProfile);
        } else {
          showError(response.message || "Failed to load profile");
        }
      } catch (err: any) {
        showError(err.response?.data?.message || "An error occurred while fetching your profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [showError]);

  const errors = useMemo(() => {
    const errs: Record<string, string | null> = {
      companyName: requiredField(formData.companyName, 'Company Legal Name'),
      businessType: requiredField(formData.businessType, 'Business Type'),
      gstNumber: validateGST(formData.gstNumber),
      panNumber: requiredField(formData.panNumber, 'PAN Number'),
      state: requiredField(formData.state, 'State'),
      city: requiredField(formData.city, 'City'),
      address: requiredField(formData.address, 'Registered Warehouse Address'),
    };

    if (formData.isInternational) {
      if (formData.selectedCountries.length === 0) {
        errs.selectedCountries = 'Select at least one export country';
      }
      if (!formData.vatNumber) errs.vatNumber = 'VAT Number is required for international trade';
      if (!formData.exportHsCode) errs.exportHsCode = 'HS Code is required for exports';
    }

    return errs;
  }, [formData]);

  const isFormValid = !Object.values(errors).some(err => err !== null);

  const isStep1Valid = !errors.companyName && !errors.businessType;
  const isStep2Valid = true; // Market scope selection
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      showError("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const apiPayload = {
        company_name: formData.companyName,
        gst_number: formData.gstNumber,
        pan_number: formData.panNumber,
        state: formData.state,
        city: formData.city,
        address: formData.address,
        international_business: formData.isInternational,
        wish_to_export_countries: formData.selectedCountries,
        vat_number: formData.vatNumber,
        export_hs_code: formData.exportHsCode,
        preferred_currency: formData.preferredCurrency,
        market_scope: formData.marketScope,
        company_logo: formData.companyLogo
      };

      const response = await authService.updateProfile(apiPayload);
      if (response.success) {
        setProfile({ ...formData });
        setIsEditMode(false);
        showSuccess(response.message || "Profile updated successfully");
      } else {
        showError(response.message || "Update failed");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred while updating your profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm font-medium
    ${touched[field] && errors[field]
      ? 'border-adab-orange/50 focus:ring-2 focus:ring-adab-orange/20 focus:border-adab-orange bg-orange-50/10' 
      : 'border-gray-300 focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green bg-white'}
  `;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in">
        <Loader2 className="w-10 h-10 text-adab-green animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Synchronizing Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1">
            <Building2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Enterprise Identity</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Business Profile</h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500 font-medium">Manage your corporate credentials and distribution preferences.</p>
        </div>
        
        {!isEditMode ? (
          <button 
            onClick={handleEditClick}
            className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 bg-adab-green text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-green-800 transition-all shadow-lg active:scale-[0.98]"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </button>
        ) : (
          <button 
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full md:w-auto px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {isEditMode ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Wizard Header */}
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
                  ? 'border-adab-green bg-white' 
                  : 'border-transparent hover:bg-gray-100/50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${
                  currentStep === step.num ? 'bg-adab-green text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.num}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  currentStep === step.num ? 'text-gray-900' : 'text-gray-500'
                }`}>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="p-6 md:p-10 min-h-[400px]">
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 1: Business Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Company Legal Name</label>
                    <input 
                      name="companyName" value={formData.companyName} onChange={handleInputChange} onBlur={() => handleBlur('companyName')}
                      className={inputClasses('companyName')} disabled={isSubmitting}
                    />
                    {touched.companyName && errors.companyName && (
                      <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.companyName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Business Category / Type</label>
                    <select name="businessType" value={formData.businessType} onChange={handleInputChange} className={inputClasses('businessType')} disabled={isSubmitting}>
                      {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Company Logo</label>
                    <div className="flex items-center gap-3">
                      {formData.companyLogo ? (
                        <div className="relative w-11 h-11 rounded-lg border border-gray-200 overflow-hidden shrink-0 group">
                          <img src={formData.companyLogo} alt="Logo" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                            <Edit3 className="w-4 h-4 text-white" />
                          </div>
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} disabled={isSubmitting} />
                        </div>
                      ) : (
                        <label className="w-11 h-11 rounded-lg border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-adab-green hover:bg-green-50/50 transition-colors shrink-0 relative overflow-hidden">
                          <span className="text-gray-400 text-lg leading-none">+</span>
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} disabled={isSubmitting} />
                        </label>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold">Upload logo (JPG, PNG)</p>
                        <p className="text-[9px] text-gray-400">Max size: 5MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 2: Market Scope Selection</h3>
                <p className="text-sm text-gray-500 mb-6">Select the regions where you plan to distribute or source products. This determines your compliance requirements.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-adab-green bg-green-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <scope.icon className={`w-8 h-8 mb-4 ${isSelected ? 'text-adab-green' : 'text-gray-400'}`} />
                        <h4 className={`font-bold mb-1 ${isSelected ? 'text-adab-green' : 'text-gray-900'}`}>{scope.title}</h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{scope.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 3: Domestic Compliance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">GSTIN Number</label>
                    <input name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} onBlur={() => handleBlur('gstNumber')} className={`uppercase ${inputClasses('gstNumber')}`} disabled={isSubmitting} />
                    {touched.gstNumber && errors.gstNumber && (
                      <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.gstNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">PAN Number</label>
                    <input name="panNumber" value={formData.panNumber} onChange={handleInputChange} onBlur={() => handleBlur('panNumber')} className={`uppercase ${inputClasses('panNumber')}`} disabled={isSubmitting} />
                    {touched.panNumber && errors.panNumber && (
                      <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.panNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">State</label>
                    <input name="state" value={formData.state} onChange={handleInputChange} onBlur={() => handleBlur('state')} className={inputClasses('state')} disabled={isSubmitting} />
                    {touched.state && errors.state && (
                      <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.state}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">City</label>
                    <input name="city" value={formData.city} onChange={handleInputChange} onBlur={() => handleBlur('city')} className={inputClasses('city')} disabled={isSubmitting} />
                    {touched.city && errors.city && (
                      <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.city}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Registered Warehouse Address</label>
                    <textarea name="address" rows={3} value={formData.address} onChange={handleInputChange} onBlur={() => handleBlur('address')} className={`resize-none ${inputClasses('address')}`} disabled={isSubmitting} />
                    {touched.address && errors.address && (
                      <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.address}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 4: International Compliance</h3>
                
                {!formData.isInternational ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                    <Globe className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 font-bold">You selected Domestic Only.</p>
                    <p className="text-xs text-gray-400 mt-1">This step is not required for your account.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Export Regions / Countries</label>
                      <select multiple className="w-full h-32 p-2 border border-gray-200 rounded-lg text-xs" value={formData.selectedCountries} disabled={isSubmitting} onChange={(e) => {
                        const options = e.target.options;
                        const selected: string[] = [];
                        for (let i = 0; i < options.length; i++) if (options[i].selected) selected.push(options[i].value);
                        setFormData(p => ({ ...p, selectedCountries: selected }));
                      }}>
                        {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      {touched.selectedCountries && errors.selectedCountries && (
                        <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.selectedCountries}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">VAT / Tax Identification Number</label>
                      <input name="vatNumber" value={formData.vatNumber} onChange={handleInputChange} onBlur={() => handleBlur('vatNumber')} className={inputClasses('vatNumber')} disabled={isSubmitting} />
                      {touched.vatNumber && errors.vatNumber && (
                        <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.vatNumber}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Export HS Code Classification</label>
                      <input name="exportHsCode" value={formData.exportHsCode} onChange={handleInputChange} onBlur={() => handleBlur('exportHsCode')} className={inputClasses('exportHsCode')} disabled={isSubmitting} />
                      {touched.exportHsCode && errors.exportHsCode && (
                        <p className="mt-1 text-xs text-adab-orange font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.exportHsCode}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Preferred Settlement Currency</label>
                      <select name="preferredCurrency" value={formData.preferredCurrency} onChange={handleInputChange} className={inputClasses('preferredCurrency')} disabled={isSubmitting}>
                        {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2 mb-4">Step 5: Dynamic Platform Setup Fee Summary</h3>
                
                <div className="max-w-xl mx-auto mt-8">
                  <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-10">
                      <CreditCard className="w-48 h-48" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-6">
                        <span className="w-2 h-2 rounded-full bg-adab-green animate-pulse"></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Live Pricing</span>
                      </div>

                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Plan Selected</h4>
                      <p className="text-2xl font-black mb-8">
                        {formData.isInternational ? 'Global Exporter (Premium Tier)' : 'Domestic Supplier (Standard Tier)'}
                      </p>

                      <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center pb-4 border-b border-white/10">
                          <span className="text-sm font-medium text-gray-300">Standard Subscription Fee</span>
                          <span className="font-mono font-bold">₹199.00</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-white/10 text-adab-green">
                          <span className="text-sm font-medium">Early-Bird Launch Promotion</span>
                          <span className="font-mono font-bold">-100% (-₹199.00)</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-base font-bold uppercase tracking-widest">Total Payable Today</span>
                          <span className="text-3xl font-black text-white">₹0.00</span>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                        <p className="text-xs font-bold text-adab-green">✨ Early Bird Founder Offer: Premium Features Activated for Free!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className={`px-4 py-2 text-sm font-bold flex items-center gap-2 ${currentStep === 1 ? 'invisible' : 'text-gray-600 hover:text-gray-900'}`}
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
                className={`px-8 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2
                  ${isFormValid && !isSubmitting && isSafeToSave ? 'bg-adab-green text-white hover:bg-green-800 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSubmitting ? 'Updating...' : 'Complete Profile & Save'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-2 space-y-6 md:space-y-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white border border-gray-100 flex items-center justify-center">
                  {profile.companyLogo ? (
                    <img src={profile.companyLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-4 h-4 text-adab-green" />
                  )}
                </div>
                <h3 className="font-bold text-gray-900">Corporate Identity & Compliance</h3>
              </div>
              <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-y-8 md:gap-x-12">
                <div className="md:col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Registered Company Name</p>
                  <p className="text-lg md:text-xl font-extrabold text-gray-900">{profile.companyName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Business Structure</p>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-adab-green" />
                    <p className="text-sm font-bold text-gray-700">{getBusinessTypeLabel(profile.businessType)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Market Scope</p>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-adab-green" />
                    <p className="text-sm font-bold text-gray-700">{profile.marketScope}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">GSTIN</p>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-adab-orange" />
                    <p className="text-sm font-mono font-bold text-gray-700 uppercase">{profile.gstNumber}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">PAN Number</p>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-adab-orange" />
                    <p className="text-sm font-mono font-bold text-gray-700 uppercase">{profile.panNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="md:col-span-2 pt-4 border-t border-gray-50">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Registered Warehouse Address</p>
                   <div className="flex items-start gap-3">
                     <MapPin className="w-5 h-5 text-gray-300 shrink-0" />
                     <p className="text-sm font-medium text-gray-600 leading-relaxed">{profile.address}, {profile.city}, {profile.state}</p>
                   </div>
                </div>
              </div>
            </div>
            
            {profile.isInternational && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                 <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                  <Globe className="w-5 h-5 text-adab-orange" />
                  <h3 className="font-bold text-gray-900">International Compliance</h3>
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

          <div className="space-y-6 md:space-y-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
               <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <Globe className="w-8 h-8 text-adab-orange" />
                    {profile.isInternational ? (
                      <span className="px-3 py-1 bg-orange-50 text-adab-orange border border-orange-100 rounded-full text-[10px] font-black uppercase tracking-widest">Global Reach</span>
                    ) : (
                      <span className="px-3 py-1 bg-green-50 text-adab-green border border-green-100 rounded-full text-[10px] font-black uppercase tracking-widest">Domestic</span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-gray-900 text-lg mb-2">Market Reach</h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                    {profile.isInternational 
                      ? 'Your products are visible to global distributors across your approved regions.' 
                      : 'You are currently focused on the domestic market. Enable international reach in settings.'}
                  </p>
                  
                  {profile.isInternational && profile.selectedCountries.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Approved Regions</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.selectedCountries.map(code => (
                          <span key={code} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-adab-orange"></span>
                            {getCountryLabel(code)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
            </div>

            <div className="bg-adab-green rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-green-900/10">
              <CheckCircle2 className="w-8 h-8 mb-4 opacity-80" />
              <h4 className="font-bold text-lg mb-1">Partner Verification</h4>
              <p className="text-green-50/80 text-xs font-medium leading-relaxed mb-6">Your business identity has been verified by the ADAB Trust Engine.</p>
              <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                Download Certificate <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
