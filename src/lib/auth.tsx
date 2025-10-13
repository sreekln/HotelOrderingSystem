import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type User } from './supabase';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Initializing...');

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log('AuthProvider: Session check complete', { hasSession: !!session });
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('AuthProvider: Error getting session:', error);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthProvider: Auth state changed', { hasSession: !!session });
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('AuthProvider: Fetching user profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        console.error('AuthProvider: User profile not found in database');
        toast.error('User profile not found. Please contact an administrator.');
        await supabase.auth.signOut();
        return;
      }

      console.log('AuthProvider: User profile loaded:', data);
      setUser(data);
    } catch (error) {
      console.error('AuthProvider: Error fetching user profile:', error);
      toast.error('Error loading user profile');
    } finally {
      console.log('AuthProvider: Setting loading to false');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: role,
          });

        if (profileError) throw profileError;
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
      const { error } = await supabase.auth.signOut();

      // Clear local state regardless of API response
      setUser(null);

      // If error is about session not found, it means we're already logged out
      // So we should treat this as a success
      if (error && error.message.includes('session_not_found')) {
        toast.success('Signed out successfully');
        return;
      }

      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error: any) {
      // Even if signOut fails, clear the local state
      setUser(null);

      // Don't show error if it's just a session issue
      if (!error.message.includes('session_not_found')) {
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully');
      }
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