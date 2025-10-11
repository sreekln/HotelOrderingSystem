import React, { createContext, useContext, useState } from 'react';
import { mockUsers, User } from './mockData';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find user by email
      const foundUser = mockUsers.find(u => u.email === email);
      
      if (!foundUser) {
        throw new Error('Invalid email or password');
      }
      
      // In a real app, you'd verify the password here
      // For demo purposes, any password works
      
      // Create a mock session in Supabase for Stripe integration
      try {
        await supabase.auth.signInWithPassword({
          email: 'demo@hotel.com',
          password: 'demo123456'
        });
      } catch (supabaseError) {
        console.warn('Supabase auth failed, continuing with mock auth:', supabaseError);
      }
      
      setUser(foundUser);
      toast.success(`Welcome back, ${foundUser.full_name}!`);
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
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user already exists
      const existingUser = mockUsers.find(u => u.email === email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Create new user
      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        full_name: fullName,
        role: role as 'server' | 'kitchen' | 'admin',
        created_at: new Date().toISOString()
      };
      
      // Add to mock users (in a real app, this would be saved to database)
      mockUsers.push(newUser);
      
      // Create a mock session in Supabase for Stripe integration
      try {
        await supabase.auth.signInWithPassword({
          email: 'demo@hotel.com',
          password: 'demo123456'
        });
      } catch (supabaseError) {
        console.warn('Supabase auth failed, continuing with mock auth:', supabaseError);
      }
      
      setUser(newUser);
      
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
      // Sign out from Supabase as well
      await supabase.auth.signOut();
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