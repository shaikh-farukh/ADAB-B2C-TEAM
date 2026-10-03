import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Info, Users, Clock, ArrowUpRight, AlertTriangle, ChevronLeft, MapPin, CreditCard, Trash2, Settings, Plus } from 'lucide-react';
import DistributorHeader from '../../components/manufacturer/DistributorHeader';
import DistributorInfoCard from '../../components/manufacturer/DistributorInfoCard';
import DistributorOwnerCard from '../../components/manufacturer/DistributorOwnerCard';
import distributorService from '../../services/distributorService';
import creditService from '../../services/creditService';
import territoryService from '../../services/territoryService';
import locationService, { CityOption, StateOption } from '../../services/locationService';
import { useNotification } from '../../context/NotificationContext';

const DistributorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [distributor, setDistributor] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings states
  const [territories, setTerritories] = useState<any[]>([]);
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isLocationsLoading, setIsLocationsLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [pincode, setPincode] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [creditDays, setCreditDays] = useState('');
  const [isTerritorySubmitting, setIsTerritorySubmitting] = useState(false);
  const [isCreditSubmitting, setIsCreditSubmitting] = useState(false);

  const fetchTerritoriesAndCredits = async () => {
    if (!id) return;
    try {
      const [terrRes, credRes] = await Promise.all([
        territoryService.getTerritories(),
        creditService.getCredits()
      ]);
      // Filter by this distributor
      const distIdNum = parseInt(id);
      setTerritories((terrRes.data || []).filter((t: any) => t.distributor_id === distIdNum));
      const myCredit = (credRes.data || []).find((c: any) => c.debtor_id === distIdNum);
      if (myCredit) {
        setCreditLimit(myCredit.credit_limit || '');
        setCreditDays(myCredit.credit_days || '');
      }
    } catch (err) {
      console.error('Failed to load settings data', err);
    }
  };
  const handleAssignTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!stateId.trim() && !cityId.trim() && !pincode.trim()) || !id) {
      showError('Please select a state, city, or enter a pincode');
      return;
    }
    if (cityId && !stateId) {
      showError('Please select a state before selecting a city');
      return;
    }
    setIsTerritorySubmitting(true);
    try {
      const response = await territoryService.assignTerritory({
        distributor_id: parseInt(id),
        state_id: stateId.trim() ? parseInt(stateId) : null,
        city_id: cityId.trim() ? parseInt(cityId) : null,
        pincode: pincode.trim()
      });
      if (response.success) {
        showSuccess('Territory assigned successfully');
        setStateId('');
        setCityId('');
        setCities([]);
        setPincode('');
        await fetchTerritoriesAndCredits();
      } else {
        showError(response.message || 'Failed to assign territory');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error assigning territory');
    } finally {
      setIsTerritorySubmitting(false);
    }
  };

  useEffect(() => {
    const fetchStates = async () => {
      setIsLocationsLoading(true);
      try {
        const response = await locationService.getStates();
        const data = response?.data || [];
        console.log('[DEBUG UI] States loaded successfully. Count:', data.length, 'States:', data);
        setStates(data);
      } catch (err: any) {
        console.error('[DEBUG UI] Failed to load states:', err);
        showError(err.response?.data?.message || 'Failed to load states');
      } finally {
        setIsLocationsLoading(false);
      }
    };

    fetchStates();
  }, [showError]);

  useEffect(() => {
    const fetchCities = async () => {
      if (!stateId) {
        console.log('[DEBUG UI] No stateId selected. Clearing city list.');
        setCities([]);
        setCityId('');
        return;
      }

      setIsCitiesLoading(true);
      try {
        console.log('[DEBUG UI] Fetching cities for stateId:', stateId);
        const response = await locationService.getCities(stateId);
        const data = response?.data || [];
        console.log(`[DEBUG UI] Cities loaded successfully for stateId ${stateId}. Count: ${data.length}`, 'Cities:', data);
        setCities(data);
      } catch (err: any) {
        console.error(`[DEBUG UI] Failed to load cities for stateId ${stateId}:`, err);
        showError(err.response?.data?.message || 'Failed to load cities');
      } finally {
        setIsCitiesLoading(false);
      }
    };

    fetchCities();
  }, [stateId, showError]);

  const handleDeleteTerritory = async (terrId: number) => {
    try {
      const response = await territoryService.deleteTerritory(terrId);
      if (response.success) {
        showSuccess('Territory deleted successfully');
        await fetchTerritoriesAndCredits();
      } else {
        showError(response.message || 'Failed to delete territory');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error deleting territory');
    }
  };

  const handleSetCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditLimit.toString().trim() || !creditDays.toString().trim() || !id) {
      showError('Please fill all credit fields');
      return;
    }
    if (parseFloat(creditLimit) < 0 || parseInt(creditDays) < 0) {
      showError('Credit limit and credit days cannot be negative');
      return;
    }
    setIsCreditSubmitting(true);
    try {
      const response = await creditService.setCredit({
        debtor_id: parseInt(id),
        debtor_type: 'distributor',
        credit_limit: parseFloat(creditLimit),
        credit_days: parseInt(creditDays)
      });
      if (response.success) {
        showSuccess('Credit settings updated');
        await fetchTerritoriesAndCredits();
      } else {
        showError(response.message || 'Failed to update credit settings');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error updating credit settings');
    } finally {
      setIsCreditSubmitting(false);
    }
  };


  useEffect(() => {
    const fetchDistributorDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await distributorService.getDistributorById(id);
        if (response.success && response.data) {
          setDistributor(response.data);
          await fetchTerritoriesAndCredits();
        } else {
          const msg = response.message || "Distributor profile not found";
          setError(msg);
          showError(msg);
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || "Failed to load distributor details from server";
        setError(msg);
        showError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDistributorDetail();
  }, [id, showError]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24">
        <div className="h-10 bg-gray-100 rounded-xl w-48 mb-8" />
        <div className="flex gap-8 items-center border-b border-gray-100 pb-10">
          <div className="w-24 h-24 bg-gray-100 rounded-[2rem]" />
          <div className="space-y-4 flex-1">
            <div className="h-4 bg-gray-50 rounded-full w-32" />
            <div className="h-12 bg-gray-100 rounded-xl w-2/3" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="h-[400px] bg-white border border-gray-100 rounded-[2.5rem]" />
          <div className="h-[400px] bg-white border border-gray-100 rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  if (error || !distributor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4 animate-in fade-in duration-500">
        <div className="bg-red-50 p-6 rounded-full mb-6 shadow-inner"><AlertTriangle className="w-12 h-12 text-red-500" /></div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Access Error</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">{error || "The requested profile could not be loaded."}</p>
        <button
          onClick={() => navigate('/manufacturer/distributors')}
          className="mt-10 px-8 py-3 bg-adab-green text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-green-900/10 hover:bg-green-800 transition-all flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Registry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      {/* Header Section */}
      <DistributorHeader
        companyName={distributor.company_name}
        businessType={distributor.business_type_name}
        country={distributor.country}
        logo={distributor.company_logo}
      />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-12">
        <div className="lg:col-span-2 space-y-10 md:space-y-12">
          {/* Company Details */}
          <DistributorInfoCard
            gstNumber={distributor.gst_number}
            address={distributor.address}
            email={distributor.email}
            mobile={distributor.mobile}
          />

          {/* Owner Details */}
          <DistributorOwnerCard
            name={distributor.owner_name}
            age={distributor.age}
            gender={distributor.gender}
            personalContact={distributor.personal_contact}
            personalEmail={distributor.personal_email}
          />

          {/* Territory & Credit Settings Card */}
          <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <Settings className="w-5 h-5 text-adab-orange" />
              <h3 className="font-black text-lg text-gray-900 tracking-tight">Territory & Credit Settings</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Territory Assignment List & Form */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Market Territories
                  </h4>

                  {territories.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No assigned territories.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {territories.map((t) => (
                        <div key={t.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-2.5 rounded-xl text-xs font-semibold text-gray-800">
                          <span>{t.city_name || `City #${t.city_id || 'Any'}`}, {t.state_name || `State #${t.state_id || 'Any'}`} ({t.pincode || 'All pincodes'})</span>
                          <button onClick={() => handleDeleteTerritory(t.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAssignTerritory} className="bg-gray-50/50 border border-gray-100 p-4 rounded-2xl space-y-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Assign Territory</span>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={stateId}
                      onChange={(e) => {
                        setStateId(e.target.value);
                        setCityId('');
                      }}
                      disabled={isLocationsLoading}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none"
                    >
                      <option value="">{isLocationsLoading ? 'Loading states...' : 'State'}</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.state_name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value)}
                      disabled={!stateId || isCitiesLoading}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none"
                    >
                      <option value="">
                        {!stateId ? 'City' : isCitiesLoading ? 'Loading cities...' : 'City'}
                      </option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.city_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isTerritorySubmitting}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Assign
                    </button>
                  </div>
                </form>
              </div>

              {/* Credit Limit Form */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-adab-orange" />
                    Credit Terms
                  </h4>
                </div>

                <form onSubmit={handleSetCredit} className="bg-gray-50/50 border border-gray-100 p-5 rounded-2xl space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Credit Limit (₹)</label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Settlement Period (Days)</label>
                    <input
                      type="number"
                      placeholder="Enter days"
                      value={creditDays}
                      onChange={(e) => setCreditDays(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreditSubmitting}
                    className="w-full py-3 bg-adab-orange hover:bg-orange-600 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                  >
                    {isCreditSubmitting ? 'Updating...' : 'Update Credit Terms'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-10">
          {/* Partnership Status Card */}
          <div className="bg-adab-green rounded-[2.5rem] p-10 md:p-12 text-white shadow-2xl shadow-green-900/30 flex flex-col relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <ShieldCheck className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                <Users className="w-8 h-8" />
              </div>
              <h4 className="font-black text-2xl tracking-tighter uppercase mb-4 leading-none">Verified Partner</h4>
              <p className="text-green-50 text-sm font-bold opacity-80 uppercase tracking-widest mb-10">
                Registered On {new Date(distributor.created_at).toLocaleDateString()}
              </p>

              <div className="space-y-4">
                 <div className="p-4 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Trust Score</span>
                    <span className="text-sm font-black">98.4%</span>
                 </div>
                 <div className="p-4 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Account Status</span>
                    <span className="text-sm font-black uppercase">{distributor.active ? 'Active' : 'Restricted'}</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Quick Stats / Info */}
          <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
            <div className="flex items-center gap-4 text-adab-orange">
              <Clock className="w-5 h-5" />
              <h4 className="font-black text-xs uppercase tracking-widest">Network Activity</h4>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-adab-green mt-2 shrink-0" />
                <p className="text-xs font-bold text-gray-500 leading-relaxed">Partner verified through ADAB internal compliance engine.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-adab-orange mt-2 shrink-0" />
                <p className="text-xs font-bold text-gray-500 leading-relaxed">Authorized for full catalog visibility in {distributor.country}.</p>
              </div>
            </div>
            <div className="pt-6 border-t border-gray-100">
               <button className="w-full py-4 bg-gray-50 border border-gray-100 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:border-adab-orange hover:text-adab-orange transition-all flex items-center justify-center gap-3">
                 Procurement History
                 <ArrowUpRight className="w-4 h-4" />
               </button>
            </div>
          </div>

          <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-[2rem] flex items-start gap-4 shadow-sm">
            <Info className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Data Privacy</h4>
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                Personal contact information is restricted for operational use only under the ADAB Governance Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributorDetailPage;
