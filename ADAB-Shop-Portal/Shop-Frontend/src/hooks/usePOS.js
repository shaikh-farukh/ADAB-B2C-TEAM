import { useState } from 'react';
import { sellerApi } from '../api/sellerApi';

export function usePOS() {
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const clearCart = () => setCart([]);

  const checkout = async (paymentMethod = 'cash', customerPhone = '') => {
    if (cart.length === 0) return null;
    
    try {
      setIsProcessing(true);
      setError(null);
      const response = await sellerApi.checkoutPOS(cart, paymentMethod, customerPhone);
      setLastReceipt(response.data);
      clearCart();
      return response.data;
    } catch (err) {
      console.error('POS Checkout failed:', err);
      setError('Checkout failed. Please try again.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return {
    cart,
    addToCart,
    updateQuantity,
    clearCart,
    cartTotal,
    checkout,
    isProcessing,
    error,
    lastReceipt
  };
}
