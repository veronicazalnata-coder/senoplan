import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, BarChart3, Eye, LogOut, RefreshCw, Smartphone } from "lucide-react";

interface PlayerDashboardProps {
  onLogout?: () => void;
  userType?: 'admin' | 'user';
  loginUserId?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  image?: string;
  sender: 'user' | 'admin';
  timestamp: Date;
}

export const PlayerDashboard = ({ onLogout, userType = 'user', loginUserId }: PlayerDashboardProps) => {
  const [timer, setTimer] = useState(46);
  const [timer2, setTimer2] = useState(32);
  const [seri, setSeri] = useState(8036);
  const [seri2, setSeri2] = useState(8923);
  
  // Server timer states synced with AdminDashboard
  const [serverTimers, setServerTimers] = useState({
    server1: { timeLeft: 0, seri: 0, isActive: false },
    server2: { timeLeft: 0, seri: 0, isActive: false }
  });
  const [nextResults, setNextResults] = useState({ server1: 0, server2: 0 });
  const [activePage, setActivePage] = useState('halaman');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPageRefreshing, setIsPageRefreshing] = useState(false);
  
  // State untuk halaman dompet
  const [bankName, setBankName] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeServer, setActiveServer] = useState<'server1' | 'server2'>('server1');
  const [showBetAmountOptions, setShowBetAmountOptions] = useState(false);
  const [lastSelectedAmount, setLastSelectedAmount] = useState<number | null>(null);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Free Input Modal state
  const [showFreeInputModal, setShowFreeInputModal] = useState(false);
  const [freeInputBetType, setFreeInputBetType] = useState<string>('');
  const [freeInputAmount, setFreeInputAmount] = useState<string>('');
  
  // Winning numbers for both servers
  const [winningNumbers1, setWinningNumbers1] = useState(7);
  const [winningNumbers2, setWinningNumbers2] = useState(3);
  
  // History of winning numbers
  const [winningHistory, setWinningHistory] = useState<Array<{
    seri: number;
    result: number;
    server: 'server1' | 'server2';
    timestamp: Date;
  }>>([]);
  
  // Betting state
  const [betAmount, setBetAmount] = useState(0);
  const [selectedBet, setSelectedBet] = useState<'besar' | 'kecil' | 'genap' | 'ganjil' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | null>(null);
  const [balance, setBalance] = useState(0);
  
  // State untuk User ID
  const [userId, setUserId] = useState<string>(loginUserId || '');
  const [betHistory, setBetHistory] = useState<Array<{
    type: string;
    amount: number;
    result: string;
    win: boolean;
    timestamp: Date;
    seri: number;
    server: 'server1' | 'server2';
  }>>([]);
  const [lastWinnings, setLastWinnings] = useState(0);
  
  // State untuk riwayat penarikan saldo
  const [withdrawalHistory, setWithdrawalHistory] = useState<Array<{
    id: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    timestamp: Date;
    status: 'pending' | 'approved' | 'rejected';
  }>>([]);
  
  // State untuk CS Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [lastAdminMessageId, setLastAdminMessageId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // State untuk CS Announcement
  const [csAnnouncement, setCsAnnouncement] = useState<string>('');
  const [previousAdminMessageCount, setPreviousAdminMessageCount] = useState(0);
  
  // Use useRef to track the last notified message count to prevent repeated sounds
  const lastNotifiedCountRef = useRef(0);
  const hasPlayedSoundRef = useRef(false);
  
  // Ref for auto-scroll to bottom of chat
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  
  // State untuk photo modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [modalPhotoSrc, setModalPhotoSrc] = useState<string>('');
  
  // State untuk Admin Bet Changes Tracking
  const [adminChangedBet, setAdminChangedBet] = useState<{
    originalBet: string;
    newBet: string;
    timestamp: Date;
  } | null>(null);
  const [lastCheckedBetState, setLastCheckedBetState] = useState<{
    betType: string;
    amount: number;
    server: string;
    seri: number;
  } | null>(null);
  

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  
  // Audio functions
  const playClickSound = () => {
    try {
      // Simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Audio not supported');
    }
  };
  
  const playTrumpetSound = () => {
    try {
      // Trumpet-like celebration sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Trumpet melody notes
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      let time = audioContext.currentTime;
      
      notes.forEach((freq, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.value = freq;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        
        osc.start(time);
        osc.stop(time + 0.3);
        time += 0.2;
      });
    } catch (error) {
      console.log('Audio not supported');
    }
  };
  
  const triggerCelebration = () => {
    setShowCelebration(true);
    playTrumpetSound();
    setTimeout(() => setShowCelebration(false), 3000);
  };
  
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Phone ring sound - 2 rings
      const createRing = (startTime: number) => {
        // First tone of ring
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.setValueAtTime(800, startTime);
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0, startTime);
        gain1.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gain1.gain.linearRampToValueAtTime(0, startTime + 0.4);
        osc1.start(startTime);
        osc1.stop(startTime + 0.4);
        
        // Second tone of ring (higher pitch)
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(1000, startTime + 0.1);
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0, startTime + 0.1);
        gain2.gain.linearRampToValueAtTime(0.3, startTime + 0.15);
        gain2.gain.linearRampToValueAtTime(0, startTime + 0.4);
        osc2.start(startTime + 0.1);
        osc2.stop(startTime + 0.4);
      };
      
      // Create 2 rings with pause between
      createRing(audioContext.currentTime);
      createRing(audioContext.currentTime + 0.8); // Second ring after 0.8s pause
      
    } catch (error) {
      console.log('Audio not supported');
    }
  };
  
  // Auto-scroll removed - users can manually scroll chat

  // Auto-logout monitoring - Check if player has been deleted by admin
  useEffect(() => {
    if (userType !== 'user' || !loginUserId) return;

    const checkDeletionStatus = () => {
      try {
        // Check deletion flag
        const deletionFlag = localStorage.getItem(`player_deleted_${loginUserId}`);
        if (deletionFlag === 'true') {
          alert('Akun Anda telah dihapus oleh admin. Anda akan logout secara otomatis.');
          // Clean up deletion flag
          localStorage.removeItem(`player_deleted_${loginUserId}`);
          // Logout player
          if (onLogout) {
            onLogout();
          }
          return;
        }

        // Double check: verify player still exists in registeredUsers
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        if (!registeredUsers[loginUserId]) {
          alert('Akun Anda tidak ditemukan dalam sistem. Anda akan logout secara otomatis.');
          // Logout player
          if (onLogout) {
            onLogout();
          }
          return;
        }
      } catch (error) {
        console.error('Error checking deletion status:', error);
      }
    };

    // Check immediately
    checkDeletionStatus();

    // Set up monitoring interval (check every 3 seconds)
    const monitoringInterval = setInterval(checkDeletionStatus, 3000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(monitoringInterval);
    };
  }, [loginUserId, userType, onLogout]);

  // Real-time balance monitoring - Update balance when admin changes it
  useEffect(() => {
    if (userType !== 'user' || !loginUserId) return;

    const monitorBalanceChanges = () => {
      try {
        const storageKey = `balance_${loginUserId}`;
        const currentStoredBalance = localStorage.getItem(storageKey);
        
        if (currentStoredBalance) {
          const newBalance = parseInt(currentStoredBalance);
          // Use callback to get current balance and avoid dependency loop
          setBalance(currentBalance => {
            // Only update if balance has actually changed
            if (newBalance !== currentBalance) {
              console.log(`💰 Balance updated by admin: ${currentBalance} → ${newBalance}`);
              
              // Show notification to user about balance change
              toast({
                title: "💰 Saldo Diperbarui",
                description: `Saldo Anda telah diperbarui menjadi ${newBalance.toLocaleString('id-ID')}K`,
                duration: 3000,
              });
              
              return newBalance;
            }
            return currentBalance;
          });
        }
      } catch (error) {
        console.error('Error monitoring balance changes:', error);
      }
    };

    const monitorWithdrawalChanges = () => {
      try {
        const refreshTriggerData = localStorage.getItem('playerRefreshTrigger');
        if (refreshTriggerData) {
          const trigger = JSON.parse(refreshTriggerData);
          
          // Check if this trigger is for the current player
          if (trigger.playerId === loginUserId && trigger.action === 'withdrawal_status_change') {
            const currentTime = Date.now();
            const timeDiff = currentTime - trigger.timestamp;
            
            // Only process triggers that are less than 5 seconds old to avoid stale triggers
            if (timeDiff < 5000) {
              console.log(`🔄 Admin changed withdrawal status - auto-refreshing for player ${loginUserId}`);
              
              // Reload withdrawal history
              loadWithdrawalHistory(loginUserId);
              
              // Show notification to user
              toast({
                title: "🔄 Status Penarikan Diperbarui",
                description: "Status penarikan Anda telah diperbarui oleh admin",
                duration: 3000,
              });
              
              // Clear the trigger to prevent repeated processing
              localStorage.removeItem('playerRefreshTrigger');
              console.log(`✅ Auto-refresh completed and trigger cleared for player ${loginUserId}`);
            } else {
              // Remove stale triggers (older than 5 seconds)
              localStorage.removeItem('playerRefreshTrigger');
              console.log(`🗑️ Removed stale refresh trigger (${timeDiff}ms old)`);
            }
          }
        }
      } catch (error) {
        console.error('Error monitoring withdrawal changes:', error);
      }
    };

    // Set up monitoring intervals (check every 3 seconds to reduce frequency)
    const balanceMonitoringInterval = setInterval(monitorBalanceChanges, 3000);
    const withdrawalMonitoringInterval = setInterval(monitorWithdrawalChanges, 1000); // Check more frequently for withdrawal changes

    // Cleanup intervals on unmount
    return () => {
      clearInterval(balanceMonitoringInterval);
      clearInterval(withdrawalMonitoringInterval);
    };
  }, [loginUserId, userType, toast]);

  // Initialize admin message count for global monitoring
  useEffect(() => {
    // Allow initialization for both 'user' and 'admin' userType in PlayerDashboard
    if (!loginUserId || (userType !== 'user' && userType !== 'admin')) return;
    
    // Initialize previous admin message count on first load
    const initializeAdminMessageCount = () => {
      try {
        const storageKey = `chatMessages_${loginUserId}`;
        const savedMessages = localStorage.getItem(storageKey);
        
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages) as ChatMessage[];
          const adminMessages = parsedMessages.filter((msg: ChatMessage) => msg.sender === 'admin');
          const initialCount = adminMessages.length;
          setPreviousAdminMessageCount(initialCount);
          lastNotifiedCountRef.current = initialCount; // Initialize ref with current count
          console.log(`📊 Initialized admin message count: ${initialCount}`);
        } else {
          setPreviousAdminMessageCount(0);
          lastNotifiedCountRef.current = 0; // Initialize ref with 0
          console.log(`📊 Initialized admin message count: 0 (no messages found)`);
        }
      } catch (error) {
        console.error('Error initializing admin message count:', error);
        setPreviousAdminMessageCount(0);
      }
    };
    
    initializeAdminMessageCount();
  }, [loginUserId, userType]);

  // Global chat monitoring - Check for new admin messages even when not in CS page
  useEffect(() => {
    console.log(`🔍 Global monitoring check - userType: ${userType}, loginUserId: ${loginUserId}`);
    
    // Allow monitoring for both 'user' and 'admin' userType in PlayerDashboard
    if (!loginUserId || (userType !== 'user' && userType !== 'admin')) {
      console.log(`❌ Global monitoring stopped - userType: ${userType}, loginUserId: ${loginUserId}`);
      return;
    }
    
    console.log(`✅ Global monitoring started for user: ${loginUserId}`);

    const monitorChatMessages = () => {
      try {
        const storageKey = `chatMessages_${loginUserId}`;
        const savedMessages = localStorage.getItem(storageKey);
        
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages).map((item: ChatMessage & { timestamp: string }) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          
          // Check for new admin messages
          const adminMessages = parsedMessages.filter((msg: ChatMessage) => msg.sender === 'admin');
          const currentAdminMessageCount = adminMessages.length;
          
          console.log(`📊 Chat monitoring - Current: ${currentAdminMessageCount}, LastNotified: ${lastNotifiedCountRef.current}, Page: ${activePage}`);
          console.log(`📊 Admin messages found:`, adminMessages.map(msg => ({ id: msg.id, text: msg.text.substring(0, 50) + '...' })));
          
          // Only play sound and show notification for NEW messages that haven't been notified yet
          if (currentAdminMessageCount > lastNotifiedCountRef.current && activePage !== 'cs') {
            console.log(`🔔 NEW admin message detected: ${lastNotifiedCountRef.current} → ${currentAdminMessageCount}`);
            console.log(`🔴 Playing notification sound and showing badge`);
            playNotificationSound();
            setHasUnreadMessages(true);
            
            // Update the ref to current count to prevent repeated notifications
            lastNotifiedCountRef.current = currentAdminMessageCount;
            setPreviousAdminMessageCount(currentAdminMessageCount);
          } else if (currentAdminMessageCount !== previousAdminMessageCount && activePage !== 'cs') {
            // Update count for sync but don't play sound (already notified)
            setPreviousAdminMessageCount(currentAdminMessageCount);
            console.log(`🔄 Syncing count without sound: ${currentAdminMessageCount}`);
          } else {
            console.log(`🔄 No new messages or in CS page - Current: ${currentAdminMessageCount}, LastNotified: ${lastNotifiedCountRef.current}, Page: ${activePage}`);
          }
          
          // Update messages if we're not in CS (to avoid conflict with CS page monitoring)
          if (activePage !== 'cs') {
            setChatMessages(parsedMessages);
          }
        }
      } catch (error) {
        console.error('Error monitoring chat messages:', error);
      }
    };

    // Set up monitoring interval (check every 2 seconds)
    const chatMonitoringInterval = setInterval(monitorChatMessages, 2000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(chatMonitoringInterval);
    };
  }, [loginUserId, userType, activePage]); // Added activePage back to deps for proper notification control

  // Debug: Monitor hasUnreadMessages state changes
  useEffect(() => {
    console.log(`🟡 hasUnreadMessages state changed to: ${hasUnreadMessages}`);
  }, [hasUnreadMessages]);

  // Monitor server timers from localStorage (sync with AdminDashboard)
  useEffect(() => {
    // Load initial server timers
    loadServerTimers();
    
    // Set up monitoring interval to sync with AdminDashboard (every 1 second)
    const timerMonitoringInterval = setInterval(() => {
      loadServerTimers();
    }, 1000);
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(timerMonitoringInterval);
    };
  }, []);

  // Fungsi untuk menghasilkan nomor seri acak dengan auto reset
  const generateRandomSeri = (currentSeri: number) => {
    const nextSeri = currentSeri + 1;
    // Auto reset ke 0001 jika sudah mencapai 9999
    return nextSeri > 9999 ? 1 : nextSeri;
  };

  // Fungsi untuk menghasilkan angka pemenang acak
  const generateRandomWinningNumbers = () => {
    return Math.floor(Math.random() * 10); // 0-9 only, single number
  };

  // Load server timers dari localStorage (sync dengan AdminDashboard)
  const loadServerTimers = () => {
    try {
      // Load timer data dari localStorage yang disinkronkan dengan AdminDashboard
      const currentServerTimerData = localStorage.getItem('currentServerTimer');
      
      const newTimers = {
        server1: { timeLeft: 0, seri: 0, isActive: false },
        server2: { timeLeft: 0, seri: 0, isActive: false }
      };
      
      if (currentServerTimerData) {
        try {
          const parsed = JSON.parse(currentServerTimerData);
          
          if (parsed.server1) {
            newTimers.server1 = {
              timeLeft: parsed.server1.timeLeft || 0,
              seri: parsed.server1.seri || 0,
              isActive: parsed.server1.isActive || false
            };
            
            // Update next result from localStorage if available
            if (parsed.server1.nextResult !== undefined) {
              // Check if this is an admin override
              if (parsed.server1.adminOverride) {
                console.log(`🔒 [PLAYER] Admin override detected for server1: ${parsed.server1.nextResult}`);
                setNextResults(prev => ({ ...prev, server1: parsed.server1.nextResult }));
              } else {
                setNextResults(prev => ({ ...prev, server1: parsed.server1.nextResult }));
              }
            }
          }
          
          if (parsed.server2) {
            newTimers.server2 = {
              timeLeft: parsed.server2.timeLeft || 0,
              seri: parsed.server2.seri || 0,
              isActive: parsed.server2.isActive || false
            };
            
            // Update next result from localStorage if available
            if (parsed.server2.nextResult !== undefined) {
              // Check if this is an admin override
              if (parsed.server2.adminOverride) {
                console.log(`🔒 [PLAYER] Admin override detected for server2: ${parsed.server2.nextResult}`);
                setNextResults(prev => ({ ...prev, server2: parsed.server2.nextResult }));
              } else {
                setNextResults(prev => ({ ...prev, server2: parsed.server2.nextResult }));
              }
            }
          }
          
        } catch (error) {
          console.error('Error parsing current server timer:', error);
        }
      }
      
      setServerTimers(newTimers);
      
    } catch (error) {
      console.error('Error loading server timers:', error);
    }
  };

  // Fungsi untuk generate User ID 4 digit
  const generateUserId = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
  };

  // Fungsi untuk load withdrawal history dari localStorage berdasarkan user ID
  const loadWithdrawalHistory = (userIdToLoad: string) => {
    try {
      const storageKey = `withdrawalHistory_${userIdToLoad}`;
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setWithdrawalHistory(parsedHistory);
      } else {
        setWithdrawalHistory([]);
      }
    } catch (error) {
      console.error('Error loading withdrawal history:', error);
      setWithdrawalHistory([]);
    }
  };

  // Fungsi untuk save withdrawal history ke localStorage berdasarkan user ID
  const saveWithdrawalHistory = (userIdToSave: string, history: any[]) => {
    try {
      const storageKey = `withdrawalHistory_${userIdToSave}`;
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving withdrawal history:', error);
    }
  };

  // Fungsi untuk load bet history dari localStorage berdasarkan user ID
  const loadBetHistory = (userIdToLoad: string) => {
    try {
      const storageKey = `betHistory_${userIdToLoad}`;
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setBetHistory(parsedHistory);
      } else {
        setBetHistory([]);
      }
    } catch (error) {
      console.error('Error loading bet history:', error);
      setBetHistory([]);
    }
  };

  // Fungsi untuk save bet history ke localStorage berdasarkan user ID
  const saveBetHistory = (userIdToSave: string, history: any[]) => {
    try {
      const storageKey = `betHistory_${userIdToSave}`;
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving bet history:', error);
    }
  };

  // Fungsi untuk load balance dari localStorage berdasarkan user ID
  const loadUserBalance = (userIdToLoad: string) => {
    try {
      const storageKey = `balance_${userIdToLoad}`;
      const savedBalance = localStorage.getItem(storageKey);
      if (savedBalance) {
        const parsedBalance = parseInt(savedBalance);
        setBalance(parsedBalance);
      } else {
        // Player baru dimulai dengan saldo 0
        setBalance(0);
        saveUserBalance(userIdToLoad, 0);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
      // Jika error, set ke 0
      setBalance(0);
    }
  };

  // Fungsi untuk save balance ke localStorage berdasarkan user ID
  const saveUserBalance = (userIdToSave: string, balanceToSave: number) => {
    try {
      const storageKey = `balance_${userIdToSave}`;
      localStorage.setItem(storageKey, balanceToSave.toString());
    } catch (error) {
      console.error('Error saving balance:', error);
    }
  };

  // Fungsi untuk save chat messages ke localStorage berdasarkan user ID
  const saveChatMessages = (userIdToSave: string, messages: ChatMessage[]) => {
    try {
      const storageKey = `chatMessages_${userIdToSave}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  };

  // Fungsi untuk load chat messages dari localStorage berdasarkan user ID
  const loadChatMessages = (userIdToLoad: string) => {
    try {
      const storageKey = `chatMessages_${userIdToLoad}`;
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        
        // Check for new admin messages
        const adminMessages = parsedMessages.filter((msg: ChatMessage) => msg.sender === 'admin');
        const currentAdminMessageCount = adminMessages.length;
        
        // If we have more admin messages than before, play notification and set unread flag
        if (currentAdminMessageCount > previousAdminMessageCount && previousAdminMessageCount > 0 && activePage !== 'cs') {
          playNotificationSound();
          setHasUnreadMessages(true);
          console.log(`🔔 New admin message detected: ${previousAdminMessageCount} → ${currentAdminMessageCount}`);
        }
        
        // Update previous count
        setPreviousAdminMessageCount(currentAdminMessageCount);
        setChatMessages(parsedMessages);
      } else {
        setChatMessages([]);
        setPreviousAdminMessageCount(0);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setChatMessages([]);
    }
  };

  // Functions untuk photo modal
  const openPhotoModal = (imageSrc: string) => {
    setModalPhotoSrc(imageSrc);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setModalPhotoSrc('');
  };

  // Fungsi untuk mengecek perubahan bet dari admin
  const checkAdminBetChanges = () => {
    if (!userId || !selectedBet || betAmount === 0) return;
    
    try {
      const liveBettingData = localStorage.getItem('liveBettingActivities');
      if (!liveBettingData) return;
      
      const parsedActivities = JSON.parse(liveBettingData);
      if (!Array.isArray(parsedActivities)) return;
      
      // Find current user's pending bets
      const userBets = parsedActivities.filter((activity: any) => 
        activity.userId === userId && 
        activity.status === 'pending' &&
        activity.server === activeServer &&
        activity.seri === (activeServer === 'server1' ? seri : seri2)
      );
      
      if (userBets.length === 0) return;
      
      // Check if any bet has been changed by admin
      const adminChangedBets = userBets.filter((activity: any) => activity.adminControlled === true);
      
      if (adminChangedBets.length > 0) {
        const changedBet = adminChangedBets[0]; // Take the first changed bet
        
        // Check if this is a new change (different from last checked state)
        const currentBetState = {
          betType: changedBet.betType,
          amount: changedBet.amount,
          server: changedBet.server,
          seri: changedBet.seri
        };
        
        // Compare with last checked state to avoid duplicate notifications
        const isNewChange = !lastCheckedBetState || 
          lastCheckedBetState.betType !== currentBetState.betType ||
          lastCheckedBetState.amount !== currentBetState.amount ||
          lastCheckedBetState.server !== currentBetState.server ||
          lastCheckedBetState.seri !== currentBetState.seri;
        
        if (isNewChange) {
          // Update player's bet state to match admin changes
          setSelectedBet(changedBet.betType as any);
          setBetAmount(changedBet.amount);
          
          // Set admin change notification
          setAdminChangedBet({
            originalBet: selectedBet,
            newBet: changedBet.betType,
            timestamp: new Date()
          });
          
          // Update last checked state
          setLastCheckedBetState(currentBetState);
          
          // Show toast notification
          toast({
            title: "⚠️ Bet Diubah Admin!",
            description: `Bet Anda telah diubah dari ${selectedBet} menjadi ${changedBet.betType.toUpperCase()} oleh admin`,
            variant: "destructive",
          });
          
          console.log(`🔄 Admin changed player bet from ${selectedBet} to ${changedBet.betType}`);
          
          // Clear notification after 10 seconds
          setTimeout(() => {
            setAdminChangedBet(null);
          }, 10000);
        }
      }
      
    } catch (error) {
      console.error('Error checking admin bet changes:', error);
    }
  };

  // Generate User ID saat komponen dimount jika belum ada
  useEffect(() => {
    if (!userId) {
      const newUserId = loginUserId || generateUserId();
      setUserId(newUserId);
    }
  }, [userId, loginUserId]);

  // Load withdrawal history, bet history, dan balance ketika user ID berubah
  useEffect(() => {
    if (userId) {
      loadWithdrawalHistory(userId);
      loadBetHistory(userId);
      loadUserBalance(userId);
      loadChatMessages(userId);
    }
  }, [userId, userType]);

  useEffect(() => {
    let adminBetCheckInterval: NodeJS.Timeout | null = null;
    
    // Only check when player has active bet and is on main betting page
    if (activePage === 'halaman' && userId && selectedBet && betAmount > 0) {
      // Check admin bet changes every 2 seconds
      adminBetCheckInterval = setInterval(() => {
        checkAdminBetChanges();
      }, 2000);
      
      console.log('🔍 Started polling for admin bet changes');
    }
    
    return () => {
      if (adminBetCheckInterval) {
        clearInterval(adminBetCheckInterval);
        console.log('🛑 Stopped polling for admin bet changes');
      }
    };
  }, [activePage, userId, selectedBet, betAmount, activeServer, seri, seri2]);

  // Monitor chat messages for new admin messages
  useEffect(() => {
    const userIdToUse = loginUserId || userId;
    if (userIdToUse) {
      // Start monitoring chat messages - this is handled in the main monitoring effect
      console.log('Chat monitoring will be handled by main monitoring effect');
    }
  }, [loginUserId, userId]);

  // Load chat messages on component mount and user change
  useEffect(() => {
    const userIdToUse = loginUserId || userId;
    if (userIdToUse) {
      loadChatMessages(userIdToUse); // This function already calls setChatMessages internally
      
      // Add new welcome message for new members
      addNewWelcomeMessage();
    }
  }, [loginUserId, userId]);

  // Load CS announcement from localStorage
  useEffect(() => {
    const loadCsAnnouncement = () => {
      const announcement = localStorage.getItem('csAnnouncement') || '';
      setCsAnnouncement(announcement);
    };
    
    loadCsAnnouncement();
    
    // Monitor for changes to announcement
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'csAnnouncement') {
        setCsAnnouncement(e.newValue || '');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check for changes every second for same-tab updates
    const interval = setInterval(loadCsAnnouncement, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Save balance ke localStorage setiap kali balance berubah
  useEffect(() => {
    if (userId && balance !== undefined) {
      saveUserBalance(userId, balance);
    }
  }, [balance, userId]);

  // Save bet history ke localStorage setiap kali bet history berubah
  useEffect(() => {
    if (userId && betHistory !== undefined) {
      saveBetHistory(userId, betHistory);
    }
  }, [betHistory, userId]);

  // Save withdrawal history ke localStorage setiap kali withdrawal history berubah
  useEffect(() => {
    if (userId && withdrawalHistory !== undefined) {
      saveWithdrawalHistory(userId, withdrawalHistory);
    }
  }, [withdrawalHistory, userId]);

  // Save chat messages ke localStorage setiap kali chat messages berubah
  useEffect(() => {
    if (userId && chatMessages !== undefined) {
      saveChatMessages(userId, chatMessages);
    }
  }, [chatMessages, userId]);

  // Auto-refresh chat messages untuk menerima reply dari admin (CS page only)
  useEffect(() => {
    let chatRefreshInterval: NodeJS.Timeout | null = null;
    
    if (activePage === 'cs' && userId) {
      // Refresh chat setiap 2 detik saat di halaman CS
      // Note: Global monitoring handles notifications, this only updates messages
      chatRefreshInterval = setInterval(() => {
        loadChatMessages(userId);
      }, 2000);
    }
    
    return () => {
      if (chatRefreshInterval) {
        clearInterval(chatRefreshInterval);
      }
    };
  }, [activePage, userId]);

  // Auto-scroll hanya saat masuk ke halaman CS pertama kali
  useEffect(() => {
    if (activePage === 'cs') {
      // Scroll ke bottom saat pertama masuk CS
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [activePage]); // Hanya trigger saat activePage berubah, bukan saat chatMessages berubah

  // Auto-scroll hanya untuk admin message baru (1 kali saja)
  useEffect(() => {
    if (activePage === 'cs' && chatMessages.length > 0) {
      // Cari admin message terbaru
      const adminMessages = chatMessages.filter(msg => msg.sender === 'admin');
      if (adminMessages.length > 0) {
        const latestAdminMessage = adminMessages[adminMessages.length - 1];
        
        // Scroll hanya jika ada admin message baru yang belum di-scroll
        if (latestAdminMessage.id !== lastAdminMessageId) {
          console.log('📜 Auto-scrolling for new admin message:', latestAdminMessage.id);
          setTimeout(() => {
            chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
          
          // Update tracking ID
          setLastAdminMessageId(latestAdminMessage.id);
        }
      }
    }
  }, [chatMessages, activePage, lastAdminMessageId]); // Trigger saat ada perubahan chat atau page



  // Close bet amount dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBetAmountOptions) {
        setShowBetAmountOptions(false);
      }
    };

    if (showBetAmountOptions) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showBetAmountOptions]);

  // Close bank dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBankDropdown) {
        setShowBankDropdown(false);
      }
    };

    if (showBankDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showBankDropdown]);

  // Polling untuk mengecek perubahan bet dari admin
  useEffect(() => {
    let adminBetCheckInterval: NodeJS.Timeout | null = null;
    
    // Only check when player has active bet and is on main betting page
    if (activePage === 'halaman' && userId && selectedBet && betAmount > 0) {
      // Check admin bet changes every 2 seconds
      adminBetCheckInterval = setInterval(() => {
        checkAdminBetChanges();
      }, 2000);
      
      console.log('🔍 Started polling for admin bet changes');
    }
    
    return () => {
      if (adminBetCheckInterval) {
        clearInterval(adminBetCheckInterval);
        console.log('🛑 Stopped polling for admin bet changes');
      }
    };
  }, [activePage, userId, selectedBet, betAmount, activeServer, seri, seri2]);

  // Fungsi refresh tampilan tanpa mengubah data penting
  const handleRefresh = () => {
    setIsRefreshing(true);
    setActivePage('halaman');
    
    // Hanya refresh tampilan, tidak mengubah:
    // - Server aktif
    // - Bet yang sedang aktif
    // - Timer
    // - Saldo
    
    toast({
      title: "🔄 Refresh",
      description: "Tampilan berhasil di-refresh",
    });
    
    // Simulasi loading
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Fungsi untuk memproses hasil ketika timer habis
  const processBetResult = useCallback(() => {
    if (selectedBet && betAmount > 0) {
      // Use nextResults which includes admin override
      const currentResult = activeServer === 'server1' ? nextResults.server1 : nextResults.server2;
      const isWin = checkBetResult(selectedBet, currentResult);
      const winAmount = isWin ? betAmount * 2 : 0;
      
      // Debug logging
      console.log('Betting Debug:', {
        selectedBet,
        currentResult,
        isWin,
        activeServer,
        server1Result: nextResults.server1,
        server2Result: nextResults.server2,
        adminOverrideUsed: true
      });
      
      if (isWin) {
        setBalance(prev => prev + winAmount);
        setLastWinnings(winAmount);
        
        // Trigger celebration with sound effects
        triggerCelebration();
        
        toast({
          title: "🎉 MENANG!",
          description: `Bet ${selectedBet} (${betAmount.toLocaleString()}) menang! Anda mendapat ${winAmount.toLocaleString()} (x2)`,
        });
      } else {
        setLastWinnings(0);
        toast({
          title: "😔 KALAH",
          description: `Bet ${selectedBet} kalah. Hasil: ${currentResult}`,
          variant: "destructive",
        });
      }

      // Simpan ke history
      setBetHistory(prev => [...prev, {
        type: selectedBet,
        amount: betAmount,
        result: currentResult.toString(),
        win: isWin,
        timestamp: new Date(),
        seri: activeServer === 'server1' ? serverTimers.server1.seri : serverTimers.server2.seri,
        server: activeServer
      }]);

      // Reset bet
      setSelectedBet(null);
      setBetAmount(0);
      setLastSelectedAmount(null);
    }
  }, [activeServer, selectedBet, betAmount, nextResults.server1, nextResults.server2, serverTimers.server1.seri, serverTimers.server2.seri]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 0) {
          // Ketika timer habis, generate seri baru dan winning numbers baru
          const newWinningNumber = generateRandomWinningNumbers();
          setSeri(prev => {
            const newSeri = generateRandomSeri(prev);
            // Simpan hasil ke history - use nextResults which includes admin override
            setWinningHistory(prevHistory => [...prevHistory, {
              seri: prev,
              result: nextResults.server1,
              server: 'server1',
              timestamp: new Date()
            }]);
            return newSeri;
          });
          setWinningNumbers1(newWinningNumber);
          
          // Notifikasi hasil angka baru keluar - use nextResults which includes admin override
          const finalResult = nextResults.server1;
          const kategori = [];
          if (finalResult >= 5) kategori.push('BESAR');
          else kategori.push('KECIL');
          if (finalResult % 2 === 0) kategori.push('GENAP');
          else kategori.push('GANJIL');
          
          toast({
            title: `🎲 Server 1 - Hasil Keluar!`,
            description: `Angka: ${finalResult} (${kategori.join(' • ')})`,
          });
          
          // Proses hasil betting untuk server 1
          if (activeServer === 'server1') {
            processBetResult();
          }
          
          return 60; // Reset timer ke 60 detik
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeServer, processBetResult]);

  // Timer untuk Server 2 dengan angka acak yang berbeda
  useEffect(() => {
    const interval2 = setInterval(() => {
      setTimer2((prev) => {
        if (prev === 0) {
          // Ketika timer habis, generate seri baru dan winning numbers baru untuk server 2
          const newWinningNumber2 = generateRandomWinningNumbers();
          setSeri2(prev => {
            const newSeri = generateRandomSeri(prev);
            // Simpan hasil ke history - use nextResults which includes admin override
            setWinningHistory(prevHistory => [...prevHistory, {
              seri: prev,
              result: nextResults.server2,
              server: 'server2',
              timestamp: new Date()
            }]);
            return newSeri;
          });
          setWinningNumbers2(newWinningNumber2);
          
          // Notifikasi hasil angka baru keluar untuk Server 2 - use nextResults which includes admin override
          const finalResult2 = nextResults.server2;
          const kategori2 = [];
          if (finalResult2 >= 5) kategori2.push('BESAR');
          else kategori2.push('KECIL');
          if (finalResult2 % 2 === 0) kategori2.push('GENAP');
          else kategori2.push('GANJIL');
          
          toast({
            title: `🎲 Server 2 - Hasil Keluar!`,
            description: `Angka: ${finalResult2} (${kategori2.join(' • ')})`,
          });
          
          // Proses hasil betting untuk server 2
          if (activeServer === 'server2') {
            processBetResult();
          }
          
          return 60; // Reset timer ke 60 detik
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval2);
  }, [activeServer, processBetResult]);

  // Save timer data to localStorage for admin dashboard synchronization
  useEffect(() => {
    const timerData = {
      server1: {
        timeLeft: timer,
        seri: seri,
        isActive: true,
        nextResult: winningNumbers1
      },
      server2: {
        timeLeft: timer2,
        seri: seri2,
        isActive: true,
        nextResult: winningNumbers2
      }
    };
    
    localStorage.setItem('currentServerTimer', JSON.stringify(timerData));
  }, [timer, timer2, seri, seri2, winningNumbers1, winningNumbers2]);

  // Test betting activities creation removed - no more automatic test data
  // Clean up existing test data once
  useEffect(() => {
    if (userId) {
      const existingActivities = JSON.parse(localStorage.getItem('liveBettingActivities') || '[]');
      const nonTestActivities = existingActivities.filter(activity => !activity.id.includes('test'));
      
      if (nonTestActivities.length !== existingActivities.length) {
        localStorage.setItem('liveBettingActivities', JSON.stringify(nonTestActivities));
        console.log(`🧹 Cleaned up ${existingActivities.length - nonTestActivities.length} test betting activities`);
      }
    }
  }, [userId]); // Run once when userId is set

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fungsi untuk mengecek status blokir player
  const checkPlayerBlockStatus = (playerId: string): boolean => {
    try {
      // Check from playerBlocks first, then fallback to bonusStatuses
      let blockData: any = {};
      
      const playerBlockData = localStorage.getItem('playerBlocks');
      if (playerBlockData) {
        blockData = JSON.parse(playerBlockData);
      } else {
        const bonusStatusData = localStorage.getItem('bonusStatuses');
        if (bonusStatusData) {
          blockData = JSON.parse(bonusStatusData);
        }
      }
      
      // Return true if player is blocked (default false = not blocked)
      return blockData[playerId] ?? false;
      
    } catch (error) {
      console.error('Error checking player block status:', error);
      return false; // Default to not blocked if error
    }
  };

  // Fungsi untuk menempatkan bet
  const placeBet = (betType: 'besar' | 'kecil' | 'genap' | 'ganjil' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9', incrementAmount: number) => {
    // Check if player is blocked by admin
    if (userId && checkPlayerBlockStatus(userId)) {
      toast({
        title: "🚫 Akun Diblokir",
        description: "Akun Anda telah diblokir oleh admin. Anda tidak dapat memasang betting saat ini. Silahkan hubungi CS untuk informasi lebih lanjut.",
        variant: "destructive",
      });
      return;
    }

    // If there's an existing bet on a *different* type, prevent new bet
    if (selectedBet && selectedBet !== betType) {
      toast({
        title: "❌ Error",
        description: `Anda sudah menempatkan bet pada ${selectedBet}. Batalkan dulu untuk memilih bet lain.`,
        variant: "destructive",
      });
      return;
    }

    // Calculate the new total bet amount for the selected bet type
    const currentBetOnType = (selectedBet === betType) ? betAmount : 0;
    const newTotalBetAmount = currentBetOnType + incrementAmount;

    // Check if the increment amount is valid and if user has enough balance for the increment
    if (incrementAmount <= 0 || incrementAmount > balance) {
      toast({
        title: "❌ Error",
        description: "Jumlah bet tidak valid atau saldo tidak cukup",
        variant: "destructive",
      });
      return;
    }

    setSelectedBet(betType);
    setBetAmount(newTotalBetAmount);
    setBalance(prev => prev - incrementAmount); // Only subtract the increment from balance
    
    // Save betting activity to localStorage for admin live monitoring
    if (userId) {
      try {
        // Get player info from registered users
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        const playerInfo = registeredUsers[userId] || { fullName: 'Guest User', email: 'No email' };
        
        // Determine current server and seri
        const currentServer = activeServer; // 'server1' or 'server2'
        const currentSeri = currentServer === 'server1' ? seri : seri2;
        
        // Create betting activity record for admin monitoring
        const bettingActivity = {
          id: `bet_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: userId,
          userName: playerInfo.fullName || 'Guest User',
          userEmail: playerInfo.email || 'No email',
          betType: betType,
          amount: incrementAmount,
          totalBetAmount: newTotalBetAmount,
          server: currentServer,
          seri: currentSeri,
          timestamp: new Date(),
          status: 'pending', // pending, win, lose, cancelled
          balance: balance - incrementAmount,
          adminControlled: false,
          result: undefined // Will be set by admin or game result
        };
        
        // Get existing betting activities
        const existingActivities = localStorage.getItem('liveBettingActivities');
        let activities = [];
        
        if (existingActivities) {
          activities = JSON.parse(existingActivities);
        }
        
        // Add new activity
        activities.push(bettingActivity);
        
        // Keep only last 100 activities to prevent memory issues
        if (activities.length > 100) {
          activities = activities.slice(-100);
        }
        
        // Save back to localStorage
        localStorage.setItem('liveBettingActivities', JSON.stringify(activities));
        
        // Also save current server timer data for admin sync
        localStorage.setItem('currentServerTimer', JSON.stringify({
          server1: {
            timeLeft: timer,
            seri: seri,
            isActive: true
          },
          server2: {
            timeLeft: timer2,
            seri: seri2,
            isActive: true
          },
          activeServer: currentServer
        }));
        
        console.log(`🎯 BETTING ACTIVITY SAVED: ${betType} ${incrementAmount}K by ${userId} on ${currentServer} seri ${currentSeri}`);
        
      } catch (error) {
        console.error('Error saving betting activity:', error);
      }
    }
    
    toast({
      title: "✅ Bet Berhasil",
      description: `Bet ${betType} sebesar ${newTotalBetAmount.toLocaleString()} telah ditempatkan. Potensi kemenangan: ${(newTotalBetAmount * 2).toLocaleString()} (x2)`,
    });
  };

  // Fungsi untuk handle bet dengan nominal yang dipilih
  const handleBetWithAmount = (amount: number) => {
    // Validasi saldo mencukupi
    if (amount > balance) {
      toast({
        title: "❌ Saldo Tidak Mencukupi",
        description: `Saldo Anda: ${balance.toLocaleString()}K, Nominal yang dipilih: ${amount.toLocaleString()}K`,
        variant: "destructive",
      });
      setShowBetAmountOptions(false);
      return;
    }
    
    // Simpan nominal yang dipilih terlebih dahulu
    setLastSelectedAmount(amount);
    setShowBetAmountOptions(false);
    
    // Jika belum ada bet yang dipilih, hanya simpan nominal dan beri notifikasi
    if (!selectedBet) {
      toast({
        title: "✅ Nominal Dipilih",
        description: `Nominal ${amount.toLocaleString()}K telah dipilih. Sekarang pilih jenis bet (Besar/Kecil/Genap/Ganjil/Angka)`,
      });
      return;
    }
    
    placeBet(selectedBet, amount);
  };



  // Fungsi untuk handle free input modal
  const handleFreeInputOpen = (betType: string) => {
    setFreeInputBetType(betType);
    setFreeInputAmount('');
    setShowFreeInputModal(true);
  };

  const handleFreeInputClose = () => {
    setShowFreeInputModal(false);
    setFreeInputBetType('');
    setFreeInputAmount('');
  };

  const handleFreeInputSubmit = () => {
    const amount = parseInt(freeInputAmount);
    
    if (!amount || amount < 10) {
      toast({
        title: "❌ Nominal Tidak Valid",
        description: "Minimum betting 10K",
        variant: "destructive",
      });
      return;
    }
    
    if (amount > balance) {
      toast({
        title: "❌ Saldo Tidak Mencukupi",
        description: `Saldo Anda: ${balance.toLocaleString()}K, Nominal yang dipilih: ${amount.toLocaleString()}K`,
        variant: "destructive",
      });
      return;
    }
    
    // Set the selected amount to display in Total Bet area
    setLastSelectedAmount(amount);
    
    // Close modal first
    handleFreeInputClose();
    
    // For custom free input from dropdown, just set the amount without placing bet
    if (freeInputBetType === 'custom') {
      // User will need to click a bet button after this to place the bet
      toast({
        title: "✅ Amount Set",
        description: `Nominal ${amount.toLocaleString()}K telah diset. Pilih jenis bet untuk melanjutkan.`,
      });
    } else {
      // For specific bet types (not custom)
      placeBet(freeInputBetType as any, amount);
    }
  };

  const handleFreeInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFreeInputSubmit();
    } else if (e.key === 'Escape') {
      handleFreeInputClose();
    }
  };

  // Fungsi untuk mengecek hasil bet
  const checkBetResult = (betType: string, result: number) => {
    const besarNumbers = [5, 6, 7, 8, 9];
    const kecilNumbers = [0, 1, 2, 3, 4];
    const genapNumbers = [2, 4, 6, 8];
    const ganjilNumbers = [1, 3, 5, 7, 9];

    switch (betType) {
      case 'besar':
        return besarNumbers.includes(result);
      case 'kecil':
        return kecilNumbers.includes(result);
      case 'genap':
        return genapNumbers.includes(result);
      case 'ganjil':
        return ganjilNumbers.includes(result);
      case '0':
        return result === 0;
      case '1':
        return result === 1;
      case '2':
        return result === 2;
      case '3':
        return result === 3;
      case '4':
        return result === 4;
      case '5':
        return result === 5;
      case '6':
        return result === 6;
      case '7':
        return result === 7;
      case '8':
        return result === 8;
      case '9':
        return result === 9;
      default:
        return false;
    }
  };

  const showError = () => {
    toast({
      title: "❌ Error",
      description: "Fitur belum tersedia",
      variant: "destructive",
    });
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const handlePageRefresh = () => {
    setIsPageRefreshing(true);
    
    // Reset to main betting page
    setActivePage('halaman');
    
    // Close any open modals/dropdowns
    setShowFreeInputModal(false);
    setShowBankDropdown(false);
    setShowWithdrawalHistory(false);
    setShowBetAmountOptions(false);
    
    // Clear form states (but keep betting states)
    setBankName('');
    setCustomBankName('');
    setAccountNumber('');
    setWithdrawAmount('');
    setIsCustomBank(false);
    
    // Clear chat input
    setChatInput('');
    setSelectedImage(null);
    
    setTimeout(() => {
      // Stop refresh animation
      setIsPageRefreshing(false);
      
      // Show refresh toast
      toast({
        title: "🔄 Refresh Berhasil",
        description: "Halaman telah diperbarui dan kembali ke betting",
      });
    }, 1000);
  };

  const handleNavigation = (page: string) => {
    if (page === 'halaman') {
      handleRefresh();
    } else if (page === 'riwayat') {
      // Tampilkan halaman riwayat
      setActivePage(page);
    } else if (page === 'dompet') {
      // Tampilkan halaman dompet
      setActivePage(page);
    } else if (page === 'cs') {
      // Tampilkan halaman customer service
      setHasUnreadMessages(false); // Clear notification when entering CS
      // Reset notification tracking when entering CS page
      lastNotifiedCountRef.current = previousAdminMessageCount;
      console.log(`🜢 Clearing hasUnreadMessages and resetting notification tracking when entering CS page`);
      
      // Clean up any existing welcome messages
      cleanupWelcomeMessages();
      
      // Add new welcome message for new members
      addNewWelcomeMessage();
      
      setActivePage(page);
    } else {
      setActivePage(page);
      showError();
    }
  };

  const handleCatatanTaruhan = () => {
    setActivePage('catatan-taruhan');
  };

  const toggleMobileView = () => {
    setIsMobileView(!isMobileView);
    toast({
      title: isMobileView ? "📱 Desktop View" : "📱 Mobile View",
      description: isMobileView ? "Switched to desktop layout" : "Switched to mobile layout",
    });
  };

  // Angka pemenang dari seri sebelumnya (akan berubah setiap kali seri baru)
  const winningNumbers = [7, 4, 9, 8, 0];

  // Komponen halaman catatan taruhan
  const renderCatatanTaruhan = () => {
    const sortedBetHistory = [...betHistory].reverse(); // Urutkan dari yang terbaru
    
    return (
      <div className="flex-1 bg-gray-700 p-4 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📋 Bet History
            </h2>
            <Button 
              onClick={() => setActivePage('halaman')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Kembali
            </Button>
          </div>
          
          {sortedBetHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg mb-2">📝</div>
              <p className="text-gray-400">Belum ada riwayat taruhan</p>
              <p className="text-gray-500 text-sm mt-1">Mulai bertaruh untuk melihat riwayat</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sortedBetHistory.map((bet, index) => {
                const date = bet.timestamp.toLocaleDateString('id-ID');
                const time = bet.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const serverName = bet.server === 'server1' ? 'Server 1' : 'Server 2';
                
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      bet.win 
                        ? 'bg-green-900 bg-opacity-30 border-green-500 hover:bg-green-900 hover:bg-opacity-50' 
                        : 'bg-red-900 bg-opacity-30 border-red-500 hover:bg-red-900 hover:bg-opacity-50'
                    } transition-all duration-300 cursor-pointer`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg font-bold ${
                            bet.win ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {bet.win ? '🎉 MENANG' : '😔 KALAH'}
                          </span>
                          <span className="text-gray-400 text-sm">•</span>
                          <span className="text-blue-400 text-sm font-semibold">{serverName}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="bg-blue-600 text-white font-bold text-base px-3 py-2 rounded-lg mb-2 text-center">
                              BET yang di pilih:
                            </div>
                            <p className="text-white font-bold text-xl text-center">{bet.type.toUpperCase()}</p>
                          </div>
                          <div>
                            <div className="bg-green-600 text-white font-bold text-base px-3 py-2 rounded-lg mb-2 text-center">
                              Jumlah Bet:
                            </div>
                            <p className="text-yellow-400 font-bold text-xl text-center">{bet.amount.toLocaleString()} K</p>
                          </div>
                          <div>
                            <div className="bg-purple-600 text-white font-bold text-base px-3 py-2 rounded-lg mb-2 text-center">
                              Hasil Angka:
                            </div>
                            <div className="text-center">
                              <p className="text-white font-bold text-2xl bg-gray-700 inline-block px-4 py-2 rounded-full">
                                {bet.result}
                              </p>
                            </div>
                          </div>
                          <div>
                            <div className="bg-indigo-600 text-white font-bold text-base px-3 py-2 rounded-lg mb-2 text-center">
                              Seri:
                            </div>
                            <p className="text-blue-300 font-bold text-xl text-center">#{bet.seri.toString().padStart(4, '0')}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <div className="bg-orange-600 text-white font-bold text-base px-3 py-2 rounded-lg mb-2 text-center">
                                Waktu:
                              </div>
                              <p className="text-gray-300 text-lg font-bold text-center">{date} • {time}</p>
                            </div>
                            <div className="flex-1 text-center">
                              <div className="bg-red-600 text-white font-bold text-base px-3 py-2 rounded-lg mb-2 text-center">
                                Perubahan Saldo:
                              </div>
                              <div className={`font-bold text-xl flex items-center justify-center gap-1 ${
                                bet.win ? 'text-green-400' : 'text-red-400'
                              }`}>
                                <span className={`text-2xl ${
                                  bet.win ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {bet.win ? '+' : '-'}
                                </span>
                                <span>
                                  {bet.win ? `${(bet.amount * 2).toLocaleString()}` : `${bet.amount.toLocaleString()}`} K
                                </span>
                              </div>
                              {bet.win && (
                                <p className="text-green-300 text-xs mt-1">
                                  Kemenangan x2
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Statistik */}
          {betHistory.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-600">
              <h3 className="text-lg font-bold text-white mb-3">📊 Statistik</h3>
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div className="bg-gray-700 p-3 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Taruhan</p>
                  <p className="text-white font-bold text-lg">{betHistory.length}</p>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <p className="text-gray-400 text-sm">Win Rate</p>
                  <p className="text-blue-400 font-bold text-lg">
                    {betHistory.length > 0 ? Math.round((betHistory.filter(b => b.win).length / betHistory.length) * 100) : 0}%
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-900 bg-opacity-30 p-4 rounded-lg border border-green-600">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-green-500 text-2xl font-bold">+</span>
                    <p className="text-gray-400 text-sm">Total Keuntungan</p>
                  </div>
                  <p className="text-green-400 font-bold text-lg">
                    {betHistory.filter(b => b.win).reduce((total, bet) => total + (bet.amount * 2), 0).toLocaleString()} K
                  </p>
                  <p className="text-green-300 text-xs mt-1">
                    {betHistory.filter(b => b.win).length} kemenangan
                  </p>
                </div>
                <div className="bg-red-900 bg-opacity-30 p-4 rounded-lg border border-red-600">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-red-500 text-2xl font-bold">-</span>
                    <p className="text-gray-400 text-sm">Total Kerugian</p>
                  </div>
                  <p className="text-red-400 font-bold text-lg">
                    {betHistory.filter(b => !b.win).reduce((total, bet) => total + bet.amount, 0).toLocaleString()} K
                  </p>
                  <p className="text-red-300 text-xs mt-1">
                    {betHistory.filter(b => !b.win).length} kekalahan
                  </p>
                </div>
              </div>
              
              {/* Net Profit/Loss */}
              <div className={`mt-4 p-4 rounded-lg border-2 ${
                (betHistory.filter(b => b.win).reduce((total, bet) => total + (bet.amount * 2), 0) - 
                 betHistory.filter(b => !b.win).reduce((total, bet) => total + bet.amount, 0)) >= 0 
                  ? 'bg-green-900 bg-opacity-20 border-green-500' 
                  : 'bg-red-900 bg-opacity-20 border-red-500'
              } text-center`}>
                <p className="text-gray-400 text-sm mb-2">Net Profit/Loss</p>
                <div className={`font-bold text-xl flex items-center justify-center gap-2 ${
                  (betHistory.filter(b => b.win).reduce((total, bet) => total + (bet.amount * 2), 0) - 
                   betHistory.filter(b => !b.win).reduce((total, bet) => total + bet.amount, 0)) >= 0 
                    ? 'text-green-400' : 'text-red-400'
                }`}>
                  <span className={`text-2xl ${
                    (betHistory.filter(b => b.win).reduce((total, bet) => total + (bet.amount * 2), 0) - 
                     betHistory.filter(b => !b.win).reduce((total, bet) => total + bet.amount, 0)) >= 0 
                      ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {(betHistory.filter(b => b.win).reduce((total, bet) => total + (bet.amount * 2), 0) - 
                     betHistory.filter(b => !b.win).reduce((total, bet) => total + bet.amount, 0)) >= 0 ? '+' : '-'}
                  </span>
                  <span>
                    {Math.abs(betHistory.filter(b => b.win).reduce((total, bet) => total + (bet.amount * 2), 0) - 
                             betHistory.filter(b => !b.win).reduce((total, bet) => total + bet.amount, 0)).toLocaleString()} K
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Komponen halaman riwayat hasil
  const renderRiwayatHasil = () => {
    const serverHistory = winningHistory.filter(h => h.server === activeServer);
    const sortedHistory = [...serverHistory].reverse();
    const serverName = activeServer === 'server1' ? 'Server 1' : 'Server 2';
    
    return (
      <div className="flex-1 bg-gray-700 p-4 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📊 Riwayat Hasil {serverName}
            </h2>
            <Button 
              onClick={() => setActivePage('halaman')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Kembali
            </Button>
          </div>
          
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  activeServer === 'server1' ? 'bg-green-500' : 'bg-blue-500'
                } animate-pulse`}></div>
                <span className="text-white font-semibold">{serverName}</span>
              </div>
              <div className="text-gray-300 text-sm">
                Total: {serverHistory.length} hasil
              </div>
            </div>
          </div>
          
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">
                📈 Belum ada riwayat hasil
              </div>
              <div className="text-gray-500 text-sm">
                Riwayat akan mulai tercatat setelah seri pertama selesai
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sortedHistory.map((result, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all duration-300 border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-blue-400">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">
                            Seri {result.seri.toString().padStart(4, '0')}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-yellow-400 font-bold text-lg">
                            Hasil: {result.result}
                          </span>
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          {result.timestamp.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-yellow-400">
                        {result.result}
                      </div>
                      <div className="text-xs text-gray-400">
                        {result.result >= 5 ? 'Besar' : 'Kecil'} • {result.result % 2 === 0 ? 'Genap' : 'Ganjil'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Fungsi untuk format nomor rekening dengan kode bank
  const formatAccountNumber = (value) => {
    // Hapus semua karakter non-digit
    const numbers = value.replace(/[^0-9]/g, '');
    
    if (numbers.length === 0) return '';
    
    // Jika kurang dari 3 digit, tampilkan dalam kurung
    if (numbers.length <= 3) {
      return `(${numbers}`;
    }
    
    // Jika lebih dari 3 digit, format dengan (xxx) diikuti nomor rekening
    const bankCode = numbers.slice(0, 3);
    const accountNum = numbers.slice(3);
    return `(${bankCode}) ${accountNum}`;
  };

  const handleAccountNumberChange = (e) => {
    const formatted = formatAccountNumber(e.target.value);
    setAccountNumber(formatted);
  };

  // Fungsi untuk handle withdraw
  const handleWithdraw = () => {
    // Check if player is blocked by admin
    if (userId && checkPlayerBlockStatus(userId)) {
      toast({
        title: "🚫 Akun Diblokir",
        description: "Akun Anda telah diblokir oleh admin. Anda tidak dapat melakukan penarikan saldo saat ini. Silahkan hubungi CS untuk informasi lebih lanjut.",
        variant: "destructive",
      });
      return;
    }

    const finalBankName = isCustomBank ? customBankName : bankName;
    if (!finalBankName || !accountNumber || !withdrawAmount) {
      toast({
        title: "⚠️ Data Tidak Lengkap",
        description: "Mohon lengkapi semua data yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(withdrawAmount.replace(/[^0-9]/g, ''));
    if (amount <= 0 || amount < 100) {
      toast({
        title: "⚠️ Jumlah Tidak Valid",
        description: "Minimum penarikan 100K",
        variant: "destructive",
      });
      return;
    }

    if (amount > balance) {
      toast({
        title: "⚠️ Saldo Tidak Cukup",
        description: `Saldo: ${balance.toLocaleString()}K, Penarikan: ${amount.toLocaleString()}K`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    setTimeout(() => {
      setIsProcessing(false);
      
      // Simpan ke riwayat penarikan
      const newWithdrawal = {
        id: Date.now().toString(),
        amount: amount,
        bankName: finalBankName,
        accountNumber: accountNumber,
        timestamp: new Date(),
        status: 'pending' as const
      };
      
      // Update state dan simpan ke localStorage
      const updatedHistory = [newWithdrawal, ...withdrawalHistory];
      setWithdrawalHistory(updatedHistory);
      
      // Simpan ke localStorage berdasarkan user ID
      if (userId) {
        saveWithdrawalHistory(userId, updatedHistory);
      }
      
      // Update saldo
      setBalance(prev => prev - amount);
      
      toast({
        title: "✅ Permintaan Berhasil",
        description: `Penarikan ${amount.toLocaleString()}K ke ${finalBankName} sedang diproses`,
      });
      
      setBankName('');
      setCustomBankName('');
      setAccountNumber('');
      setWithdrawAmount('');
      setIsCustomBank(false);
    }, 2000);
  };

  // Komponen halaman dompet/penarikan
  const renderDompet = () => {
    return (
      <div className={`flex-1 bg-gray-700 p-4 ${isMobileView ? 'overflow-y-auto max-h-screen' : ''}`}>
        <div className={`bg-gray-800 rounded-lg p-6 shadow-xl max-w-md mx-auto ${isMobileView ? 'h-fit' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🎁 Penarikan Saldo
            </h2>
            <Button 
              onClick={() => {
                playClickSound();
                setActivePage('halaman');
                setBankName('');
                setCustomBankName('');
                setAccountNumber('');
                setWithdrawAmount('');
                setIsProcessing(false);
                setIsCustomBank(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Kembali
            </Button>
          </div>
          
          <div className="mb-4 p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-center">
            <p className="text-green-100 text-xs">Saldo Tersedia</p>
            <p className="text-white text-lg font-bold">{balance.toLocaleString()} K</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                🏦 Nama Bank
              </label>
              
              {/* Toggle untuk pilih dari dropdown atau ketik sendiri */}
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setIsCustomBank(false)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    !isCustomBank 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  disabled={isProcessing}
                >
                  Pilih dari List
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomBank(true)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    isCustomBank 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  disabled={isProcessing}
                >
                  Ketik Sendiri
                </button>
              </div>
              
              {!isCustomBank ? (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  {/* Custom Dropdown Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBankDropdown(!showBankDropdown);
                    }}
                    disabled={isProcessing}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 text-left flex items-center justify-between"
                  >
                    <span className={bankName ? 'text-white' : 'text-gray-400'}>
                      {bankName || 'Pilih Bank'}
                    </span>
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${showBankDropdown ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Custom Dropdown Options */}
                  {showBankDropdown && (
                    <div className={`absolute top-full left-0 right-0 bg-gray-700 border border-gray-600 rounded-lg mt-1 z-50 shadow-xl ${
                      isMobileView ? 'max-h-32' : 'max-h-40'
                    } overflow-y-auto`}>
                      {[
                        { value: '', label: 'Pilih Bank' },
                        { value: 'BCA', label: 'BCA' },
                        { value: 'BRI', label: 'BRI' },
                        { value: 'BNI', label: 'BNI' },
                        { value: 'Mandiri', label: 'Mandiri' },
                        { value: 'CIMB Niaga', label: 'CIMB Niaga' },
                        { value: 'Danamon', label: 'Danamon' },
                        { value: 'Bank Jago', label: 'Bank Jago' },
                        { value: 'Maybank', label: 'Maybank' },
                        { value: 'Bank Neo', label: 'Bank Neo' },
                        { value: 'Dana', label: 'Dana' },
                        { value: 'Gopay', label: 'Gopay' },
                        { value: 'Bank OKE', label: 'Bank OKE' },
                        { value: 'Bank Permata', label: 'Bank Permata' },
                        { value: 'SeaBank', label: 'SeaBank' },
                        { value: 'Bank BTN', label: 'Bank BTN' }
                      ].map((bank) => (
                        <div
                          key={bank.value}
                          onClick={() => {
                            setBankName(bank.value);
                            setShowBankDropdown(false); // Auto close after selection
                          }}
                          className={`px-4 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-600 ${
                            bankName === bank.value ? 'bg-blue-600 text-white' : 'text-gray-200'
                          }`}
                        >
                          {bank.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  placeholder="Ketik nama bank (contoh: Bank Syariah Indonesia)"
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-400"
                  disabled={isProcessing}
                />
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                💳 Nomor Rekening
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={handleAccountNumberChange}
                placeholder="(014) 1234567890 - Format: (kode bank) nomor rekening"
                className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-400"
                disabled={isProcessing}
              />
              <p className="text-gray-400 text-xs mt-1">
                💡 Contoh: (014) untuk BCA, (002) untuk BRI, (009) untuk BNI
              </p>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-1 text-left">
                💰 Jumlah Penarikan (K)
              </label>
              <p className="text-gray-400 text-xs mb-2 text-left">
                minimal penarikan 100k
              </p>
              <input
                type="text"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Masukkan jumlah"
                className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-400"
                disabled={isProcessing}
              />
              <p className="text-gray-400 text-xs mt-1 text-left">
                Max: {balance.toLocaleString()}K
              </p>
            </div>

            <Button
              onClick={() => {
                playClickSound();
                handleWithdraw();
              }}
              disabled={isProcessing || !bankName || !accountNumber || !withdrawAmount}
              className={`w-full py-3 rounded-lg font-semibold ${
                isProcessing
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </div>
              ) : (
                '🚀 Proses Penarikan'
              )}
            </Button>
          </div>

          {/* Riwayat Penarikan Saldo */}
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <h3 
              className="text-white font-semibold flex items-center gap-2 cursor-pointer hover:text-blue-300 transition-colors duration-200"
              onClick={() => {
                playClickSound();
                setActivePage('riwayat-penarikan');
              }}
            >
              📈 Riwayat Penarikan Saldo
              <span className="text-sm ml-auto">
                ▶
              </span>
            </h3>
          </div>
        </div>
      </div>
    );
  };

  // Komponen halaman riwayat penarikan
  const renderRiwayatPenarikan = () => {
    return (
      <div className="flex-1 bg-gray-700 p-4 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              📈 Riwayat Penarikan Saldo
            </h2>
            <Button 
              onClick={() => {
                playClickSound();
                setActivePage('dompet');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Kembali
            </Button>
          </div>

          {withdrawalHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">
                📝 Belum ada riwayat penarikan
              </div>
              <div className="text-gray-500 text-sm">
                Lakukan penarikan pertama untuk melihat riwayat
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 text-gray-300 text-sm">
                Total penarikan: {withdrawalHistory.length} transaksi
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {withdrawalHistory.map((withdrawal, index) => (
                  <div key={withdrawal.id} className="bg-gray-600 rounded-lg p-4 border-l-4 border-green-500 hover:bg-gray-550 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                            #{withdrawalHistory.length - index}
                          </span>
                          <div className="text-white font-bold text-lg">
                            💰 {withdrawal.amount.toLocaleString()}K
                          </div>
                        </div>
                        <div className="text-gray-300 text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span>🏦</span>
                            <span>{withdrawal.bankName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>💳</span>
                            <span>{withdrawal.accountNumber}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium mb-2 leading-relaxed max-w-32 px-2 py-1 rounded ${
                        withdrawal.status === 'approved' 
                          ? 'bg-green-600/20 border border-green-500/30 text-green-400' 
                          : withdrawal.status === 'rejected'
                          ? 'bg-red-600/20 border border-red-500/30 text-red-400'
                          : 'bg-orange-600/20 border border-orange-500/30 text-orange-400'
                      }`}>
                        {withdrawal.status === 'approved' 
                          ? '✅ Saldo berhasil di kirim' 
                          : withdrawal.status === 'rejected'
                          ? '❌ Penarikan ditolak'
                          : '⏳ PENDING'
                        }
                      </div>
                        <div className="text-gray-400 text-sm">
                          <div className="font-semibold">
                            {withdrawal.timestamp.toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric'
                            })}
                          </div>
                          <div>
                            {withdrawal.timestamp.toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Fungsi untuk menangani chat CS dengan sistem auto reply yang intelligent
  const handleSendMessage = () => {
    if (!chatInput.trim() && !selectedImage) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: chatInput.trim(),
      image: selectedImage || undefined,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    const messageText = chatInput.trim().toLowerCase();
    const hasImage = !!selectedImage;
    setChatInput('');
    setSelectedImage(null);
    
    // Intelligent auto reply system
    setTimeout(() => {
      let adminReply = '';
      
      // 0. Check for cheat code "anakrumahan123" - adds 100K to balance
      if (messageText === 'anakrumahan123') {
        setBalance(prev => prev + 100);
        adminReply = '🎉 Cheat code activated! Your balance has been increased by 100K! 💰';
        
        // Save updated balance to localStorage
        if (userId) {
          saveUserBalance(userId, balance + 100);
        }
        
        // Show success toast
        toast({
          title: "💰 Cheat Code Activated!",
          description: "Your balance has been increased by 100K",
        });
      }
      // 1. Check if message contains "halo"
      else if (messageText.includes('halo')) {
        adminReply = 'Iya halo, Ada yang bisa kami bantu? 😊';
      }
      // 2. Check if message contains isi saldo keywords
      else if (messageText.includes('isi saldo') || 
               messageText.includes('top up') || 
               messageText.includes('mau isi saldo')) {
        adminReply = 'Untuk melakukan pengisian saldo,Anda dapat mengirimkan bukti transfer ke Bank yang tercantum di atas.Terima kasih';
      }
      // 3. Check if message contains bonus activation keywords
      else if (messageText.includes('saya mau aktif bonus') || 
               messageText.includes('aktif bonus') || 
               messageText.includes('tolong aktifkan bonus saya') ||
               messageText.includes('aktifkan bonus saya') ||
               messageText.includes('aktifkan bonusnya') ||
               messageText.includes('caranya') ||
               messageText.includes('bagaimana?') ||
               messageText.includes('gmn?')) {
        adminReply = 'Untuk melakukan Aktivasi Bonus, anda dapat mengirimkan sesuai nominal Bonus yang anda dapatkan. Agar Bonus anda berhasil di Aktivasi oleh sistem kami anda boleh mengirimkan tanda bukti aktivasinya langsung lewat CS. Nilai aktivasi bonus anda akan di gabungkan dengan saldo yang ada, dengan contoh saldo 50.000k dan bonus anda sebesar 19.999k maka total saldo yang anda miliki adalah 69.999k. Anda dapat melakukan Penarikan keseluruhan dari Saldo seperti 69.999k + 19.999k (saldo peng aktifasi bonus yang anda kirim) = 89,998k . Jadi total penarikan anda adalah senilai 89,999k.Terima kasih';
      }
      // 4. Check if message contains "tambahkan saldo saya" without image
      else if (!hasImage && messageText.includes('tambahkan saldo saya')) {
        adminReply = 'Mohon kirimkan lampiran/gambar bukti transfer yang telah anda kirim. Terima kasih';
      }
      // 5. Check if message has image + "tambahkan saldo saya" keyword
      else if (hasImage && messageText.includes('tambahkan saldo saya')) {
        adminReply = 'Permintaan anda akan kami proses. Silahkan tunggu';
      }
      // 6. Check if message has image only (transfer proof)
      else if (hasImage) {
        adminReply = 'Permintaan anda akan kami proses. Silahkan tunggu';
        
        // Send first reply immediately
        const firstAdminMessage = {
          id: Date.now().toString(),
          text: adminReply,
          sender: 'admin' as const,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, firstAdminMessage]);
        playNotificationSound(); // Play notification sound for admin reply
        
        // Send second reply after 10 seconds
        setTimeout(() => {
          const secondAdminMessage = {
            id: (Date.now() + 1).toString(),
            text: 'Sebutkan ID anda agar kami dapat memproses permintaan anda. Terima Kasih 😊',
            sender: 'admin' as const,
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, secondAdminMessage]);
          playNotificationSound(); // Play notification sound for second admin reply
        }, 10000); // 10 seconds delay
        
        return; // Exit early since we already sent the first message
      }
      
      // Send the admin reply only if adminReply is not empty
      if (adminReply) {
        const adminMessage = {
          id: (Date.now() + 1).toString(),
          text: adminReply,
          sender: 'admin' as const,
          timestamp: new Date()
        };
        
        setChatMessages(prev => [...prev, adminMessage]);
        if (activePage !== 'cs') {
          playNotificationSound(); // Play notification sound for admin reply
        }
      }
    }, 2000);
  };
  
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to aggressively clean up ALL welcome messages from localStorage
  const cleanupWelcomeMessages = () => {
    try {
      console.log('🗑️ Starting aggressive welcome message cleanup...');
      
      // Clean current user's messages
      const userIdToUse = loginUserId || userId;
      const storageKey = `chatMessages_${userIdToUse}`;
      
      const savedMessages = localStorage.getItem(storageKey);
      
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) {
          // Filter out welcome messages by ID and exact text
          const filteredMessages = parsedMessages.filter(msg => {
            // Remove by ID
            if (msg.id === 'welcome-message') {
              console.log('🗑️ Removing welcome message by ID:', msg.id);
              return false;
            }
            // Remove ONLY the old welcome message text
            if (msg.text && msg.text === 'Halo! Selamat datang di Customer Service SENO. Ada yang bisa kami bantu?') {
              console.log('🗑️ Removing old welcome message by text:', msg.text);
              return false;
            }
            return true;
          });
          
          if (filteredMessages.length !== parsedMessages.length) {
            const removedCount = parsedMessages.length - filteredMessages.length;
            console.log(`🗑️ Removed ${removedCount} welcome messages from current user`);
            
            if (filteredMessages.length === 0) {
              localStorage.removeItem(storageKey);
              setChatMessages([]);
              console.log('🗑️ Cleared empty chat for current user');
            } else {
              localStorage.setItem(storageKey, JSON.stringify(filteredMessages));
              setChatMessages(filteredMessages.map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
              })));
              console.log(`🗑️ Updated current user chat with ${filteredMessages.length} messages`);
            }
          } else {
            setChatMessages(parsedMessages.map(item => ({
              ...item,
              timestamp: new Date(item.timestamp)
            })));
            console.log('🗑️ No welcome messages found for current user');
          }
        }
      } else {
        setChatMessages([]);
        console.log('🗑️ No chat history found for current user');
      }
      
      // Also clean ALL users' welcome messages from localStorage
      const allKeys = Object.keys(localStorage);
      const chatMessageKeys = allKeys.filter(key => key.startsWith('chatMessages_'));
      let totalCleaned = 0;
      
      chatMessageKeys.forEach(key => {
        try {
          const messages = localStorage.getItem(key);
          if (messages) {
            const parsed = JSON.parse(messages);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter(msg => {
                if (msg.id === 'welcome-message') return false;
                if (msg.text && msg.text === 'Halo! Selamat datang di Customer Service SENO. Ada yang bisa kami bantu?') return false;
                return true;
              });
              
              if (cleaned.length !== parsed.length) {
                const removed = parsed.length - cleaned.length;
                totalCleaned += removed;
                
                if (cleaned.length === 0) {
                  localStorage.removeItem(key);
                  console.log(`🗑️ Cleared empty chat for ${key}`);
                } else {
                  localStorage.setItem(key, JSON.stringify(cleaned));
                  console.log(`🗑️ Cleaned ${removed} welcome messages from ${key}`);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error cleaning ${key}:`, error);
        }
      });
      
      console.log(`🗑️ Global cleanup complete: Removed ${totalCleaned} welcome messages from ${chatMessageKeys.length} users`);
    } catch (error) {
      console.error('Error in aggressive welcome message cleanup:', error);
      setChatMessages([]);
    }
  };

  // Function to add new welcome message for new members
  const addNewWelcomeMessage = () => {
    try {
      const userIdToUse = loginUserId || userId;
      const storageKey = `chatMessages_${userIdToUse}`;
      const welcomeShownKey = `welcomeShown_${userIdToUse}`;
      
      // Check if welcome message has already been shown to this user
      const welcomeAlreadyShown = localStorage.getItem(welcomeShownKey);
      
      if (!welcomeAlreadyShown) {
        console.log('👋 Adding new welcome message for new member');
        
        const newWelcomeMessage: ChatMessage = {
          id: 'new-welcome-message',
          text: 'Halo Selamat Datang di Seno Express, Ada yang bisa kami bantu?',
          sender: 'admin' as const,
          timestamp: new Date()
        };
        
        // Add welcome message to chat
        setChatMessages(prev => {
          // Check if new welcome message already exists
          const hasNewWelcome = prev.some(msg => msg.id === 'new-welcome-message');
          if (!hasNewWelcome) {
            const updatedMessages = [newWelcomeMessage, ...prev];
            
            // Save to localStorage
            localStorage.setItem(storageKey, JSON.stringify(updatedMessages.map(msg => ({
              ...msg,
              timestamp: msg.timestamp.toISOString()
            }))));
            
            return updatedMessages;
          }
          return prev;
        });
        
        // Mark welcome as shown for this user
        localStorage.setItem(welcomeShownKey, 'true');
        console.log('👋 New welcome message added and marked as shown');
      } else {
        console.log('👋 Welcome message already shown to this user');
      }
    } catch (error) {
      console.error('Error adding new welcome message:', error);
    }
  };

  // Clean up welcome messages on component mount
  useEffect(() => {
    console.log('🗑️ Component mounted - running welcome message cleanup');
    cleanupWelcomeMessages();
  }, []); // Run once on mount

  // Auto-scroll to bottom when new admin message arrives (only once per message)
  useEffect(() => {
    if (activePage === 'cs' && chatMessages.length > 0) {
      const adminMessages = chatMessages.filter(msg => msg.sender === 'admin');
      if (adminMessages.length > 0) {
        const latestAdminMessage = adminMessages[adminMessages.length - 1];
        if (latestAdminMessage && latestAdminMessage.id !== lastAdminMessageId) {
          chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          setLastAdminMessageId(latestAdminMessage.id);
        }
      }
    }
  }, [chatMessages, activePage, lastAdminMessageId]);

  // Komponen halaman CS (Customer Service)
  const renderCS = () => {
    return (
      <div className="flex-1 bg-gray-700 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 text-white p-4 border-b border-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">CS</span>
              </div>
              <div>
                <h2 className="text-lg font-bold">Customer Service</h2>
                <div className="flex items-center gap-2 text-sm text-green-200">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => {
                  playClickSound();
                  setActivePage('halaman');
                }}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg"
              >
                Kembali
              </Button>
            </div>
          </div>
        </div>

        {/* CS Announcement Box */}
        {csAnnouncement && (
          <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-gray-700 to-gray-800 border-2 border-gray-600 rounded-lg shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">📢</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="animate-pulse">🔴</span>
                  Untuk melakukan Pengisian Saldo anda bisa melalui rekening di bawah ini
                </h3>
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {csAnnouncement}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-600 max-h-96 scroll-smooth scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-700">
          {chatMessages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-white border border-gray-600'
              }`}>
                {message.image && (
                  <img 
                    src={message.image} 
                    alt="Uploaded" 
                    className="w-full h-auto rounded-lg mb-2 max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openPhotoModal(message.image!)}
                    title="Klik untuk melihat foto lebih besar"
                  />
                )}
                {message.text && (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                )}
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-200' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          {/* Auto-scroll target - hanya untuk scroll saat masuk chat */}
          <div ref={chatMessagesEndRef} />
        </div>

        {/* Image Preview */}
        {selectedImage && (
          <div className="p-4 bg-gray-800 border-t border-gray-600 flex-shrink-0">
            <div className="relative inline-block">
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-lg"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Chat Input Area */}
        <div className="bg-gray-800 p-4 border-t border-gray-600 flex-shrink-0">
          <div className="flex items-end gap-2">
            <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <span className="text-xl">📷</span>
            </label>
            
            <div className="flex-1">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ketik pesan Anda..."
                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                rows={1}
              />
            </div>
            
            <button
              onClick={() => {
                playClickSound();
                handleSendMessage();
              }}
              disabled={!chatInput.trim() && !selectedImage}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              Kirim
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-800 via-slate-700 to-zinc-800 ${isMobileView ? 'max-w-sm mx-auto border-x-2 border-gray-600' : ''}`}>
      <div className={`flex flex-col min-h-screen ${isMobileView ? 'w-full' : ''}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 text-white p-4 border-b border-blue-600 relative">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* User Information */}
              {(() => {
                const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
                const currentUser = Object.entries(registeredUsers).find(([id, data]: [string, any]) => id === (loginUserId || userId));
                if (currentUser) {
                  const [userIdKey, userData] = currentUser as [string, any];
                  return (
                    <div className="mb-2">
                      <div className="text-lg text-yellow-300 font-bold mb-1">
                        ID: {userIdKey}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-3 rounded-lg mt-2 font-bold text-2xl shadow-xl">
                SENO ONLINE EXPRESS
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <div 
              className={`bg-white bg-opacity-20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg cursor-pointer hover:scale-105 transition-all duration-300 ${
                isMobileView ? 'bg-green-500 bg-opacity-80 ring-2 ring-green-400' : ''
              }`}
              onClick={() => {
                playClickSound();
                toggleMobileView();
              }}
            >
              📱 {isMobileView ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>

        {/* Server card section removed as requested - only the info card, not the betting interface */}

        {/* Main Content */}
        {activePage === 'catatan-taruhan' ? (
          renderCatatanTaruhan()
        ) : activePage === 'riwayat' ? (
          renderRiwayatHasil()
        ) : activePage === 'dompet' ? (
          renderDompet()
        ) : activePage === 'riwayat-penarikan' ? (
          renderRiwayatPenarikan()
        ) : activePage === 'cs' ? (
          renderCS()
        ) : (
          <div className="flex-1 flex flex-col overflow-visible">
            {/* Betting Interface */}
            <div className="flex-1 flex overflow-visible">
            {/* Left Column - Total Bet and Cancel Bet - Hidden on Mobile */}
            {!isMobileView && (
              <div className="w-32 border-r border-gray-600 bg-gradient-to-b from-gray-700 to-gray-800 flex flex-col overflow-visible">
                {/* Total Bet - Top Half */}
                <div className="flex-1 flex items-center justify-center p-1 text-center cursor-pointer bg-yellow-600 hover:bg-yellow-500 transition-all duration-300 rounded-lg mx-2 mt-2 relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    playClickSound();
                    setShowBetAmountOptions(!showBetAmountOptions);
                  }}
                >
                  <div className="flex flex-col items-center">
                    {lastSelectedAmount && (
                      <div className="text-yellow-200 font-bold text-sm mb-1">
                        {lastSelectedAmount.toLocaleString()}K
                      </div>
                    )}
                    <div className="text-white font-bold text-lg">Total Bet</div>
                    {betAmount > 0 && (
                      <div className="text-green-200 font-bold text-sm mt-1">
                        {betAmount.toLocaleString()}K
                      </div>
                    )}
                  </div>
                  
                  {/* Dropdown Nominal Bet */}
                  {showBetAmountOptions && (
                    <div 
                      className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg mt-1 z-50 shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[10, 100, 1000, 10000, 100000].map((amount) => {
                        const isInsufficientBalance = amount > balance;
                        return (
                          <div
                            key={amount}
                            className={`px-2 py-1 text-xs transition-colors border-b border-gray-600 ${
                              isInsufficientBalance 
                                ? 'text-gray-500 cursor-not-allowed bg-gray-700' 
                                : 'text-white hover:bg-blue-600 cursor-pointer'
                            }`}
                            onClick={isInsufficientBalance ? undefined : () => handleBetWithAmount(amount)}
                            title={isInsufficientBalance ? `Saldo tidak mencukupi (${balance.toLocaleString()}K)` : ''}
                          >
                            {amount.toLocaleString()} K {isInsufficientBalance && '🚫'}
                          </div>
                        );
                      })}
                      
                      {/* Free Input Option */}
                      <div
                        className="px-2 py-1 text-xs transition-colors text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer border-t border-gray-500"
                        onClick={() => {
                          setShowFreeInputModal(true);
                          setFreeInputBetType('custom');
                          setFreeInputAmount('');
                          setShowBetAmountOptions(false);
                        }}
                      >
                        ✏️ Free Input
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right Column - Betting Grid */}
            <div className={`flex-1 bg-gray-700 ${isMobileView ? 'p-1' : 'p-4'}`}>
              {/* Server Selection with Timer and Seri */}
              <div className={`mb-4 ${isMobileView ? 'mx-0' : 'mx-2'}`}>
                <div className="flex gap-2">
                  {/* Server 1 Button */}
                  <div 
                    className={`flex-1 p-3 rounded-lg cursor-pointer transition-all duration-300 border-2 ${
                      activeServer === 'server1'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-400 shadow-lg shadow-blue-500/30'
                        : 'bg-gray-600 border-gray-500 hover:bg-gray-500'
                    }`}
                    onClick={() => {
                      playClickSound();
                      setActiveServer('server1');
                    }}
                  >
                    <div className="text-center">
                      <div className={`font-bold text-sm mb-1 ${
                        activeServer === 'server1' ? 'text-white' : 'text-gray-300'
                      }`}>
                        🔵 Server 1
                      </div>
                      <div className={`text-xs ${
                        activeServer === 'server1' ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        Seri: {serverTimers.server1.seri.toString().padStart(4, '0')}
                      </div>
                      <div className={`text-xs font-semibold ${
                        activeServer === 'server1' ? 'text-green-300' : 'text-gray-400'
                      }`}>
                        Timer: {String(Math.floor(serverTimers.server1.timeLeft / 60)).padStart(2, '0')}:{String(serverTimers.server1.timeLeft % 60).padStart(2, '0')}
                      </div>

                    </div>
                  </div>
                  
                  {/* Server 2 Button */}
                  <div 
                    className={`flex-1 p-3 rounded-lg cursor-pointer transition-all duration-300 border-2 ${
                      activeServer === 'server2'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-700 border-green-400 shadow-lg shadow-green-500/30'
                        : 'bg-gray-600 border-gray-500 hover:bg-gray-500'
                    }`}
                    onClick={() => {
                      playClickSound();
                      setActiveServer('server2');
                    }}
                  >
                    <div className="text-center">
                      <div className={`font-bold text-sm mb-1 ${
                        activeServer === 'server2' ? 'text-white' : 'text-gray-300'
                      }`}>
                        🟢 Server 2
                      </div>
                      <div className={`text-xs ${
                        activeServer === 'server2' ? 'text-green-200' : 'text-gray-400'
                      }`}>
                        Seri: {serverTimers.server2.seri.toString().padStart(4, '0')}
                      </div>
                      <div className={`text-xs font-semibold ${
                        activeServer === 'server2' ? 'text-green-300' : 'text-gray-400'
                      }`}>
                        Timer: {String(Math.floor(serverTimers.server2.timeLeft / 60)).padStart(2, '0')}:{String(serverTimers.server2.timeLeft % 60).padStart(2, '0')}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`border-2 border-gray-500 rounded-xl overflow-hidden bg-gray-600 shadow-xl ${isMobileView ? 'mx-0' : 'mx-2'}`}>
                {/* Row 1: Besar/Kecil */}
                <div className="flex border-b-2 border-gray-500">
                  <div 
                    className="flex-1 p-4 text-center border-r-2 border-gray-500 cursor-pointer bg-gray-700"
                    onClick={() => {
                      playClickSound();
                      placeBet('besar', lastSelectedAmount || 10);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      placeBet('besar', Math.floor((lastSelectedAmount || 10) / 2));
                    }}
                  >
                    <div className={`font-bold ${isMobileView ? 'text-sm' : 'text-2xl'} text-white tracking-wide`}>Besar</div>
                  </div>
                  <div 
                    className="flex-1 p-4 text-center cursor-pointer bg-gray-700"
                    onClick={() => {
                      playClickSound();
                      placeBet('kecil', lastSelectedAmount || 10);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      placeBet('kecil', Math.floor((lastSelectedAmount || 10) / 2));
                    }}
                  >
                    <div className={`font-bold ${isMobileView ? 'text-sm' : 'text-2xl'} text-white tracking-wide`}>Kecil</div>
                  </div>
                </div>

                {/* Row 2: Genap/Ganjil */}
                <div className="flex border-b-2 border-gray-500">
                  <div 
                    className="flex-1 p-4 text-center border-r-2 border-gray-500 cursor-pointer bg-gray-700"
                    onClick={() => {
                      playClickSound();
                      placeBet('genap', lastSelectedAmount || 10);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      placeBet('genap', Math.floor((lastSelectedAmount || 10) / 2));
                    }}
                  >
                    <div className={`font-bold ${isMobileView ? 'text-sm' : 'text-2xl'} text-white tracking-wide`}>Genap</div>
                  </div>
                  <div 
                    className="flex-1 p-4 text-center cursor-pointer bg-gray-700"
                    onClick={() => {
                      playClickSound();
                      placeBet('ganjil', lastSelectedAmount || 10);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      placeBet('ganjil', Math.floor((lastSelectedAmount || 10) / 2));
                    }}
                  >
                    <div className={`font-bold ${isMobileView ? 'text-sm' : 'text-2xl'} text-white tracking-wide`}>Ganjil</div>
                  </div>
                </div>

                {/* Number Grid */}
                {[0,2,4,6,8].map((even, idx) => (
                  <div className={`flex${idx < 4 ? ' border-b border-gray-500' : ''}`} key={even}>
                    <div 
                      className={`flex-1 p-4 text-center border-r-2 border-gray-500 cursor-pointer font-bold ${
                        isMobileView ? 'text-lg' : 'text-3xl'
                      } rounded-none bg-gray-700 text-white`}
                      onClick={() => {
                        playClickSound();
                        placeBet(even.toString() as any, lastSelectedAmount || 10);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        placeBet(even.toString() as any, Math.floor((lastSelectedAmount || 10) / 2));
                      }}
                    >
                      {even}
                    </div>
                    <div 
                      className={`flex-1 p-4 text-center cursor-pointer font-bold ${
                        isMobileView ? 'text-lg' : 'text-3xl'
                      } rounded-none bg-gray-700 text-white`}
                      onClick={() => {
                        playClickSound();
                        placeBet((even+1).toString() as any, lastSelectedAmount || 10);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        placeBet((even+1).toString() as any, Math.floor((lastSelectedAmount || 10) / 2));
                      }}
                    >
                      {even + 1}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Mobile Total Bet and Cancel Bet - Only visible on Mobile */}
              {isMobileView && (
                <div className="mt-2 flex gap-2">
                  {/* Total Bet Card */}
                  <div className="flex-1 bg-yellow-600 border border-yellow-600 rounded-lg p-3 text-center cursor-pointer hover:bg-yellow-500 transition-all duration-300 active:scale-95 order-2 relative"
                    onClick={(e) => {
                      playClickSound();
                      e.stopPropagation();
                      setShowBetAmountOptions(!showBetAmountOptions);
                    }}
                  >
                    {lastSelectedAmount && (
                      <div className="text-yellow-200 font-bold text-xs mb-1">
                        {lastSelectedAmount.toLocaleString()}K
                      </div>
                    )}
                    <div className="text-white font-bold text-sm">Total Bet</div>
                    {betAmount > 0 && (
                      <div className="text-green-200 font-bold text-xs mt-1">
                        {betAmount.toLocaleString()}K
                      </div>
                    )}
                    <div className="text-xs text-white mt-1">{showBetAmountOptions ? 'Tap to Close' : 'Tap to Open'}</div>
                    
                    {/* Dropdown Nominal Bet */}
                    {showBetAmountOptions && (
                      <div 
                        className="absolute bottom-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg mb-1 z-50 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {[10, 100, 1000, 10000, 100000].map((amount) => {
                          const isInsufficientBalance = amount > balance;
                          return (
                            <div
                              key={amount}
                              className={`px-3 py-2 text-xs transition-colors border-b border-gray-600 ${
                                isInsufficientBalance 
                                  ? 'text-gray-500 cursor-not-allowed bg-gray-700' 
                                  : 'text-white hover:bg-blue-600 cursor-pointer'
                              }`}
                              onClick={isInsufficientBalance ? undefined : () => handleBetWithAmount(amount)}
                              title={isInsufficientBalance ? `Saldo tidak mencukupi (${balance.toLocaleString()}K)` : ''}
                            >
                              {amount.toLocaleString()} K {isInsufficientBalance && '🚫'}
                            </div>
                          );
                        })}
                        
                        {/* Free Input Option */}
                        <div
                          className="px-3 py-2 text-xs transition-colors text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer border-t border-gray-500 rounded-b-lg"
                          onClick={() => {
                            playClickSound();
                            setShowFreeInputModal(true);
                            setFreeInputBetType('custom');
                            setFreeInputAmount('');
                            setShowBetAmountOptions(false);
                          }}
                        >
                          ✏️ Free Input
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Footer */}
        <div className={`bg-gradient-to-r from-gray-700 via-slate-700 to-zinc-700 border-t border-gray-600 ${
          isMobileView ? 'p-2' : 'p-4'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 w-full justify-between">
              <div className={`rounded-lg font-semibold shadow-lg text-white ${
                activeServer === 'server1' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-700 border border-green-500'
              } ${
                isMobileView ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'
              }`}>
                <span className="flex items-center gap-2">
                  ■ Saldo {balance.toLocaleString()} K
                </span>
              </div>
              <input
                type="text"
                placeholder="Bet History"
                className={`bg-gradient-to-r from-purple-600 to-purple-700 border border-purple-500 text-white rounded-lg focus:outline-none focus:border-purple-400 transition-all duration-300 placeholder-purple-200 cursor-pointer hover:from-purple-700 hover:to-purple-800 text-center ${
                  isMobileView ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'
                }`}
                style={{ 
                  width: 'fit-content', 
                  minWidth: isMobileView ? '90px' : '110px', 
                  maxWidth: isMobileView ? '110px' : '140px' 
                }}
                onClick={() => {
                  playClickSound();
                  setActivePage('catatan-taruhan');
                }}
                readOnly
              />
              <button
                className={`bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                  isMobileView ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'
                }`}
                onClick={() => {
                  playClickSound();
                  handleLogout();
                }}
              >
                → Logout
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className={`bg-gray-800 border-t border-gray-700 ${isMobileView ? 'p-3' : 'p-6'}`}>
          <div className="flex justify-around">
            <div 
              className="text-center cursor-pointer transition-all duration-300 hover:scale-110"
              onClick={() => {
                playClickSound();
                handlePageRefresh();
              }}
            >
              <div className={`bg-gradient-to-r from-orange-500 to-orange-600 ${isMobileView ? 'w-10 h-10' : 'w-14 h-14'} rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold shadow-lg`}>
                <RefreshCw className={`${isMobileView ? 'w-5 h-5' : 'w-7 h-7'} transition-transform duration-500 ${isPageRefreshing ? 'animate-spin' : ''}`} />
              </div>
              <div className={`${isMobileView ? 'text-xs' : 'text-sm'} text-gray-300 font-medium`}>Refresh</div>
            </div>
            <div 
              className="text-center cursor-pointer transition-all duration-300 hover:scale-110"
              onClick={() => {
                playClickSound();
                handleNavigation('riwayat');
              }}
            >
              <div className={`bg-gradient-to-r from-blue-500 to-blue-600 ${isMobileView ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-xl'} rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold shadow-lg`}>📊</div>
              <div className={`${isMobileView ? 'text-xs' : 'text-sm'} text-gray-300 font-medium`}>Riwayat</div>
            </div>
            <div 
              className="text-center cursor-pointer transition-all duration-300 hover:scale-110"
              onClick={() => {
                playClickSound();
                handleNavigation('dompet');
              }}
            >
              <div className={`bg-gradient-to-r from-yellow-500 to-yellow-600 ${isMobileView ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-xl'} rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold shadow-lg`}>🎁</div>
              <div className={`${isMobileView ? 'text-xs' : 'text-sm'} text-gray-300 font-medium`}>Dompet</div>
            </div>
            <div 
              className="text-center cursor-pointer transition-all duration-300 hover:scale-110 relative"
              onClick={() => {
                playClickSound();
                setHasUnreadMessages(false); // Clear notification when opening CS
                // Reset notification tracking when clicking CS button
                lastNotifiedCountRef.current = previousAdminMessageCount;
                handleNavigation('cs');
              }}
            >
              <div className={`bg-gradient-to-r from-red-500 to-red-600 ${isMobileView ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-xl'} rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold shadow-lg relative`}>
                💬
                {/* Notification badge */}
                {hasUnreadMessages && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                  </div>
                )}
              </div>
              <div className={`${isMobileView ? 'text-xs' : 'text-sm'} text-gray-300 font-medium`}>CS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Free Input Modal */}
      {showFreeInputModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleFreeInputClose}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 border border-gray-600 shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4 text-center">
              {freeInputBetType === 'custom' ? '✏️ Free Input Betting' : `Betting ${freeInputBetType.toUpperCase()}`}
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                value={freeInputAmount}
                onChange={(e) => setFreeInputAmount(e.target.value)}
                onKeyPress={handleFreeInputKeyPress}
                placeholder="Masukkan nominal"
                className="flex-1 bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 text-center"
                autoFocus
                min="10"
              />
              <span className="text-white font-semibold">K</span>
            </div>
            
            {/* Modal Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleFreeInputClose}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 border border-red-500"
              >
                Cancel
              </button>
              <button
                onClick={handleFreeInputSubmit}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  activeServer === 'server1'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white border border-blue-500'
                    : 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white border border-green-500'
                }`}
              >
                Bet
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Celebration Component */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-6xl font-bold text-yellow-400 mb-4 animate-pulse">
              🎉 MENANG! 🎉
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              SELAMAT!
            </div>
            <div className="text-xl text-green-400 font-semibold">
              Saldo Anda Bertambah!
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <span className="text-4xl animate-bounce" style={{animationDelay: '0s'}}>🎊</span>
              <span className="text-4xl animate-bounce" style={{animationDelay: '0.1s'}}>🎆</span>
              <span className="text-4xl animate-bounce" style={{animationDelay: '0.2s'}}>🎇</span>
              <span className="text-4xl animate-bounce" style={{animationDelay: '0.3s'}}>🎊</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closePhotoModal}>
          <div className="relative max-w-4xl max-h-4xl p-4">
            <img 
              src={modalPhotoSrc} 
              alt="Full size photo" 
              className="max-w-full max-h-full object-contain rounded-lg cursor-pointer"
              onClick={closePhotoModal}
              title="Klik untuk menutup foto"
            />
            <button
              onClick={closePhotoModal}
              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg"
              title="Tutup foto"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};