
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Input validation utilities
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
  }
  return { isValid: true };
};

const sanitizeInput = (input: string): string => {
  return input.replace(/[<>\"'&]/g, '').trim();
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lastAttempt, setLastAttempt] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Rate limiting constants
  const MAX_ATTEMPTS = 5;
  const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  // Check if user is rate limited
  useEffect(() => {
    const checkRateLimit = () => {
      const now = Date.now();
      if (attempts >= MAX_ATTEMPTS && (now - lastAttempt) < BLOCK_DURATION) {
        setIsBlocked(true);
        const remainingTime = Math.ceil((BLOCK_DURATION - (now - lastAttempt)) / 1000 / 60);
        toast({
          title: "Account Temporarily Blocked",
          description: `Too many failed attempts. Try again in ${remainingTime} minutes.`,
          variant: "destructive"
        });
      } else if (attempts >= MAX_ATTEMPTS && (now - lastAttempt) >= BLOCK_DURATION) {
        setAttempts(0);
        setIsBlocked(false);
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [attempts, lastAttempt, toast]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Check for email confirmation success
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true') {
      toast({
        title: "Account Confirmed",
        description: "Your account has been successfully confirmed! You can now sign in.",
      });
    }

    // Check for password reset mode
    const mode = searchParams.get('mode');
    if (mode === 'reset') {
      setResetMode(true);
      toast({
        title: "Reset Your Password",
        description: "Please enter your new password below.",
      });
    }

    // Redirect authenticated users
    if (user) {
      navigate('/');
    }
  }, [user, navigate, searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is blocked
    if (isBlocked) {
      const remainingTime = Math.ceil((BLOCK_DURATION - (Date.now() - lastAttempt)) / 1000 / 60);
      toast({
        title: "Account Temporarily Blocked",
        description: `Please try again in ${remainingTime} minutes.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (resetMode) {
        // Handle password reset
        if (!validateEmail(resetEmail)) {
          throw new Error('Please enter a valid email address');
        }

        const sanitizedEmail = sanitizeInput(resetEmail.toLowerCase());
        
        // Validate reset URL
        const resetUrl = `${window.location.origin}/auth?mode=reset`;
        const url = new URL(resetUrl);
        if (url.origin !== window.location.origin) {
          throw new Error('Invalid reset URL');
        }

        const { supabase } = await import('@/integrations/supabase/client');
        const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
          redirectTo: resetUrl,
        });

        if (error) {
          setAttempts(prev => prev + 1);
          setLastAttempt(Date.now());
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Password Reset Email Sent",
            description: "Please check your email for password reset instructions.",
          });
          setResetMode(false);
        }
        return;
      }

      if (isLogin) {
        // Validate login inputs
        if (!validateEmail(email)) {
          throw new Error('Please enter a valid email address');
        }

        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const sanitizedEmail = sanitizeInput(email.toLowerCase());
        const result = await signIn(sanitizedEmail, password);
        
        if (result.error) {
          setAttempts(prev => prev + 1);
          setLastAttempt(Date.now());
          throw new Error(result.error.message);
        } else {
          // Reset rate limiting on successful login
          setAttempts(0);
          navigate('/');
        }
      } else {
        // Validate registration inputs
        if (!validateEmail(email)) {
          throw new Error('Please enter a valid email address');
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.message);
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        if (!fullName || fullName.trim().length < 2) {
          throw new Error('Full name must be at least 2 characters long');
        }

        if (fullName.trim().length > 100) {
          throw new Error('Full name must be less than 100 characters');
        }

        const sanitizedEmail = sanitizeInput(email.toLowerCase());
        const sanitizedFullName = sanitizeInput(fullName);

        const result = await signUp(sanitizedEmail, password, sanitizedFullName);
        if (!result.error) {
          // Clear form and show success message
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setFullName('');
          setIsLogin(true);
        } else {
          throw new Error(result.error.message);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (resetMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Reset Password
              </CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a secure link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value.slice(0, 254))}
                    maxLength={254}
                    required
                    disabled={isLoading || isBlocked}
                  />
                </div>
                
                {isBlocked && (
                  <Alert>
                    <AlertDescription>
                      Too many attempts. Please try again in {Math.ceil((BLOCK_DURATION - (Date.now() - lastAttempt)) / 1000 / 60)} minutes.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading || isBlocked} 
                    className="flex-1"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResetMode(false)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isLogin ? 'Sign In' : 'Create Account'}</CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Create a new account to start shopping'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.slice(0, 100))}
                    maxLength={100}
                    required
                    disabled={isLoading || isBlocked}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.slice(0, 254))}
                  maxLength={254}
                  required
                  disabled={isLoading || isBlocked}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                    maxLength={128}
                    required
                    disabled={isLoading || isBlocked}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isBlocked}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value.slice(0, 128))}
                      maxLength={128}
                      required
                      disabled={isLoading || isBlocked}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading || isBlocked}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {isBlocked && (
                <Alert>
                  <AlertDescription>
                    Too many failed attempts. Please try again in {Math.ceil((BLOCK_DURATION - (Date.now() - lastAttempt)) / 1000 / 60)} minutes.
                  </AlertDescription>
                </Alert>
              )}

              {attempts > 0 && attempts < MAX_ATTEMPTS && !isBlocked && (
                <Alert>
                  <AlertDescription>
                    {MAX_ATTEMPTS - attempts} attempts remaining before temporary block.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || isBlocked}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
            
            {isLogin && (
              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  onClick={() => setResetMode(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={isLoading || isBlocked}
                >
                  Forgot your password?
                </Button>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setFullName('');
                  setAttempts(0); // Reset attempts when switching modes
                }}
                className="mt-2 w-full bg-gray-50 border-gray-300 text-gray-900 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400 font-medium"
                disabled={isLoading || isBlocked}
              >
                {isLogin ? 'Create Account' : 'Sign In Instead'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
