
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RouteHandler = () => {
  const location = useLocation();

  useEffect(() => {
    // Store current path in sessionStorage to handle page refresh
    sessionStorage.setItem('currentPath', location.pathname + location.search);
  }, [location]);

  return null;
};

export default RouteHandler;
