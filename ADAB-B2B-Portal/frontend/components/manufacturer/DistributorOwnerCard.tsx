import React from 'react';
import { User, Phone, Mail, UserCheck, Calendar, CircleUser } from 'lucide-react';

interface DistributorOwnerCardProps {
  name: string;
  age: number;
  gender: string;
  personalContact: string;
  personalEmail: string;
}

const DistributorOwnerCard: React.FC<DistributorOwnerCardProps> = ({
  name,
  age,
  gender,
  personalContact,
  personalEmail
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-[2.5rem] shadow-sm overflow-hidden group">
      <div className="px-10 py-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-adab-orange shadow-sm group-hover:scale-110 transition-transform">
          <UserCheck className="w-6 h-6" />
        </div>
        <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Ownership & Liaison</h3>
      </div>

      <div className="p-10 md:p-14 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center gap-10">
          <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shadow-inner shrink-0">
            <User className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Managing Director / Owner</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{name}</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-bold text-gray-600">{age} Years Old</span>
              </div>
              <div className="flex items-center gap-2">
                <CircleUser className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-bold text-gray-600">{gender}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pt-10 border-t border-gray-50">
          <div className="flex items-center gap-4 group/item">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:text-adab-green transition-colors shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Liaison Contact</p>
              <p className="text-sm font-black text-gray-800">{personalContact}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 group/item">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover/item:text-adab-orange transition-colors shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Personal Registry</p>
              <p className="text-sm font-black text-gray-800 truncate">{personalEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributorOwnerCard;