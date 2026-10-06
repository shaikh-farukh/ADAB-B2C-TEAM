import React, { useEffect, useState } from 'react';
import { Megaphone, Send, MailOpen, BarChart3, Plus, MapPin, Calendar, HelpCircle, Eye } from 'lucide-react';
import campaignService from '../../services/campaignService';
import { useNotification } from '../../context/NotificationContext';

const CampaignsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Campaign Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');
  const [pincode, setPincode] = useState('');
  const [targetType, setTargetType] = useState<'ALL' | 'TERRITORY'>('ALL');
  const [notificationType, setNotificationType] = useState<'New Product' | 'Offer' | 'Stock Arrival' | 'Price Update'>('Offer');

  // Detail view state
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignService.getCampaigns();
      setCampaigns(response.data || []);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch campaigns list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showError('Title and Message are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        campaign_name: title,
        message,
        notification_type: notificationType,
        targeting_type: targetType === 'TERRITORY' ? 'territory' as const : 'all' as const,
        targeting_values: targetType === 'TERRITORY'
          ? [stateName, cityName, pincode].filter(Boolean)
          : null
      };

      const response = await campaignService.createCampaign(payload);
      if (response.success) {
        showSuccess('Campaign broadcasted successfully');
        setTitle('');
        setMessage('');
        setStateName('');
        setCityName('');
        setPincode('');
        setTargetType('ALL');
        setNotificationType('Offer');
        await fetchCampaigns();
      } else {
        showError(response.message || 'Failed to broadcast campaign');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error transmitting campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-adab-orange mb-1">
            <Megaphone className="w-5 h-5 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-adab-orange">Broadcast marketing</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight">Campaign Manager</h1>
          <p className="text-sm text-gray-500 font-medium">Create and send marketing broadcasts or notifications to shops in targeted territories.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left/Middle Column: Broadcast Form & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* New Broadcast Form */}
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-3xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 dark:text-dark-text-secondary mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-adab-orange" />
              New Campaign Broadcast
            </h2>

            <form onSubmit={handleCreateCampaign} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campaign Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Summer Discount on Beverages, New Product Launch"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-adab-orange/10 focus:border-adab-orange transition-all"
                  />
                </div>

                {/* Message Body */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Type the campaign message for targeted shops..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-adab-orange/10 focus:border-adab-orange transition-all resize-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notification Type</label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value as typeof notificationType)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-adab-orange/10 focus:border-adab-orange transition-all [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="Offer">Offer</option>
                    <option value="New Product">New Product</option>
                    <option value="Stock Arrival">Stock Arrival</option>
                    <option value="Price Update">Price Update</option>
                  </select>
                </div>

                {/* Target Scope */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Audience Scope</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-text-secondary cursor-pointer">
                      <input
                        type="radio"
                        name="targetType"
                        checked={targetType === 'ALL'}
                        onChange={() => setTargetType('ALL')}
                        className="text-adab-orange focus:ring-adab-orange"
                      />
                      All Registered Shops
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-text-secondary cursor-pointer">
                      <input
                        type="radio"
                        name="targetType"
                        checked={targetType === 'TERRITORY'}
                        onChange={() => setTargetType('TERRITORY')}
                        className="text-adab-orange focus:ring-adab-orange"
                      />
                      Specific Market Territory
                    </label>
                  </div>
                </div>

                {/* Territory Inputs conditional */}
                {targetType === 'TERRITORY' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">State</label>
                      <input
                        type="text"
                        placeholder="State name"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">City</label>
                      <input
                        type="text"
                        placeholder="City name"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pincode</label>
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-adab-orange hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Broadcasting...' : 'Broadcast Campaign'}
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Broadcast History */}
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-3xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 dark:text-dark-text-secondary mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Broadcast History & Analytics
            </h2>

            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-50 dark:bg-dark-surface-elevated rounded-xl" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-semibold">No campaigns sent yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c) => (
                  <div key={c.id} className="border border-gray-100 dark:border-dark-border-primary rounded-2xl p-4 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-dark-surface-elevated transition-colors">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-dark-text-secondary">{c.campaign_name || c.title}</h3>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                        {c.state && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {c.city || c.state}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Read / Sent</span>
                        <span className="text-xs font-bold text-gray-800">
                          {c.read_count} / {c.sent_count} ({c.sent_count > 0 ? Math.round((c.read_count / c.sent_count) * 100) : 0}%)
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCampaign(c)}
                        className="p-2 border border-gray-100 hover:border-adab-orange text-gray-400 hover:text-adab-orange rounded-xl transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Analytics Dashboard Summary */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <h3 className="text-base font-black tracking-tight uppercase">Marketing Performance</h3>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">Total Campaigns</span>
                <span className="text-3xl font-black">{campaigns.length}</span>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">Total Broadcast Recipients</span>
                <span className="text-3xl font-black">
                  {campaigns.reduce((sum, c) => sum + parseInt(c.sent_count || 0), 0)}
                </span>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">Average Read Rate</span>
                <span className="text-3xl font-black">
                  {(() => {
                    const totalSent = campaigns.reduce((sum, c) => sum + parseInt(c.sent_count || 0), 0);
                    const totalRead = campaigns.reduce((sum, c) => sum + parseInt(c.read_count || 0), 0);
                    return totalSent > 0 ? `${Math.round((totalRead / totalSent) * 100)}%` : '0%';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Details Drawer/Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-app-secondary rounded-3xl dark:border dark:border-dark-border-secondary w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Campaign Title</span>
                <h3 className="text-lg font-black leading-tight text-white">{selectedCampaign.title || selectedCampaign.campaign_name}</h3>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-2 block">Sent on {new Date(selectedCampaign.created_at).toLocaleString()}</span>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="text-slate-400 hover:text-white font-bold text-sm">Close</button>
            </div>
            <div className="p-6 space-y-6">

              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Message</span>
                <p className="text-sm text-gray-700 leading-relaxed font-semibold">{selectedCampaign.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Target Audience / Role</span>
                  <span className="text-sm font-bold text-gray-900 capitalize">{selectedCampaign.target_audience || selectedCampaign.target_role || selectedCampaign.targeting_type || 'All'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Target Scope</span>
                  <span className="text-sm font-bold text-gray-900 capitalize">{selectedCampaign.targeting_type || 'All'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Sent Count</span>
                  <span className="text-lg font-black text-gray-900">{selectedCampaign.sent_count} shops</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Read Count</span>
                  <span className="text-lg font-black text-green-600">{selectedCampaign.read_count} views</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
