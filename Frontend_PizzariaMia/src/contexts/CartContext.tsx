import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string; // unique id for the cart item (since same pizza can be added with different customizations)
  pizzaId: number;
  name: string;
  price: number;
  imageUrl: string;
  slices?: number;
  customization?: string;
  quantity: number;
}

interface CartContextData {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const storagedCart = localStorage.getItem('@PizzariaMia:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('@PizzariaMia:cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: Omit<CartItem, 'id' | 'quantity'>) => {
    setCartItems((prevItems) => {
      // For simplicity, we just add a new item with a unique ID every time.
      // If we wanted to group identical pizzas, we could check for pizzaId + customization
      const newItem = {
        ...item,
        id: Math.random().toString(36).substring(2, 9),
        quantity: 1,
      };
      return [...prevItems, newItem];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prevItems) => prevItems.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('@PizzariaMia:cart');
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
