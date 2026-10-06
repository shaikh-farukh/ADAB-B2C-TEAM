import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Globe,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Send,
  ShoppingBag
} from 'lucide-react';
import distributorService from '../../services/distributorService';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';

const ManufacturerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [mfg, setMfg] = useState<any>(null);
  const [description, setDescription] = useState('');

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await distributorService.getManufacturerById(id);
      if (response.success && response.data) {
        setMfg(response.data);
      } else {
        showError(response.message || "Failed to load manufacturer details");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Error fetching manufacturer profile");
    } finally {
      setIsLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAcceptInvite = async (requestId: number) => {
    setIsActionLoading(true);
    try {
      const response = await distributorService.acceptConnectionRequest(requestId);
      if (response.success) {
        showSuccess(response.message || "Connection accepted successfully");
        await fetchProfile();
      } else {
        showError(response.message || "Failed to accept connection request");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred while accepting connection");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectInvite = async (requestId: number) => {
    setIsActionLoading(true);
    try {
      const response = await distributorService.rejectConnectionRequest(requestId);
      if (response.success) {
        showSuccess(response.message || "Connection invitation declined");
        await fetchProfile();
      } else {
        showError(response.message || "Failed to decline connection invitation");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "An error occurred while declining connection");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in">
        <Loader2 className="w-10 h-10 text-adab-orange animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Sourcing Profile Details...</p>
      </div>
    );
  }

  if (!mfg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4 animate-in fade-in">
        <div className="bg-orange-50 p-6 rounded-full mb-6 shadow-inner">
          <AlertTriangle className="w-12 h-12 text-adab-orange" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-dark-text-secondary tracking-tight">Supplier Profile Not Found</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-xs">The requested manufacturing partner profile could not be retrieved.</p>
        <button 
          onClick={() => navigate('/distributor/manufacturers')} 
          className="mt-10 px-8 py-3 bg-adab-orange text-white rounded-3xl dark:border dark:border-dark-border-secondary font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:bg-orange-700 transition-all"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const partnership = mfg.partnership || { status: 'NOT_CONNECTED' };

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Back & Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate('/distributor/manufacturers')}
            className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-adab-orange transition-colors mb-6 group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Directory Search
          </button>

          <div className="flex items-center gap-2.5 text-adab-orange mb-2">
            <Building2 className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Manufacturer Profile</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight leading-none uppercase">
              {mfg.manufacturer_name}
            </h1>
            {partnership.status === 'APPROVED' && (
              <span className="flex items-center gap-1.5 bg-green-50 text-adab-green text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-200 shadow-sm">
                <CheckCircle2 className="w-4 h-4" /> Active Supplier
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-500 mt-3 font-medium">
            Based in <span className="text-gray-900 dark:text-dark-text-secondary font-bold">{mfg.country}</span> | Specialty production hubs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">

        {/* Left Columns - Corporate info */}
        <div className="lg:col-span-2 space-y-8">

          {/* Identity Info Card */}
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2rem] shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <FileText className="w-5 h-5 text-adab-orange" />
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-dark-text-secondary">Corporate identity</h3>
            </div>
            <div className="p-8 md:p-10 grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-x-12 md:gap-y-10">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Authorized Director</p>
                <p className="text-lg font-black text-gray-900 dark:text-dark-text-secondary">{mfg.owner_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Tax registration ID</p>
                <p className="text-lg font-mono font-bold text-gray-800 uppercase">{mfg.gst_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Market Scope</p>
                <span className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${mfg.international_business === 'Yes' ? 'bg-orange-50 text-adab-orange border-orange-200' : 'bg-green-50 text-adab-green border-green-200'}`}>
                  {mfg.market_reach || 'DOMESTIC'} Reach
                </span>
              </div>
              <div className="sm:col-span-2 border-t border-gray-100 pt-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Core Specialty tags</p>
                <div className="flex flex-wrap gap-2">
                  {mfg.specialties?.map((tag: string) => (
                    <span key={tag} className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600">
                      {tag}
                    </span>
                  )) || <span className="text-sm text-gray-400 italic">No specialties listed</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2rem] shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <Mail className="w-5 h-5 text-adab-orange" />
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-dark-text-secondary">Communication & address</h3>
            </div>
            <div className="p-8 md:p-10 space-y-6 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary flex items-center justify-center text-gray-400 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Corporate Email</p>
                    <p className="font-bold text-gray-800 truncate">{mfg.email}</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary flex items-center justify-center text-gray-400 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Mobile Contact</p>
                    <p className="font-bold text-gray-800 truncate">{mfg.mobile}</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50 flex items-start gap-4">
                <div className="bg-white dark:bg-dark-app-secondary p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border-primary flex items-center justify-center text-gray-300 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Registered Facility Location</p>
                  <p className="text-base font-bold text-gray-600 leading-relaxed">{mfg.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Partnership state actions */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-[2rem] shadow-xl shadow-gray-200/50 p-8 md:p-10 sticky top-8">
            <h3 className="text-base font-black text-gray-900 dark:text-dark-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-adab-orange" /> Sourcing Connection
            </h3>

            {/* Render dynamically based on partnership status */}
            {partnership.status === 'APPROVED' && (
              <div className="space-y-6">
                <div className="p-4 bg-green-50/50 border border-green-200 rounded-2xl flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-adab-green shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-adab-green uppercase tracking-widest">Connected</p>
                    <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                      Your connection is verified. You are authorized to purchase products from this manufacturer.
                    </p>
                  </div>
                </div>

                <div className="text-xs font-medium text-gray-500 leading-relaxed border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span>Partnership Code:</span>
                    <span className="font-bold text-gray-700">{partnership.unique_request_id || 'B2B-CON-ACTIVE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Approval Date:</span>
                    <span className="font-bold text-gray-700">
                      {partnership.request_date ? new Date(partnership.request_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/distributor/catalog')}
                  className="w-full py-4 bg-adab-green text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-green-800 transition-all active:scale-[0.97] flex items-center justify-center gap-3"
                >
                  <ShoppingBag className="w-4 h-4" /> Browse Catalog
                </button>
              </div>
            )}

            {partnership.status === 'PENDING' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-2xl flex items-start gap-4">
                  <Clock className="w-6 h-6 text-adab-orange shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-adab-orange uppercase tracking-widest">Pending Invitation</p>
                    <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                      This manufacturer has invited you to connect. Accept to immediately access catalog prices and place orders.
                    </p>
                  </div>
                </div>

                <div className="text-xs font-medium text-gray-500 leading-relaxed border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span>Invitation Ref:</span>
                    <span className="font-mono font-bold text-gray-700 truncate max-w-[15ch]" title={partnership.unique_request_id}>
                      {partnership.unique_request_id || `REQ-${partnership.request_id}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Received Date:</span>
                    <span className="font-bold text-gray-700">
                      {partnership.request_date ? new Date(partnership.request_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleAcceptInvite(partnership.request_id)}
                    disabled={isActionLoading}
                    className="w-full py-3.5 bg-adab-green text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:bg-green-800 transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Accept Connection
                  </button>
                  <button
                    onClick={() => handleRejectInvite(partnership.request_id)}
                    disabled={isActionLoading}
                    className="w-full py-3.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary text-red-500 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    Decline
                  </button>
                </div>
              </div>
            )}

            {partnership.status === 'REJECTED' && (
              <div className="space-y-6">
                <div className="p-4 bg-red-50/50 border border-red-200 rounded-2xl flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest">Declined</p>
                    <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                      The connection invitation was declined. If this was a mistake, please reach out to the manufacturer to re-initiate.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {partnership.status === 'NOT_CONNECTED' && (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-gray-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No Connection</p>
                    <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                      You are not connected to this supplier. Manufacturers initiate connection requests. Please contact their trade office to request an invitation.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default ManufacturerDetailPage;
