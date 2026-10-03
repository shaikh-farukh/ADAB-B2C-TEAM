import React from 'react';
import { Building2, Globe, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DistributorHeaderProps {
  companyName: string;
  businessType: string;
  country: string;
  logo?: string | null;
}

const DistributorHeader: React.FC<DistributorHeaderProps> = ({
  companyName,
  businessType,
  country,
  logo
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate('/manufacturer/distributors')}
          className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-adab-green transition-colors mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to network registry
        </button>

        <div className="flex items-center gap-6">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-300 shadow-inner overflow-hidden shrink-0">
            {logo ? (
              <img src={logo} alt={companyName} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-10 h-10" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-3 py-1 bg-green-50 text-adab-green border border-green-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                {businessType}
              </span>
              <span className="px-3 py-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-3 h-3" />
                {country}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter leading-tight truncate">
              {companyName}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributorHeader;