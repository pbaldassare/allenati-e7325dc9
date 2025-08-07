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
  benefits: string[];
  requirements?: string[];
  schedule: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    time: string;
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
  // Courses - Complete Weekly Schedule
  const FAKE_COURSES: Course[] = [
    // Monday
    {
      id: '1',
      name: 'BJJ Principianti',
      description: 'Corso di Brazilian Jiu-Jitsu per principianti, perfetto per iniziare.',
      instructor: 'Marco Rossi',
      instructorImage: '/api/placeholder/100/100',
      category: 'BJJ',
      level: 'Beginner',
      duration: 75,
      maxParticipants: 12,
      currentParticipants: 8,
      benefits: ['Migliora la forza funzionale', 'Sviluppa tecniche di grappling', 'Aumenta la flessibilità', 'Costruisce fiducia in se stessi'],
      requirements: ['Abbigliamento sportivo', 'Asciugamano'],
      schedule: [{ dayOfWeek: 1, time: '19:00', day: 'Lunedì' }],
      price: 30,
      image: '/api/placeholder/300/200',
      rating: 4.8,
      tags: ['grappling', 'arte-marziale', 'principianti'],
      isActive: true,
      requiredCredits: 1
    },
    {
      id: '2',
      name: 'Functional Training',
      description: 'Allenamento funzionale HIIT per migliorare forza e resistenza.',
      instructor: 'Sara Bianchi',
      instructorImage: '/api/placeholder/100/100',
      category: 'Functional',
      level: 'Intermediate',
      duration: 60,
      maxParticipants: 15,
      currentParticipants: 10,
      benefits: ['Migliora la resistenza cardiovascolare', 'Aumenta la forza funzionale', 'Brucia calorie efficacemente', 'Tonifica tutto il corpo'],
      requirements: ['Scarpe da ginnastica', 'Bottiglia d\'acqua'],
      schedule: [{ dayOfWeek: 1, time: '20:30', day: 'Lunedì' }],
      price: 25,
      image: '/api/placeholder/300/200',
      rating: 4.7,
      tags: ['hiit', 'functional', 'cardio'],
      isActive: true,
      requiredCredits: 1
    },
    
    // Tuesday
    {
      id: '3',
      name: 'MMA Base',
      description: 'Mixed Martial Arts per livello intermedio, tecnica e sparring.',
      instructor: 'Luca Verdi',
      instructorImage: '/api/placeholder/100/100',
      category: 'MMA',
      level: 'Intermediate',
      duration: 90,
      maxParticipants: 12,
      currentParticipants: 12,
      benefits: ['Sviluppa tecniche di striking e grappling', 'Migliora coordinazione e riflessi', 'Aumenta la resistenza mentale', 'Perfetto per autodifesa'],
      requirements: ['Paradenti', 'Fasce per le mani', 'Abbigliamento sportivo'],
      schedule: [{ dayOfWeek: 2, time: '18:00', day: 'Martedì' }],
      price: 35,
      image: '/api/placeholder/300/200',
      rating: 4.9,
      tags: ['mma', 'fighting', 'sparring'],
      isActive: true,
      requiredCredits: 2
    },
    {
      id: '4',
      name: 'Yoga Hatha',
      description: 'Yoga tradizionale per tutti i livelli, focus su posture e respirazione.',
      instructor: 'Anna Gialli',
      instructorImage: '/api/placeholder/100/100',
      category: 'Yoga',
      level: 'Beginner',
      duration: 60,
      maxParticipants: 15,
      currentParticipants: 5,
      benefits: ['Migliora la flessibilità', 'Riduce lo stress', 'Aumenta la consapevolezza corporea', 'Favorisce il rilassamento'],
      requirements: ['Tappetino yoga', 'Abbigliamento comodo'],
      schedule: [{ dayOfWeek: 2, time: '10:00', day: 'Martedì' }],
      price: 20,
      image: '/api/placeholder/300/200',
      rating: 4.6,
      tags: ['yoga', 'rilassamento', 'mindfulness'],
      isActive: true,
      requiredCredits: 1
    },
    
    // Wednesday
    {
      id: '5',
      name: 'Boxing Tecnica',
      description: 'Boxe tecnica per principianti, focus su fondamentali e tecnica.',
      instructor: 'Roberto Neri',
      instructorImage: '/api/placeholder/100/100',
      category: 'Boxing',
      level: 'Beginner',
      duration: 60,
      maxParticipants: 10,
      currentParticipants: 6,
      benefits: ['Migliora coordinazione e riflessi', 'Aumenta la forza delle braccia', 'Ottimo esercizio cardiovascolare', 'Sviluppa disciplina mentale'],
      requirements: ['Guanti da boxe', 'Fasce per le mani', 'Abbigliamento sportivo'],
      schedule: [{ dayOfWeek: 3, time: '19:00', day: 'Mercoledì' }],
      price: 28,
      image: '/api/placeholder/300/200',
      rating: 4.7,
      tags: ['boxing', 'tecnica', 'striking'],
      isActive: true,
      requiredCredits: 1
    },
    {
      id: '6',
      name: 'BJJ Intermedio',
      description: 'Brazilian Jiu-Jitsu livello intermedio, tecniche avanzate.',
      instructor: 'Marco Rossi',
      instructorImage: '/api/placeholder/100/100',
      category: 'BJJ',
      level: 'Intermediate',
      duration: 75,
      maxParticipants: 12,
      currentParticipants: 9,
      benefits: ['Perfeziona le tecniche di grappling', 'Sviluppa strategia tattica', 'Migliora la resistenza fisica', 'Aumenta la fiducia in competizione'],
      requirements: ['Kimono (Gi)', 'Cintura appropriata'],
      schedule: [{ dayOfWeek: 3, time: '20:15', day: 'Mercoledì' }],
      price: 30,
      image: '/api/placeholder/300/200',
      rating: 4.8,
      tags: ['bjj', 'grappling', 'intermedio'],
      isActive: true,
      requiredCredits: 1
    },
    
    // Thursday
    {
      id: '7',
      name: 'Muay Thai',
      description: 'Arte marziale thailandese, livello avanzato con sparring.',
      instructor: 'Thai Master',
      instructorImage: '/api/placeholder/100/100',
      category: 'Muay Thai',
      level: 'Advanced',
      duration: 90,
      maxParticipants: 10,
      currentParticipants: 8,
      benefits: ['Tecniche di striking complete', 'Potenziamento fisico intenso', 'Migliora riflessi e coordinazione', 'Autodifesa efficace'],
      requirements: ['Paradenti', 'Fasce per le mani', 'Parastinchi', 'Esperienza di base'],
      schedule: [{ dayOfWeek: 4, time: '19:30', day: 'Giovedì' }],
      price: 35,
      image: '/api/placeholder/300/200',
      rating: 4.9,
      tags: ['muay-thai', 'striking', 'avanzato'],
      isActive: true,
      requiredCredits: 2
    },
    
    // Friday
    {
      id: '8',
      name: 'Wrestling',
      description: 'Lotta libera per atleti di livello competitivo.',
      instructor: 'Mike Johnson',
      instructorImage: '/api/placeholder/100/100',
      category: 'Wrestling',
      level: 'Advanced',
      duration: 90,
      maxParticipants: 8,
      currentParticipants: 7,
      benefits: ['Tecniche di takedown avanzate', 'Forza esplosiva', 'Resistenza mentale', 'Preparazione competitiva'],
      requirements: ['Scarpe da wrestling', 'Abbigliamento aderente', 'Esperienza precedente'],
      schedule: [{ dayOfWeek: 5, time: '18:00', day: 'Venerdì' }],
      price: 35,
      image: '/api/placeholder/300/200',
      rating: 4.8,
      tags: ['wrestling', 'takedown', 'competition'],
      isActive: true,
      requiredCredits: 2
    },
    {
      id: '9',
      name: 'Grappling No-Gi',
      description: 'Grappling senza kimono, tutti i livelli benvenuti.',
      instructor: 'Marco Rossi',
      instructorImage: '/api/placeholder/100/100',
      category: 'Grappling',
      level: 'Intermediate',
      duration: 75,
      maxParticipants: 15,
      currentParticipants: 11,
      benefits: ['Tecniche di submission senza kimono', 'Velocità e fluidità', 'Adattabilità', 'Preparazione MMA'],
      requirements: ['Rash guard', 'Pantaloncini aderenti'],
      schedule: [{ dayOfWeek: 5, time: '20:00', day: 'Venerdì' }],
      price: 30,
      image: '/api/placeholder/300/200',
      rating: 4.7,
      tags: ['grappling', 'no-gi', 'submission'],
      isActive: true,
      requiredCredits: 1
    },
    
    // Saturday
    {
      id: '10',
      name: 'Yoga Vinyasa',
      description: 'Yoga dinamico con flow continuo, livello intermedio.',
      instructor: 'Anna Gialli',
      instructorImage: '/api/placeholder/100/100',
      category: 'Yoga',
      level: 'Intermediate',
      duration: 90,
      maxParticipants: 20,
      currentParticipants: 12,
      benefits: ['Flow dinamico e fluido', 'Forza e flessibilità', 'Concentrazione e mindfulness', 'Equilibrio corpo-mente'],
      requirements: ['Tappetino yoga', 'Abbigliamento flessibile', 'Bottiglia d\'acqua'],
      schedule: [{ dayOfWeek: 6, time: '09:00', day: 'Sabato' }],
      price: 25,
      image: '/api/placeholder/300/200',
      rating: 4.8,
      tags: ['yoga', 'vinyasa', 'flow'],
      isActive: true,
      requiredCredits: 1
    },
    {
      id: '11',
      name: 'MMA Sparring',
      description: 'Sessione di sparring MMA per atleti avanzati.',
      instructor: 'Luca Verdi',
      instructorImage: '/api/placeholder/100/100',
      category: 'MMA',
      level: 'Advanced',
      duration: 90,
      maxParticipants: 8,
      currentParticipants: 6,
      benefits: ['Esperienza di combattimento reale', 'Test delle abilità tecniche', 'Condizionamento mentale', 'Preparazione competizioni'],
      requirements: ['Paradenti', 'Casco protettivo', 'Fasce mani', 'Esperienza MMA'],
      schedule: [{ dayOfWeek: 6, time: '11:00', day: 'Sabato' }],
      price: 40,
      image: '/api/placeholder/300/200',
      rating: 4.9,
      tags: ['mma', 'sparring', 'competition'],
      isActive: true,
      requiredCredits: 2
    },
    
    // Sunday
    {
      id: '12',
      name: 'Open Mat BJJ',
      description: 'Allenamento libero di BJJ, tutti i livelli, rolling libero.',
      instructor: 'Tutti gli istruttori',
      instructorImage: '/api/placeholder/100/100',
      category: 'BJJ',
      level: 'Intermediate',
      duration: 120,
      maxParticipants: 20,
      currentParticipants: 15,
      benefits: ['Allenamento libero e personale', 'Sperimentazione tecniche', 'Rolling con vari partner', 'Miglioramento naturale'],
      requirements: ['Kimono o No-Gi', 'Esperienza base BJJ'],
      schedule: [{ dayOfWeek: 0, time: '10:00', day: 'Domenica' }],
      price: 25,
      image: '/api/placeholder/300/200',
      rating: 4.8,
      tags: ['bjj', 'open-mat', 'rolling'],
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