import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  email: string;
  role: 'server' | 'kitchen' | 'admin' | 'customer';
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
    console.log('AuthProvider: Initializing...');

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Got session', session ? 'exists' : 'none');
      if (session?.user) {
        console.log('AuthProvider: User found in session:', session.user.id);
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);
      if (session?.user) {
        console.log('AuthProvider: User authenticated:', session.user.id);
        await fetchUserProfile(session.user.id);
      } else {
        console.log('AuthProvider: User logged out');
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('fetchUserProfile: Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .eq('id', userId)
        .maybeSingle();

      console.log('fetchUserProfile: Response', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('fetchUserProfile: Error:', error);
        throw error;
      }

      if (data) {
        console.log('fetchUserProfile: User profile loaded:', data);
        setUser(data as User);
      } else {
        console.warn('fetchUserProfile: No profile found for user');
      }
    } catch (error: any) {
      console.error('fetchUserProfile: Failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('signIn: Attempting to sign in...');
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('signIn: Response received', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('signIn: Error:', error);
        throw error;
      }

      if (data.user) {
        console.log('signIn: User authenticated, fetching profile...');
        await fetchUserProfile(data.user.id);
        toast.success('Successfully signed in!');
      }
    } catch (error: any) {
      console.error('signIn: Failed:', error);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role = 'customer') => {
    try {
      setLoading(true);

      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Then create the user profile in the users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email,
            full_name: fullName,
            role,
            password_hash: '', // Not needed for Supabase auth, but keeping schema consistent
          });

        if (profileError) {
          // If profile creation fails, clean up auth user
          await supabase.auth.signOut();
          throw profileError;
        }

        await fetchUserProfile(authData.user.id);
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
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