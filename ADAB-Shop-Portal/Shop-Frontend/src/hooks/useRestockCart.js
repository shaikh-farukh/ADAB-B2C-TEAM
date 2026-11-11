import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'adab_seller_restock_cart';

export function useRestockCart() {
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const saveCart = (items) => {
    setCart(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event('adab_restock_cart_updated'));
    } catch (e) {
      console.warn('Failed to save restock cart:', e);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setCart(raw ? JSON.parse(raw) : []);
      } catch {
        setCart([]);
      }
    };

    window.addEventListener('adab_restock_cart_updated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('adab_restock_cart_updated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addToCart = useCallback((product, casesToAdd = 1) => {
    if (!product || !product.id) return;
    const addCases = Math.max(1, parseInt(casesToAdd, 10) || 1);

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => String(item.id) === String(product.id));
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          orderedCases: updated[existingIdx].orderedCases + addCases
        };
      } else {
        const caseSize = Number(product.case_size) || 1;
        const wholesalePerUnit = Number(product.wholesale_price) || Math.round(Number(product.printed_mrp || 0) * 0.85);
        const caseWholesale = Number(product.case_wholesale_price) || Math.round(wholesalePerUnit * caseSize);
        const caseMrp = Number(product.case_mrp) || Math.round(Number(product.printed_mrp || 0) * caseSize);

        updated = [
          ...prev,
          {
            id: product.id,
            product_name: product.product_name,
            brand_name: product.brand_name || 'Brand',
            barcode: product.barcode,
            default_image_url: product.default_image_url,
            standard_unit: product.standard_unit || 'Piece',
            case_size: caseSize,
            printed_mrp: Number(product.printed_mrp) || 0,
            wholesale_price: wholesalePerUnit,
            case_mrp: caseMrp,
            case_wholesale_price: caseWholesale,
            profit_per_case: Math.max(0, caseMrp - caseWholesale),
            distributor_name: product.distributor_name || 'Local Stockist',
            lead_time_hours: product.lead_time_hours || 12,
            orderedCases: addCases
          }
        ];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('adab_restock_cart_updated'));
      } catch (e) {
        console.warn('Storage error:', e);
      }
      return updated;
    });
  }, []);

  const updateCases = useCallback((productId, newCases) => {
    setCart((prev) => {
      const count = parseInt(newCases, 10);
      let updated;
      if (count <= 0) {
        updated = prev.filter((item) => String(item.id) !== String(productId));
      } else {
        updated = prev.map((item) =>
          String(item.id) === String(productId) ? { ...item, orderedCases: count } : item
        );
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('adab_restock_cart_updated'));
      } catch (e) {
        console.warn('Storage error:', e);
      }
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => {
      const updated = prev.filter((item) => String(item.id) !== String(productId));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('adab_restock_cart_updated'));
      } catch (e) {
        console.warn('Storage error:', e);
      }
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    saveCart([]);
  }, []);

  // Aggregated totals
  const totalCartons = cart.reduce((sum, item) => sum + (item.orderedCases || 0), 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.orderedCases || 0) * (item.case_wholesale_price || 0), 0);
  const totalProfit = cart.reduce((sum, item) => sum + (item.orderedCases || 0) * (item.profit_per_case || 0), 0);

  return {
    cart,
    addToCart,
    updateCases,
    removeFromCart,
    clearCart,
    totalCartons,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100
  };
}

export default useRestockCart;

