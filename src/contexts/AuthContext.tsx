
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSeller: boolean;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  console.log('AuthProvider: Initializing');

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSeller(false);
          setUserRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('AuthProvider: Error getting session:', error);
      }
      console.log('AuthProvider: Initial session:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        checkUserRole(session.user.id);
      }
    }).catch((error) => {
      console.error('AuthProvider: Session initialization failed:', error);
      setLoading(false);
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      console.log('AuthProvider: Checking user role for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('AuthProvider: Error checking user role:', error);
        return;
      }
      
      const role = data?.role;
      console.log('AuthProvider: User role:', role);
      setUserRole(role);
      setIsAdmin(role === 'admin');
      // For now, treat any non-admin as potential seller until we can update the enum
      setIsSeller(role !== 'admin' && role !== 'user');
    } catch (error) {
      console.error('AuthProvider: Error checking user role:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string = 'user') => {
    console.log('AuthProvider: Attempting sign up for:', email);
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (error) {
      console.error('AuthProvider: Sign up error:', error);
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      console.log('AuthProvider: Sign up successful');
      toast({
        title: "Success",
        description: "Account created successfully! Please check your email to verify your account.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: Attempting sign in for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('AuthProvider: Sign in error:', error);
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      console.log('AuthProvider: Sign in successful');
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
    }

    return { error };
  };

  const signOut = async () => {
    console.log('AuthProvider: Attempting sign out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('AuthProvider: Sign out error:', error);
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      console.log('AuthProvider: Sign out successful');
      toast({
        title: "Success",
        description: "Signed out successfully!",
      });
    }
  };

  console.log('AuthProvider: Rendering with state:', { 
    user: !!user, 
    loading, 
    isAdmin, 
    isSeller, 
    userRole 
  });

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      isAdmin,
      isSeller,
      userRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};
