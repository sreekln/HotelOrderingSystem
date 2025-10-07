import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from './api';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  email: string;
  role: 'server' | 'kitchen' | 'admin';
  full_name: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('auth_token');
    if (token) {
      apiClient.setToken(token);
      // Verify token by making a request (you could add a /me endpoint)
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await apiClient.signIn({ email, password });
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const { user, token } = response.data as any;
        apiClient.setToken(token);
        setUser(user);
      }
      
      toast.success('Successfully signed in!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role = 'customer') => {
    try {
      setLoading(true);
      
      const response = await apiClient.signUp({
        email,
        password,
        full_name: fullName,
        role,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const { user, token } = response.data as any;
        apiClient.setToken(token);
        setUser(user);
      }
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      apiClient.setToken(null);
      setUser(null);
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};