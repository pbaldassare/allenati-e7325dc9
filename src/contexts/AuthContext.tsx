import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  dateOfBirth: string;
  phone: string;
  taxCode: string;
  address: string;
  profilePicture?: string;
  isAdmin: boolean;
  subscriptionType: string;
  subscriptionExpiry: string;
  creditsRemaining: number;
  points: number;
  level: number;
  badges: string[];
  joinDate: string;
  lastActivity: string;
  preferences: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  surname: string;
  dateOfBirth: string;
  phone: string;
  taxCode: string;
  address: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fake users database
const FAKE_USERS: (User & { password: string })[] = [
  {
    id: '1',
    email: 'admin@fitapp.com',
    password: 'admin123',
    name: 'Mario',
    surname: 'Rossi',
    dateOfBirth: '1990-01-01',
    phone: '+39 123 456 7890',
    taxCode: 'RSSMRA90A01F205X',
    address: 'Via Roma 1, Milano',
    isAdmin: true,
    subscriptionType: 'Premium',
    subscriptionExpiry: '2024-12-31',
    creditsRemaining: 50,
    points: 2500,
    level: 8,
    badges: ['Early Adopter', 'Fitness Master', 'Consistency King'],
    joinDate: '2023-01-15',
    lastActivity: new Date().toISOString(),
    preferences: {
      notifications: true,
      darkMode: false,
      language: 'it'
    }
  },
  {
    id: '2',
    email: 'user@fitapp.com',
    password: 'user123',
    name: 'Giulia',
    surname: 'Bianchi',
    dateOfBirth: '1995-05-15',
    phone: '+39 987 654 3210',
    taxCode: 'BNCGLI95E55F205Y',
    address: 'Via Garibaldi 20, Roma',
    isAdmin: false,
    subscriptionType: 'Basic',
    subscriptionExpiry: '2024-09-30',
    creditsRemaining: 12,
    points: 1200,
    level: 5,
    badges: ['Newcomer', 'Yoga Enthusiast'],
    joinDate: '2024-01-15',
    lastActivity: new Date().toISOString(),
    preferences: {
      notifications: true,
      darkMode: true,
      language: 'it'
    }
  }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored session on mount
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = FAKE_USERS.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      return true;
    }
    
    return false;
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check if user already exists
    const existingUser = FAKE_USERS.find(u => u.email === userData.email);
    if (existingUser) {
      return false;
    }

    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      email: userData.email,
      name: userData.name,
      surname: userData.surname,
      dateOfBirth: userData.dateOfBirth,
      phone: userData.phone,
      taxCode: userData.taxCode,
      address: userData.address,
      isAdmin: false,
      subscriptionType: 'Trial',
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      creditsRemaining: 5,
      points: 0,
      level: 1,
      badges: ['Newcomer'],
      joinDate: new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString(),
      preferences: {
        notifications: true,
        darkMode: false,
        language: 'it'
      }
    };

    // Add to fake database
    FAKE_USERS.push({ ...newUser, password: userData.password });
    
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // Update in fake database
      const userIndex = FAKE_USERS.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        FAKE_USERS[userIndex] = { ...FAKE_USERS[userIndex], ...userData };
      }
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};