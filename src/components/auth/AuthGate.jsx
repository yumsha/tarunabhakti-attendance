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

      try {
        const user = JSON.parse(userStr);

        // Support role_names, role.name (object), role (string)
        const userRoles = user.roles?.map(r => r.name?.toUpperCase())
          ?? (user.role_names ?? [])
          ?? (user.role?.name ? [user.role.name.toUpperCase()] : [])
          ?? (typeof user.role === 'string' ? [user.role.toUpperCase()] : []);

        if (allowedRoles.length === 0) {
          setAuthorized(true);
        } else {
          const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
          const hasRole = userRoles.some(r => normalizedAllowed.includes(r));
          setAuthorized(hasRole);
        }
      } catch {
        window.location.href = '/login';
        return;
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
          <p className="text-gray-600 mb-6">
            Kamu tidak memiliki izin untuk membuka halaman ini.
            {allowedRoles.length > 0 && ` Halaman ini hanya untuk role: ${allowedRoles.join(' dan ')}.`}
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}