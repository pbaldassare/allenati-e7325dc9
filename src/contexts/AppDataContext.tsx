import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Data Types
export interface Course {
  id: string;
  name: string;
  description: string;
  instructor: string;
  instructorImage: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number;
  maxParticipants: number;
  currentParticipants: number;
  deadlineHours?: number;
  benefits: string[];
  requirements?: string[];
  schedule: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    time: string;
    roomId?: string;
    date?: string; // For specific dates
    day?: string;
  }[];
  price: number;
  image: string;
  rating: number;
  tags: string[];
  isActive: boolean;
  requiredCredits: number;
}

export interface Booking {
  id: string;
  userId: string;
  courseId: string;
  date: string;
  time: string;
  status: 'confirmed' | 'waitlist' | 'cancelled' | 'completed';
  creditsUsed: number;
  pointsEarned: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  duration: number; // days
  features: string[];
  isPopular: boolean;
  maxBookingsPerDay: number;
  accessLevel: string[];
}


export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'subscription' | 'achievement';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  brand: string;
  images: string[];
  inStock: number;
  rating: number;
  reviews: number;
  tags: string[];
  isNew: boolean;
  isFeatured: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  createdAt: string;
  trackingNumber?: string;
}

interface AppDataContextType {
  // Bookings
  bookings: Booking[];
  getUserBookings: (userId: string) => Booking[];
  bookCourse: (courseId: string, date: string, time: string) => Promise<boolean>;
  cancelBooking: (bookingId: string) => boolean;
  
  // Notifications
  notifications: Notification[];
  getUserNotifications: (userId: string) => Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  
  // Shop (localStorage only)
  cart: CartItem[];
  addToCart: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  orders: Order[];
  createOrder: (shippingAddress: string) => string;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Initialize minimal data for localStorage persistence only
const initializeLocalData = () => {
  return {
    bookings: JSON.parse(localStorage.getItem('app_bookings') || '[]'),
    notifications: JSON.parse(localStorage.getItem('app_notifications') || '[]'),
    cart: JSON.parse(localStorage.getItem('app_cart') || '[]'),
    orders: JSON.parse(localStorage.getItem('app_orders') || '[]')
  };
};

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState(() => initializeLocalData());

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('app_bookings', JSON.stringify(data.bookings));
  }, [data.bookings]);

  useEffect(() => {
    localStorage.setItem('app_notifications', JSON.stringify(data.notifications));
  }, [data.notifications]);

  useEffect(() => {
    localStorage.setItem('app_cart', JSON.stringify(data.cart));
  }, [data.cart]);

  useEffect(() => {
    localStorage.setItem('app_orders', JSON.stringify(data.orders));
  }, [data.orders]);


  const bookCourse = async (courseId: string, date: string, time: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const booking: Booking = {
      id: Date.now().toString(),
      userId: JSON.parse(localStorage.getItem('currentUser') || '{}').id || '1',
      courseId,
      date,
      time,
      status: 'confirmed',
      creditsUsed: 1,
      pointsEarned: 10,
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      bookings: [...prev.bookings, booking]
    }));

    return true;
  };

  const cancelBooking = (bookingId: string): boolean => {
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return false;

    setData(prev => ({
      ...prev,
      bookings: prev.bookings.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
      )
    }));

    return true;
  };

  const getUserBookings = (userId: string) => {
    return data.bookings.filter(booking => booking.userId === userId);
  };

  const getUserNotifications = (userId: string) => {
    return data.notifications.filter(notification => notification.userId === userId);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    }));
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications]
    }));
  };


  const addToCart = (productId: string, quantity: number) => {
    setData(prev => {
      const existingItem = prev.cart.find(item => item.productId === productId);
      if (existingItem) {
        return {
          ...prev,
          cart: prev.cart.map(item => 
            item.productId === productId 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        };
      } else {
        return {
          ...prev,
          cart: [...prev.cart, { productId, quantity }]
        };
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setData(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.productId !== productId)
    }));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setData(prev => ({
      ...prev,
      cart: prev.cart.map(item => 
        item.productId === productId ? { ...item, quantity } : item
      )
    }));
  };

  const clearCart = () => {
    setData(prev => ({ ...prev, cart: [] }));
  };

  const createOrder = (shippingAddress: string): string => {
    const orderId = Date.now().toString();
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const order: Order = {
      id: orderId,
      userId: currentUser.id || '1',
      items: [...data.cart],
      total: data.cart.reduce((sum, item) => {
        // Simplified without products reference since we removed fake products
        return sum + 10 * item.quantity; // Fixed price for simplicity
      }, 0),
      status: 'pending',
      shippingAddress,
      createdAt: new Date().toISOString(),
      trackingNumber: `TRK${orderId.slice(-6)}`
    };

    setData(prev => ({
      ...prev,
      orders: [order, ...prev.orders],
      cart: []
    }));

    return orderId;
  };


  const value: AppDataContextType = {
    bookings: data.bookings,
    getUserBookings,
    bookCourse,
    cancelBooking,
    notifications: data.notifications,
    getUserNotifications,
    markNotificationAsRead,
    addNotification,
    cart: data.cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    orders: data.orders,
    createOrder
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};