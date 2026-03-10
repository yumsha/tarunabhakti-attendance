import { useState, useEffect } from 'react';

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string[]} [props.allowedRoles]
 */
export default function AuthGate({ children, allowedRoles = [] }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        window.location.href = '/login';
        return;
      }

      const user = JSON.parse(userStr);
      
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white p-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6V9m1.285-5.385a.562.562 0 01.73-.73l.63.63a.562.562 0 01-.73.73l-.63-.63zM12 5V2m0 10v3m0 2v3m0 0a1 1 0 100 2 1 1 0 000-2zm0-2a1 1 0 100-2 1 1 0 000 2zm0-2a1 1 0 100-2 1 1 0 000 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to view this page. This area is reserved for {allowedRoles.join(' and ')} roles.</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
