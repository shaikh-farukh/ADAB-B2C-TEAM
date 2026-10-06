import React from 'react';
import { FileText, MapPin, Mail, Phone, Building2 } from 'lucide-react';

interface DistributorInfoCardProps {
  gstNumber: string;
  address: string;
  email: string;
  mobile: string;
}

const DistributorInfoCard: React.FC<DistributorInfoCardProps> = ({
  gstNumber,
  address,
  email,
  mobile
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-[2.5rem] shadow-sm overflow-hidden group">
      <div className="px-10 py-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-adab-green shadow-sm group-hover:rotate-6 transition-transform">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Corporate Information</h3>
      </div>

      <div className="p-10 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-y-10 md:gap-y-12 md:gap-x-16">
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tax Identification (GST)</p>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-adab-orange" />
            <p className="text-base font-mono font-black text-gray-800 uppercase">{gstNumber}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operational Hub Address</p>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-sm md:text-base font-bold text-gray-600 leading-relaxed pt-1.5">
              {address}
            </p>
          </div>
        </div>

        <div className="md:col-span-2 pt-10 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="p-6 bg-gray-50 border border-gray-100 rounded-3xl flex items-center gap-5 hover:bg-white hover:border-adab-green transition-all">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-adab-green shadow-sm shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Company Email</p>
              <p className="text-sm font-black text-gray-900 truncate">{email}</p>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border border-gray-100 rounded-3xl flex items-center gap-5 hover:bg-white hover:border-adab-orange transition-all">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-adab-orange shadow-sm shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Company Mobile</p>
              <p className="text-sm font-black text-gray-900 truncate">{mobile}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributorInfoCard;