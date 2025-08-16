import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LoginFormProps {
  onLogin: (userType: 'admin' | 'user', userId: string) => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [generatedId, setGeneratedId] = useState("");

  // Fungsi untuk generate User ID 4 digit unik
  const generateUniqueUserId = () => {
    const registeredUsers = getRegisteredUsers();
    let newUserId;
    do {
      newUserId = Math.floor(1000 + Math.random() * 9000).toString();
    } while (registeredUsers[newUserId] || newUserId === '1111'); // Avoid admin ID
    return newUserId;
  };

  // Fungsi untuk mendapatkan registered users dari localStorage
  const getRegisteredUsers = () => {
    try {
      const users = localStorage.getItem('registeredUsers');
      return users ? JSON.parse(users) : {};
    } catch {
      return {};
    }
  };

  // Fungsi untuk menyimpan registered user ke localStorage
  const saveRegisteredUser = (userId: string, password: string, phoneNumber: string, fullName: string) => {
    try {
      const users = getRegisteredUsers();
      users[userId] = {
        password: password,
        phoneNumber: phoneNumber,
        fullName: fullName,
        registeredAt: new Date().toISOString()
      };
      localStorage.setItem('registeredUsers', JSON.stringify(users));
      
      // Trigger untuk AdminDashboard detection
      localStorage.setItem('newPlayerRegistered', 'true');
      localStorage.setItem('lastRegisteredPlayer', JSON.stringify({
        userId: userId,
        fullName: fullName,
        phoneNumber: phoneNumber,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving registered user:', error);
    }
  };

  // Fungsi untuk handle sign up
  const handleSignUp = () => {
    setError("");
    setSuccess("");

    // Validasi input
    if (!fullName || !phoneNumber || !password || !confirmPassword) {
      setError("Semua field harus diisi");
      return;
    }

    // Validasi nomor HP format
    const phoneRegex = /^[0-9+\-\s()]{8,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError("Format nomor HP tidak valid (8-15 digit)");
      return;
    }

    // Validasi nama (minimal 2 karakter)
    if (fullName.trim().length < 2) {
      setError("Nama minimal 2 karakter");
      return;
    }

    if (password.length < 4) {
      setError("Password minimal 4 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak sama");
      return;
    }

    // Cek apakah nomor HP sudah terdaftar
    const registeredUsers = getRegisteredUsers();
    const existingUser = Object.values(registeredUsers).find((user: any) => user.phoneNumber === phoneNumber);
    if (existingUser) {
      setError("Nomor HP sudah terdaftar, silakan gunakan nomor lain");
      return;
    }

    // Generate ID unik untuk user baru
    const newUserId = generateUniqueUserId();

    // Simpan user baru
    saveRegisteredUser(newUserId, password, phoneNumber, fullName);
    
    // Reset form
    setFullName("");
    setPhoneNumber("");
    setPassword("");
    setConfirmPassword("");
    
    // Otomatis kembali ke halaman login setelah registrasi berhasil
    setSuccess(`Pendaftaran berhasil! ID Anda: ${newUserId}`);
    setTimeout(() => {
      setIsSignUpMode(false);
      setSuccess("");
      setUserId(newUserId); // Set ID yang baru dibuat ke field login
    }, 2000);
  };

  const handleLogin = () => {
    setError("");
    setSuccess("");

    // Admin login
    if (userId === "1111" && password === "anakrumahan123") {
      onLogin('admin', '1111');
      return;
    }

    // Cek registered users - login dengan nama atau ID
    const registeredUsers = getRegisteredUsers();
    
    // Login dengan ID
    if (registeredUsers[userId] && registeredUsers[userId].password === password) {
      onLogin('user', userId);
      return;
    }
    
    // Login dengan nama lengkap
    const userByName = Object.entries(registeredUsers).find(([id, user]: [string, any]) => 
      user.fullName.toLowerCase() === userId.toLowerCase() && user.password === password
    );
    if (userByName) {
      onLogin('user', userByName[0]); // userByName[0] adalah ID
      return;
    }

    // Default user login (backward compatibility)
    if (userId === "1234" && password === "1234") {
      onLogin('user', '1234');
      return;
    }

    // User biasa login (ID 4 digit selain 1111) - backward compatibility
    if (userId.length === 4 && userId !== "1111" && password === "1234") {
      onLogin('user', userId);
      return;
    }

    setError("Nama/ID atau password salah");
  };

  // Fungsi untuk generate random ID
  const handleGenerateRandomId = () => {
    const randomId = generateUniqueUserId();
    setUserId(randomId);
  };

  // Fungsi untuk toggle mode
  const toggleMode = () => {
    setIsSignUpMode(!isSignUpMode);
    setError("");
    setSuccess("");
    setUserId("");
    setPassword("");
    setConfirmPassword("");
    setPhoneNumber("");
    setFullName("");
    setGeneratedId("");
  };

  // Fungsi untuk handle klik ID - kembali ke login
  const handleIdClick = () => {
    setIsSignUpMode(false);
    setSuccess("");
    setGeneratedId("");
    setError("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (isSignUpMode) {
        handleSignUp();
      } else {
        handleLogin();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Seno Online Express</CardTitle>
          <CardDescription>
            {isSignUpMode ? "Daftar akun baru" : "Masukkan ID dan password Anda"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSignUpMode ? (
            // Sign Up Form
            <>
              <div className="space-y-2">
                <Input
                  placeholder="Nama Lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-center"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="Nomor HP"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-center"
                />
              </div>
            </>
          ) : (
            // Login Form
            <div className="space-y-2">
              <Input
                placeholder="Nama atau ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-center"
              />
            </div>
          )}
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={isSignUpMode ? "Password (min 4 karakter)" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-center"
            />
          </div>
          {isSignUpMode && (
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Konfirmasi Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-center"
              />
            </div>
          )}
          <Button 
            variant="orange" 
            size="player" 
            className="w-full"
            onClick={isSignUpMode ? handleSignUp : handleLogin}
          >
            {isSignUpMode ? "Daftar" : "Masuk"}
          </Button>
          
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleMode}
              className="text-sm underline"
            >
              {isSignUpMode ? "Sudah punya akun? Masuk di sini" : "Belum punya akun? Daftar di sini"}
            </Button>
          </div>
          
          {error && (
            <p className="text-destructive text-sm text-center font-medium">
              {error}
            </p>
          )}
          {success && (
            <div className="text-center space-y-2">
              <p className="text-green-600 text-sm font-medium">
                {success.split('\n')[0]}
              </p>
              {generatedId && (
                <div 
                  className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors duration-200 active:scale-95"
                  onClick={handleIdClick}
                >
                  <p className="text-blue-800 text-xs font-medium mb-1">ID Anda:</p>
                  <p className="text-blue-900 text-lg font-bold">{generatedId}</p>
                  <p className="text-blue-600 text-xs mt-1">📱 Klik untuk kembali ke login</p>
                </div>
              )}
              {success.split('\n')[1] && (
                <p className="text-green-600 text-xs">
                  {success.split('\n')[1]}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};