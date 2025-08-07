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
  schedule: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    time: string;
    date?: string; // For specific dates
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

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
  requirement: number;
  unlockedBy: string[];
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
  // Courses
  courses: Course[];
  getCourseById: (id: string) => Course | undefined;
  bookCourse: (courseId: string, date: string, time: string) => Promise<boolean>;
  cancelBooking: (bookingId: string) => boolean;
  
  // Bookings
  bookings: Booking[];
  getUserBookings: (userId: string) => Booking[];
  
  // Subscriptions
  subscriptions: Subscription[];
  
  // Achievements & Gamification
  achievements: Achievement[];
  userAchievements: string[];
  unlockAchievement: (achievementId: string) => void;
  addPoints: (userId: string, points: number) => void;
  
  // Notifications
  notifications: Notification[];
  getUserNotifications: (userId: string) => Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  
  // Shop
  products: Product[];
  cart: CartItem[];
  addToCart: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  orders: Order[];
  createOrder: (shippingAddress: string) => string;
  
  // Analytics & Admin
  getAnalytics: () => any;
  getAllUsers: () => any[];
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Initialize fake data
const initializeFakeData = () => {
  // Courses
  const FAKE_COURSES: Course[] = [
    {
      id: '1',
      name: 'Morning Yoga Flow',
      description: 'Inizia la giornata con energia e mindfulness attraverso una sequenza fluida di asana.',
      instructor: 'Elena Martinez',
      instructorImage: '/api/placeholder/100/100',
      category: 'Yoga',
      level: 'Beginner',
      duration: 60,
      maxParticipants: 20,
      currentParticipants: 12,
      schedule: [
        { dayOfWeek: 1, time: '07:00' },
        { dayOfWeek: 3, time: '07:00' },
        { dayOfWeek: 5, time: '07:00' }
      ],
      price: 25,
      image: '/api/placeholder/300/200',
      rating: 4.8,
      tags: ['mattino', 'rilassante', 'mindfulness'],
      isActive: true,
      requiredCredits: 1
    },
    {
      id: '2',
      name: 'HIIT Extreme',
      description: 'Allenamento ad alta intensità per bruciare calorie e migliorare la resistenza.',
      instructor: 'Marco Fitness',
      instructorImage: '/api/placeholder/100/100',
      category: 'Cardio',
      level: 'Advanced',
      duration: 45,
      maxParticipants: 15,
      currentParticipants: 15,
      schedule: [
        { dayOfWeek: 2, time: '18:00' },
        { dayOfWeek: 4, time: '18:00' }
      ],
      price: 30,
      image: '/api/placeholder/300/200',
      rating: 4.9,
      tags: ['intenso', 'brucia-grassi', 'resistance'],
      isActive: true,
      requiredCredits: 2
    },
    {
      id: '3',
      name: 'Pilates Core',
      description: 'Rafforza il core e migliora la postura con esercizi mirati di Pilates.',
      instructor: 'Sofia Wellness',
      instructorImage: '/api/placeholder/100/100',
      category: 'Pilates',
      level: 'Intermediate',
      duration: 50,
      maxParticipants: 12,
      currentParticipants: 8,
      schedule: [
        { dayOfWeek: 1, time: '19:00' },
        { dayOfWeek: 4, time: '19:00' }
      ],
      price: 28,
      image: '/api/placeholder/300/200',
      rating: 4.7,
      tags: ['core', 'postura', 'tonificazione'],
      isActive: true,
      requiredCredits: 1
    }
  ];

  // Subscriptions
  const FAKE_SUBSCRIPTIONS: Subscription[] = [
    {
      id: '1',
      name: 'Trial',
      description: 'Prova la palestra per 30 giorni',
      price: 0,
      credits: 5,
      duration: 30,
      features: ['5 ingressi', 'Accesso base', 'App mobile'],
      isPopular: false,
      maxBookingsPerDay: 1,
      accessLevel: ['basic']
    },
    {
      id: '2',
      name: 'Basic',
      description: 'Piano mensile per principianti',
      price: 39,
      credits: 20,
      duration: 30,
      features: ['20 ingressi/mese', 'Tutti i corsi base', 'App mobile', 'Spogliatoi'],
      isPopular: false,
      maxBookingsPerDay: 2,
      accessLevel: ['basic', 'intermediate']
    },
    {
      id: '3',
      name: 'Premium',
      description: 'Piano completo con tutti i vantaggi',
      price: 79,
      credits: 50,
      duration: 30,
      features: ['Ingressi illimitati', 'Tutti i corsi', 'Personal trainer', 'Spa access', 'Priorità prenotazioni'],
      isPopular: true,
      maxBookingsPerDay: 5,
      accessLevel: ['basic', 'intermediate', 'advanced']
    }
  ];

  // Achievements
  const FAKE_ACHIEVEMENTS: Achievement[] = [
    {
      id: '1',
      name: 'Newcomer',
      description: 'Completa il tuo primo allenamento',
      icon: '🎯',
      points: 50,
      category: 'milestone',
      requirement: 1,
      unlockedBy: ['1']
    },
    {
      id: '2',
      name: 'Week Warrior',
      description: 'Completa 7 allenamenti in una settimana',
      icon: '⚡',
      points: 200,
      category: 'consistency',
      requirement: 7,
      unlockedBy: []
    },
    {
      id: '3',
      name: 'Yoga Master',
      description: 'Partecipa a 20 sessioni di yoga',
      icon: '🧘',
      points: 300,
      category: 'specialty',
      requirement: 20,
      unlockedBy: []
    }
  ];

  // Products
  const FAKE_PRODUCTS: Product[] = [
    {
      id: '1',
      name: 'Protein Whey Premium',
      description: 'Proteine del siero di latte di alta qualità per il recupero muscolare',
      price: 49.99,
      originalPrice: 59.99,
      category: 'Integratori',
      brand: 'FitNutrition',
      images: ['/api/placeholder/300/300'],
      inStock: 25,
      rating: 4.8,
      reviews: 124,
      tags: ['proteine', 'recupero', 'muscoli'],
      isNew: false,
      isFeatured: true
    },
    {
      id: '2',
      name: 'Tappetino Yoga Premium',
      description: 'Tappetino antiscivolo per yoga e pilates, eco-friendly',
      price: 34.99,
      category: 'Accessori',
      brand: 'YogaLife',
      images: ['/api/placeholder/300/300'],
      inStock: 15,
      rating: 4.6,
      reviews: 89,
      tags: ['yoga', 'pilates', 'eco-friendly'],
      isNew: true,
      isFeatured: false
    }
  ];

  return {
    courses: FAKE_COURSES,
    subscriptions: FAKE_SUBSCRIPTIONS,
    achievements: FAKE_ACHIEVEMENTS,
    products: FAKE_PRODUCTS,
    bookings: JSON.parse(localStorage.getItem('app_bookings') || '[]'),
    notifications: JSON.parse(localStorage.getItem('app_notifications') || '[]'),
    cart: JSON.parse(localStorage.getItem('app_cart') || '[]'),
    orders: JSON.parse(localStorage.getItem('app_orders') || '[]'),
    userAchievements: JSON.parse(localStorage.getItem('user_achievements') || '[]')
  };
};

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState(() => initializeFakeData());

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

  useEffect(() => {
    localStorage.setItem('user_achievements', JSON.stringify(data.userAchievements));
  }, [data.userAchievements]);

  const getCourseById = (id: string) => {
    return data.courses.find(course => course.id === id);
  };

  const bookCourse = async (courseId: string, date: string, time: string): Promise<boolean> => {
    const course = getCourseById(courseId);
    if (!course) return false;

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const booking: Booking = {
      id: Date.now().toString(),
      userId: JSON.parse(localStorage.getItem('currentUser') || '{}').id || '1',
      courseId,
      date,
      time,
      status: course.currentParticipants >= course.maxParticipants ? 'waitlist' : 'confirmed',
      creditsUsed: course.requiredCredits,
      pointsEarned: 10,
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      bookings: [...prev.bookings, booking],
      courses: prev.courses.map(c => 
        c.id === courseId && booking.status === 'confirmed'
          ? { ...c, currentParticipants: c.currentParticipants + 1 }
          : c
      )
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
      ),
      courses: prev.courses.map(c => 
        c.id === booking.courseId && booking.status === 'confirmed'
          ? { ...c, currentParticipants: Math.max(0, c.currentParticipants - 1) }
          : c
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

  const unlockAchievement = (achievementId: string) => {
    if (!data.userAchievements.includes(achievementId)) {
      setData(prev => ({
        ...prev,
        userAchievements: [...prev.userAchievements, achievementId]
      }));
    }
  };

  const addPoints = (userId: string, points: number) => {
    // This would update user points in a real app
    console.log(`Added ${points} points to user ${userId}`);
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
        const product = data.products.find(p => p.id === item.productId);
        return sum + (product?.price || 0) * item.quantity;
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

  const getAnalytics = () => {
    return {
      totalUsers: 150,
      activeSubscriptions: 98,
      totalBookings: data.bookings.length,
      revenue: 15420,
      popularCourses: data.courses.slice(0, 3),
      recentActivity: data.bookings.slice(-10)
    };
  };

  const getAllUsers = () => {
    return [
      {
        id: '1',
        name: 'Mario Rossi',
        email: 'admin@fitapp.com',
        subscription: 'Premium',
        joinDate: '2023-01-15',
        status: 'active'
      },
      {
        id: '2',
        name: 'Giulia Bianchi',
        email: 'user@fitapp.com',
        subscription: 'Basic',
        joinDate: '2024-01-15',
        status: 'active'
      }
    ];
  };

  const value: AppDataContextType = {
    courses: data.courses,
    getCourseById,
    bookCourse,
    cancelBooking,
    bookings: data.bookings,
    getUserBookings,
    subscriptions: data.subscriptions,
    achievements: data.achievements,
    userAchievements: data.userAchievements,
    unlockAchievement,
    addPoints,
    notifications: data.notifications,
    getUserNotifications,
    markNotificationAsRead,
    addNotification,
    products: data.products,
    cart: data.cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    orders: data.orders,
    createOrder,
    getAnalytics,
    getAllUsers
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