import React from 'react';

export interface TierPrice {
  minQty: number;
  maxQty: number | null;
  price: number;
}

interface TierPriceWidgetProps {
  tiers: TierPrice[];
  basePrice: number;
  currency?: string;
}

const TierPriceWidget: React.FC<TierPriceWidgetProps> = ({ tiers, basePrice, currency = '₹' }) => {
  if (!tiers || tiers.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Volume Discounts</p>
      <div className="space-y-1.5">
        {tiers.map((tier, index) => {
          const discountPercent = ((basePrice - tier.price) / basePrice) * 100;
          return (
            <div key={index} className="flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {tier.minQty}{tier.maxQty ? ` - ${tier.maxQty}` : '+'} units
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-adab-darkGreen dark:text-adab-green">
                  {currency}{Number(tier.price).toFixed(2)}
                </span>
                {discountPercent > 0 && (
                  <span className="text-[9px] font-bold text-white bg-adab-orange px-1.5 py-0.5 rounded shadow-sm">
                    -{discountPercent.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TierPriceWidget;
