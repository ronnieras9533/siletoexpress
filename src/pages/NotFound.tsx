
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
          {location.pathname.includes('/product/') && (
            <p className="text-sm text-blue-600 mb-4">
              If you refreshed a product page, this might be a temporary issue.
            </p>
          )}
          <p className="text-sm text-gray-500 mb-8">
            Redirecting to home page in {countdown} seconds...
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          
          {location.pathname.includes('/product/') && (
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          
          <Button onClick={() => navigate('/')}>
            <Home className="mr-2 h-4 w-4" />
            Go Home Now
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Having trouble? Try:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Checking your internet connection</li>
            <li>Going back to the products page</li>
            <li>Contacting support if the issue persists</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
