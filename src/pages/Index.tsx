import { useState, useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";
import { PlayerDashboard } from "@/components/PlayerDashboard";

const Index = () => {
  // Initialize state from localStorage if available
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem('isLoggedIn') === 'true';
    } catch {
      return false;
    }
  });
  const [userType, setUserType] = useState<'admin' | 'user'>(() => {
    try {
      const savedUserType = localStorage.getItem('userType');
      return (savedUserType as 'admin' | 'user') || 'user';
    } catch {
      return 'user';
    }
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem('currentUserId') || '';
    } catch {
      return '';
    }
  });

  // Save session data to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('isLoggedIn', isLoggedIn.toString());
      localStorage.setItem('userType', userType);
      localStorage.setItem('currentUserId', currentUserId);
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }, [isLoggedIn, userType, currentUserId]);

  const handleLogin = (userType: 'admin' | 'user', userId: string) => {
    setIsLoggedIn(true);
    setUserType(userType);
    setCurrentUserId(userId);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserType('user');
    setCurrentUserId('');
    // Clear session data from localStorage
    try {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userType');
      localStorage.removeItem('currentUserId');
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  };

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <PlayerDashboard onLogout={handleLogout} userType={userType} loginUserId={currentUserId} />;
};

export default Index;
