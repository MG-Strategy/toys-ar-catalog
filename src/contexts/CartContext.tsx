import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CartItem {
  id: number;
  nombre: string;
  precio_publico: number;
  cantidad: number;
  sku?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: { id: number; nombre: string; precio_publico: number; sku?: string | null }) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, cantidad: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: { id: number; nombre: string; precio_publico: number; sku?: string | null }) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...product, cantidad: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: number, cantidad: number) => {
    if (cantidad < 1) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.cantidad * i.precio_publico, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
