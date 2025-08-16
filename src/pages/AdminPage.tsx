import React, { useState, useEffect } from 'react';
import AdminDashboard from '@/components/AdminDashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if admin is already logged in on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const adminAuth = localStorage.getItem('adminAuthenticated');
        const adminSession = localStorage.getItem('adminSession');
        
        if (adminAuth === 'true' && adminSession) {
          const sessionData = JSON.parse(adminSession);
          const currentTime = new Date().getTime();
          
          // Check if session is still valid (24 hours)
          if (currentTime - sessionData.loginTime < 24 * 60 * 60 * 1000) {
            setIsAuthenticated(true);
            console.log('✅ Admin session restored from localStorage');
          } else {
            // Session expired, clear localStorage
            localStorage.removeItem('adminAuthenticated');
            localStorage.removeItem('adminSession');
            console.log('⏰ Admin session expired, cleared localStorage');
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminSession');
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const handleAdminLogin = () => {
    // Validasi admin credentials
    if (adminId === '1111' && adminPassword === 'anakrumahan123') {
      setIsAuthenticated(true);
      setError('');
      
      // Save authentication state to localStorage
      try {
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminSession', JSON.stringify({
          loginTime: new Date().getTime(),
          adminId: '1111'
        }));
        console.log('✅ Admin logged in successfully and session saved');
      } catch (error) {
        console.error('Error saving admin session:', error);
      }
    } else {
      setError('Invalid admin credentials');
      console.log('❌ Invalid admin login attempt');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdminLogin();
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminId('');
    setAdminPassword('');
    setError('');
    
    // Clear authentication state from localStorage
    try {
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('adminSession');
      console.log('👋 Admin logged out and session cleared');
    } catch (error) {
      console.error('Error clearing admin session:', error);
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="relative">
        {/* Logout Button */}
        <div className="absolute top-4 right-4 z-50">
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="bg-red-600 hover:bg-red-700 text-white border-red-500"
          >
            🚪 Logout
          </Button>
        </div>
        
        {/* Admin Dashboard */}
        <AdminDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      <Card className="w-full max-w-md bg-gray-800 bg-opacity-90 backdrop-blur-sm border-gray-700 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🛡️</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            SENO Admin Login
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Access Customer Service Dashboard
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-3">
              <p className="text-red-300 text-sm text-center">❌ {error}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Admin ID</label>
            <Input
              type="text"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter Admin ID"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter Password"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
            />
          </div>
          
          <Button 
            onClick={handleAdminLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
          >
            🔐 Login as Admin
          </Button>
          
          <div className="text-center pt-4">
            <a 
              href="/"
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200"
            >
              ← Back to Player Dashboard
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
