import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

export default function AccountPage({ onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Views: 'dashboard' | 'addresses' | 'placeholder'
  const [activeView, setActiveView] = useState('dashboard');
  const [placeholderText, setPlaceholderText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };  // Edit forms
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: 'Home', recipientName: '', phone: '', address: '', city: 'Surat', state: 'Gujarat', zip: '', isDefault: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profRes, addrRes] = await Promise.all([
        api.get('/customers/me'),
        api.get('/customers/me/addresses')
      ]);
      if (profRes.data?.success) {
        setProfile(profRes.data.data);
        setProfileForm({ name: profRes.data.data.name || '', phone: profRes.data.data.phone || '', email: profRes.data.data.email || '' });
      }
      if (addrRes.data?.success) {
        setAddresses(addrRes.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch account data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch('/customers/me', profileForm);
      if (res.data?.success) {
        setProfile(res.data.data);
        setIsEditingProfile(false);
        showToast('Profile updated successfully!', 'success');
      } else {
        showToast(res.data?.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'An error occurred while updating profile', 'error');
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingAddressId) {
        res = await api.patch(`/customers/me/addresses/${editingAddressId}`, addressForm);
      } else {
        res = await api.post('/customers/me/addresses', addressForm);
      }
      
      if (res.data?.success || res.status === 200 || res.status === 201) {
        setIsAddingAddress(false);
        setEditingAddressId(null);
        setAddressForm({ type: 'Home', recipientName: '', phone: '', address: '', city: 'Surat', state: 'Gujarat', zip: '', isDefault: false });
        fetchData();
        showToast('Address saved successfully!', 'success');
      } else {
        showToast(res.data?.message || 'Failed to save address', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'An error occurred while saving address', 'error');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.delete(`/customers/me/addresses/${id}`);
      fetchData();
      showToast('Address deleted successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to delete address', 'error');
    }
  };

  const showPlaceholder = (text) => {
    setPlaceholderText(text);
    setActiveView('placeholder');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Account...</div>;

  const renderDashboard = () => (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#18753C] rounded-2xl p-6 text-white shadow-sm flex flex-col gap-6 relative overflow-hidden">
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#519468] rounded-xl flex items-center justify-center text-3xl font-extrabold text-white">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.name || 'Pooja Sharma'}</h2>
              <p className="text-xs text-green-100 mt-1">
                {profile?.phone || '+91 98765 12340'} &bull; {profile?.email || 'pooja.s@email.com'}
              </p>
            </div>
          </div>
          <button onClick={() => { setIsEditingProfile(true); setActiveView('profile'); }} className="bg-[#3D8856] hover:bg-[#4E9765] transition-colors text-white text-xs font-bold py-2 px-4 rounded-full border border-[#5CA072]">
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 z-10">
          <div className="bg-[#2D804D] rounded-xl p-4 text-center">
            <div className="text-xl font-extrabold">12</div>
            <div className="text-[10px] text-green-100 font-semibold uppercase tracking-wider mt-1">Orders</div>
          </div>
          <div className="bg-[#2D804D] rounded-xl p-4 text-center">
            <div className="text-xl font-extrabold">2,840</div>
            <div className="text-[10px] text-green-100 font-semibold uppercase tracking-wider mt-1">Points</div>
          </div>
          <div className="bg-[#2D804D] rounded-xl p-4 text-center">
            <div className="text-xl font-extrabold">₹450</div>
            <div className="text-[10px] text-green-100 font-semibold uppercase tracking-wider mt-1">Wallet</div>
          </div>
        </div>
      </div>

      {/* Grid of Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-12">
        <div onClick={() => onNavigate('orders')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-box"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">My Orders</div>
            <div className="text-xs text-gray-500 mt-0.5">Track, return, or buy again</div>
          </div>
        </div>
        
        <div onClick={() => onNavigate('wishlist')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-heart"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Wishlist</div>
            <div className="text-xs text-gray-500 mt-0.5">Your saved items</div>
          </div>
        </div>

        <div onClick={() => setActiveView('addresses')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Addresses</div>
            <div className="text-xs text-gray-500 mt-0.5">Manage delivery addresses</div>
          </div>
        </div>

        <div onClick={() => showPlaceholder('Payment Methods: Saved cards & UPI management coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-credit-card"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Payment Methods</div>
            <div className="text-xs text-gray-500 mt-0.5">Saved cards & UPI</div>
          </div>
        </div>

        <div onClick={() => showPlaceholder('Pay Later & Credit Line coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-[#E8F5E9] text-[#18753C] rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-credit-card"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-gray-900 text-sm">Pay Later & Credit Line</span>
              <span className="bg-[#E8F5E9] border border-[#23B65D] text-[#18753C] text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">0% Interest</span>
            </div>
            <div className="text-xs text-gray-500">Apply via HDFC, ICICI, SBI Mudra</div>
          </div>
        </div>

        <div onClick={() => showPlaceholder('Coupons: View available offers and discounts coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-tag"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Coupons</div>
            <div className="text-xs text-gray-500 mt-0.5">Available offers</div>
          </div>
        </div>

        <div onClick={() => showPlaceholder('ADAB Rewards: Loyalty program details coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-yellow-50 text-yellow-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-star"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">ADAB Rewards</div>
            <div className="text-xs text-gray-500 mt-0.5">2,840 points available</div>
          </div>
        </div>

        <div onClick={() => showPlaceholder('My Reviews: Rate past purchases coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-regular fa-star-half-stroke"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">My Reviews</div>
            <div className="text-xs text-gray-500 mt-0.5">Rate past purchases</div>
          </div>
        </div>

        <div onClick={() => showPlaceholder('Notifications: Order & promo alerts coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-bell"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Notifications</div>
            <div className="text-xs text-gray-500 mt-0.5">Order & promo alerts</div>
          </div>
        </div>

        <div onClick={() => showPlaceholder('Help & Support: Customer service portal coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-teal-50 text-teal-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-headset"></i>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Help & Support</div>
            <div className="text-xs text-gray-500 mt-0.5">Get help with orders</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAddresses = () => (
    <div className="max-w-4xl mx-auto w-full">
      <h2 className="text-2xl font-black text-[#111827] mb-6">Manage Addresses</h2>

      <div className="flex flex-col gap-4 mb-12">
        {addresses.map(addr => (
          <div key={addr.id} className={`border rounded-xl p-5 flex justify-between items-start transition-colors ${addr.isDefault ? 'border-[#18753C] bg-[#F5FBF7]' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-extrabold text-gray-900 text-lg">{addr.type}</span>
                {addr.isDefault && <span className="bg-[#E8F5E9] text-[#18753C] text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">DEFAULT</span>}
              </div>
              <p className="text-gray-600 text-sm mb-1">{addr.address}, {addr.city} {addr.zip}</p>
              <p className="text-gray-400 text-sm">{addr.recipientName || profile?.name || 'Pooja Sharma'} &bull; {addr.phone || profile?.phone || '+91 98765 12340'}</p>
            </div>
            <button onClick={() => { setEditingAddressId(addr.id); setAddressForm({ type: addr.type, recipientName: addr.recipientName || '', phone: addr.phone || '', address: addr.address, city: addr.city, state: addr.state, zip: addr.zip, isDefault: addr.isDefault }); setIsAddingAddress(true); }} className="text-sm font-bold text-gray-700 bg-gray-100 px-5 py-2 rounded-xl hover:bg-gray-200 transition-colors">Edit</button>
          </div>
        ))}
        
        {/* ADD NEW ADDRESS BUTTON */}
        {!isAddingAddress && (
          <button onClick={() => { setIsAddingAddress(true); setEditingAddressId(null); setAddressForm({ type: 'Home', recipientName: '', phone: '', address: '', city: 'Surat', state: 'Gujarat', zip: '', isDefault: false }); }} className="w-full border-2 border-dashed border-[#18753C]/40 bg-white text-[#18753C] font-bold py-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-green-50 transition-colors text-lg">
            <i className="fa-solid fa-plus"></i> Add New Address
          </button>
        )}

        {isAddingAddress && (
          <form onSubmit={handleSaveAddress} className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-[#18753C] shadow-sm mt-2">
            <h3 className="font-bold text-lg mb-2">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
            <select value={addressForm.type} onChange={e => setAddressForm({...addressForm, type: e.target.value})} className="border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none bg-white">
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>
            <div className="flex gap-4">
              <input type="text" value={addressForm.recipientName} onChange={e => setAddressForm({...addressForm, recipientName: e.target.value})} className="border border-gray-200 p-3 rounded-xl text-sm w-1/2 focus:border-brand-green outline-none" placeholder="Name" required />
              <input type="tel" value={addressForm.phone} onChange={e => setAddressForm({...addressForm, phone: e.target.value})} className="border border-gray-200 p-3 rounded-xl text-sm w-1/2 focus:border-brand-green outline-none" placeholder="Phone Number" required />
            </div>
            <textarea value={addressForm.address} onChange={e => setAddressForm({...addressForm, address: e.target.value})} className="border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none" placeholder="Street Address / Area" required rows="3" />
            <div className="flex gap-4">
              <input type="text" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="border border-gray-200 p-3 rounded-xl text-sm w-1/2 focus:border-brand-green outline-none" placeholder="City" required />
              <input type="text" value={addressForm.zip} onChange={e => setAddressForm({...addressForm, zip: e.target.value})} className="border border-gray-200 p-3 rounded-xl text-sm w-1/2 focus:border-brand-green outline-none" placeholder="Pincode" required />
            </div>
            <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer font-medium text-gray-700">
              <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({...addressForm, isDefault: e.target.checked})} className="w-4 h-4 accent-[#18753C] rounded" />
              Set as default address
            </label>
            <div className="flex gap-3 justify-end mt-4">
              <button type="button" onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-sm cursor-pointer text-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white rounded-xl font-bold text-sm cursor-pointer transition-colors">Save Address</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-black text-[#111827]">Settings</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-500">Full Name</label>
            <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="border border-gray-200 p-3 rounded-xl focus:border-brand-green outline-none text-gray-700" placeholder="Full Name" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-500">Phone</label>
            <input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="border border-gray-200 p-3 rounded-xl focus:border-brand-green outline-none text-gray-700" placeholder="Phone Number" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-500">Email</label>
            <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="border border-gray-200 p-3 rounded-xl focus:border-brand-green outline-none text-gray-700" placeholder="Email Address" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-500">Language</label>
            <select className="border border-gray-200 p-3 rounded-xl bg-gray-100 text-gray-700 outline-none">
              <option>English</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <div className="w-5 h-5 rounded-full bg-[#F26E21] text-white flex items-center justify-center text-[10px]"><i className="fa-solid fa-check"></i></div> Order status updates (SMS & Push)
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <div className="w-5 h-5 rounded-full bg-[#F26E21] text-white flex items-center justify-center text-[10px]"><i className="fa-solid fa-check"></i></div> Promotional offers
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <div className="w-5 h-5 rounded-full bg-[#F26E21] text-white flex items-center justify-center text-[10px]"><i className="fa-solid fa-check"></i></div> Price drop alerts for wishlist
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <div className="w-5 h-5 rounded border border-gray-300"></div> Newsletter
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Security</h3>
        <div className="flex flex-col gap-3">
          <button className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors text-left font-bold border-none w-full">
            <i className="fa-solid fa-key w-4 text-center"></i> Change Password
          </button>
          <button className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors text-left font-bold border-none w-full">
            <i className="fa-solid fa-shield-halved w-4 text-center"></i> Two-Factor Authentication
          </button>
          <button className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors text-left font-bold border-none w-full">
            <i className="fa-solid fa-arrow-right-from-bracket w-4 text-center"></i> Manage Sessions
          </button>
        </div>
      </div>

      <button onClick={(e) => { handleUpdateProfile(e); setActiveView('dashboard'); }} className="bg-[#18753C] hover:bg-[#156030] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors cursor-pointer">
        Save Changes
      </button>
    </div>
  );

  const renderPlaceholder = () => (
    <div className="max-w-2xl mx-auto w-full">
      <button onClick={() => setActiveView('dashboard')} className="mb-4 text-sm font-bold text-gray-600 hover:text-black flex items-center gap-2">
        <i className="fa-solid fa-arrow-left"></i> Back to Account
      </button>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center mb-12">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4 text-2xl">
          <i className="fa-solid fa-screwdriver-wrench"></i>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Under Construction</h2>
        <p className="text-gray-500 text-sm">{placeholderText}</p>
      </div>
    </div>
  );

  const SidebarItem = ({ icon, label, badge, active, onClick }) => (
    <div 
      onClick={() => { onClick(); setIsSidebarOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
        active 
          ? 'bg-[#E8F5E9] text-brand-green font-bold rounded-xl relative' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium'
      }`}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-green rounded-r-md"></div>}
      <i className={`fa-solid ${icon} w-5 text-center`}></i>
      <span className="text-sm flex-1">{label}</span>
      {badge && (
        <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );

  return (
    <div className="p-4 bg-[#F8F9FA] min-h-screen relative">
      {/* Header with Hamburger */}
      <div className="max-w-4xl mx-auto w-full flex items-center mb-4">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <span className="ml-3 font-bold text-gray-800 text-lg">My Account Menu</span>
      </div>

      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
          
          {/* Drawer */}
          <div className="relative w-64 h-full bg-white shadow-2xl flex flex-col pt-4 pb-6 overflow-y-auto transform transition-transform duration-300">
            <div className="flex items-center justify-between px-4 mb-4">
              <div className="text-xs font-bold text-gray-400 tracking-wider uppercase">My Account</div>
              <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="px-2 flex flex-col gap-1">
              <SidebarItem icon="fa-user" label="Profile" active={activeView === 'dashboard' || activeView === 'profile'} onClick={() => setActiveView('dashboard')} />
              <SidebarItem icon="fa-box" label="Orders" badge="2" active={false} onClick={() => onNavigate('orders')} />
              <SidebarItem icon="fa-heart" label="Wishlist" active={false} onClick={() => onNavigate('wishlist')} />
              <SidebarItem icon="fa-location-dot" label="Addresses" active={activeView === 'addresses'} onClick={() => setActiveView('addresses')} />
              <SidebarItem icon="fa-credit-card" label="Payments" active={placeholderText.includes('Payment')} onClick={() => showPlaceholder('Payment Methods: Saved cards & UPI management coming soon.')} />
              <SidebarItem icon="fa-tag" label="Coupons" active={placeholderText.includes('Coupons')} onClick={() => showPlaceholder('Coupons: View available offers and discounts coming soon.')} />
              <SidebarItem icon="fa-star" label="Rewards" active={placeholderText.includes('Rewards')} onClick={() => showPlaceholder('ADAB Rewards: Loyalty program details coming soon.')} />
              <SidebarItem icon="fa-star-half-stroke" label="Reviews" active={placeholderText.includes('Reviews')} onClick={() => showPlaceholder('My Reviews: Rate past purchases coming soon.')} />
              <SidebarItem icon="fa-bell" label="Notifications" active={placeholderText.includes('Notifications')} onClick={() => showPlaceholder('Notifications: Order & promo alerts coming soon.')} />
              <SidebarItem icon="fa-headset" label="Help" active={placeholderText.includes('Help')} onClick={() => showPlaceholder('Help & Support: Customer service portal coming soon.')} />
              <SidebarItem icon="fa-gear" label="Settings" active={placeholderText.includes('Settings')} onClick={() => showPlaceholder('Settings coming soon.')} />
              
              <div className="h-px bg-gray-100 my-2 mx-2"></div>
              
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors text-brand-green hover:bg-green-50 font-bold mx-2">
                <i className="fa-solid fa-store w-5 text-center"></i>
                <span className="text-sm">Sell on ADAB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'addresses' && renderAddresses()}
      {activeView === 'profile' && renderProfile()}
      {activeView === 'placeholder' && renderPlaceholder()}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-white font-medium shadow-xl transition-all duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#18753C]'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
