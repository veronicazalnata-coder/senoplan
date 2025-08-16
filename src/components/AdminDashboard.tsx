import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatMessage {
  id: string;
  text: string;
  image?: string; // Base64 image data for photos
  sender: 'user' | 'admin';
  timestamp: Date;
  userId?: string;
}

interface PlayerChatData {
  userId: string;
  messages: ChatMessage[];
  lastActivity: Date;
  unreadCount: number;
}

interface BettingActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  betType: string;
  amount: number;
  totalBetAmount: number;
  server: string;
  seri: number;
  timestamp: Date;
  status: string; // 'pending', 'win', 'lose', 'cancelled'
  balance: number;
  adminControlled?: boolean; // Track if admin manually set result
  result?: number; // Winning number (0-9)
  betCount?: number; // Number of aggregated bets
}

interface ServerTimer {
  server1: {
    timeLeft: number;
    seri: number;
    isActive: boolean;
  };
  server2: {
    timeLeft: number;
    seri: number;
    isActive: boolean;
  };
}

const AdminDashboard: React.FC = () => {
  const [playerChats, setPlayerChats] = useState<PlayerChatData[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [lastUserMessageId, setLastUserMessageId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'betting' | 'players' | 'withdrawals'>(() => {
    // Load last active tab from localStorage, default to 'chats' if not found
    const savedTab = localStorage.getItem('adminActiveTab');
    return (savedTab as 'chats' | 'betting' | 'players' | 'withdrawals') || 'chats';
  });
  const [bettingActivities, setBettingActivities] = useState<BettingActivity[]>([]);
  const [previousBetCount, setPreviousBetCount] = useState<number>(0);
  const [previousMessageCounts, setPreviousMessageCounts] = useState<{[key: string]: number}>({});
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]);
  const [serverTimers, setServerTimers] = useState<ServerTimer>({
    server1: { timeLeft: 0, seri: 0, isActive: false },
    server2: { timeLeft: 0, seri: 0, isActive: false }
  });
  
  // State untuk next results (0-9) - will be loaded from PlayerDashboard localStorage
  const [nextResults, setNextResults] = useState<{
    server1: number;
    server2: number;
  }>({
    server1: 0,
    server2: 0
  });
  
  // Track previous seri to detect changes and clear old bets
  const [previousSeri, setPreviousSeri] = useState<{
    server1: number;
    server2: number;
  }>({ server1: 0, server2: 0 });

  // State for player management
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [showDeletePlayerModal, setShowDeletePlayerModal] = useState(false);
  
  // State for add balance modal
  const [addingBalancePlayerId, setAddingBalancePlayerId] = useState<string | null>(null);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [addBalanceAmount, setAddBalanceAmount] = useState<string>('1000');
  const [currentPlayerBalance, setCurrentPlayerBalance] = useState<number>(0);
  
  // State for delete balance modal
  const [deletingBalancePlayerId, setDeletingBalancePlayerId] = useState<string | null>(null);
  const [showDeleteBalanceModal, setShowDeleteBalanceModal] = useState(false);
  
  // State for activate bonus modal
  const [activatingBonusPlayerId, setActivatingBonusPlayerId] = useState<string | null>(null);
  const [showActivateBonusModal, setShowActivateBonusModal] = useState(false);
  const [selectedBonusAmount, setSelectedBonusAmount] = useState<number>(0);
  const [currentBonusPlayerBalance, setCurrentBonusPlayerBalance] = useState<number>(0);
  
  // State for withdrawal management
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [withdrawalSearchQuery, setWithdrawalSearchQuery] = useState('');
  
  // State for CS Announcement management
  const [csAnnouncement, setCsAnnouncement] = useState<string>('');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showDeleteWithdrawalModal, setShowDeleteWithdrawalModal] = useState(false);
  const [deletingWithdrawalPlayerId, setDeletingWithdrawalPlayerId] = useState<string>('');
  const [showDeleteSingleWithdrawalModal, setShowDeleteSingleWithdrawalModal] = useState(false);
  const [deletingSingleWithdrawal, setDeletingSingleWithdrawal] = useState<{playerId: string, withdrawalId: string, playerName: string}>({playerId: '', withdrawalId: '', playerName: ''});
  
  // State for bonus status toggle
  const [bonusStatuses, setBonusStatuses] = useState<{[key: string]: boolean}>({});
  
  // State untuk admin photo upload
  const [selectedAdminImage, setSelectedAdminImage] = useState<string | null>(null);
  
  // State untuk photo modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [modalPhotoSrc, setModalPhotoSrc] = useState<string>('');
  
  // State untuk search functionality
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>('');

  // State untuk admin override winning numbers
  const [adminOverride, setAdminOverride] = useState<{
    server1: { isOverridden: boolean; overrideNumber: number };
    server2: { isOverridden: boolean; overrideNumber: number };
  }>({
    server1: { isOverridden: false, overrideNumber: 0 },
    server2: { isOverridden: false, overrideNumber: 0 }
  });

  // Refs for intervals
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const futureResultsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to track if admin override is being set to prevent conflicts
  const isSettingOverrideRef = useRef<boolean>(false);
  
  // Ref for auto-scroll to bottom of chat
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Ref untuk audio context dan oscillators untuk menghentikan suara
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  // useEffect untuk polling data
  useEffect(() => {
    loadAllPlayerChats();
    loadLiveBettingActivities();
    loadRegisteredPlayers();
    loadAllWithdrawals();
    loadServerTimers();
    loadCsAnnouncement();
    loadPlayerBlockStatuses(); // Load player block status toggles
    loadAllWithdrawals(); // Load player withdrawals

    // Set up polling interval - skip loadServerTimers if admin override is active
    pollIntervalRef.current = setInterval(() => {
      loadAllPlayerChats();
      loadLiveBettingActivities();
      loadAllWithdrawals(); // Auto-update withdrawals
      
      // Always load server timers for timer updates, but preserve admin override values
      loadServerTimers();
    }, 1000); // Poll every 1 second

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []); // Remove adminOverride dependency to prevent interval restart

  // useEffect untuk mempertahankan admin override - simplified approach
  useEffect(() => {
    if (adminOverride.server1.isOverridden || adminOverride.server2.isOverridden) {
      // Immediately write to localStorage when admin override changes
      try {
        const currentData = localStorage.getItem('currentServerTimer');
        let timerData: any = {};
        
        if (currentData) {
          timerData = JSON.parse(currentData);
        }
        
        // Update server1 override
        if (adminOverride.server1.isOverridden) {
          if (!timerData.server1) timerData.server1 = {};
          timerData.server1.adminOverride = true;
          timerData.server1.nextResult = adminOverride.server1.overrideNumber;
          timerData.server1.adminOverrideTimestamp = Date.now();
          console.log(`🔒 [MAINTAIN] Setting server1 override: ${adminOverride.server1.overrideNumber}`);
        }
        
        // Update server2 override
        if (adminOverride.server2.isOverridden) {
          if (!timerData.server2) timerData.server2 = {};
          timerData.server2.adminOverride = true;
          timerData.server2.nextResult = adminOverride.server2.overrideNumber;
          timerData.server2.adminOverrideTimestamp = Date.now();
          console.log(`🔒 [MAINTAIN] Setting server2 override: ${adminOverride.server2.overrideNumber}`);
        }
        
        localStorage.setItem('currentServerTimer', JSON.stringify(timerData));
      } catch (error) {
        console.error('Error maintaining admin override:', error);
      }
    }
  }, [adminOverride]); // Only run when adminOverride changes

  
  // Stop notification sound yang sedang diputar
  const stopNotificationSound = () => {
    try {
      // Stop semua oscillators yang sedang berjalan
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Oscillator mungkin sudah berhenti
        }
      });
      oscillatorsRef.current = [];
      
      // Close audio context jika ada
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (error) {
      console.log('Error stopping notification sound:', error);
    }
  };
  
  // Notification sound for incoming messages
  const playNotificationSound = () => {
    try {
      // Stop any existing sound first
      stopNotificationSound();
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
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
        
        // Store oscillator reference
        oscillatorsRef.current.push(osc1);
        
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
        
        // Store oscillator reference
        oscillatorsRef.current.push(osc2);
      };
      
      // Create 2 rings with pause between
      createRing(audioContext.currentTime);
      createRing(audioContext.currentTime + 0.8); // Second ring after 0.8s pause
      
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  // Load semua chat dari localStorage
  const loadAllPlayerChats = () => {
    try {
      const allChats: PlayerChatData[] = [];
      const processedUsers = new Set<string>();

      // Scan semua keys di localStorage untuk chat messages
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chatMessages_')) {
          const userId = key.replace('chatMessages_', '');
          
          // Skip jika user sudah diproses atau welcome message
          if (processedUsers.has(userId)) continue;
          processedUsers.add(userId);

          try {
            const messagesData = localStorage.getItem(key);
            if (messagesData) {
              const messages: ChatMessage[] = JSON.parse(messagesData);
              
              // Filter out welcome messages dan ambil yang ada text atau image
              const validMessages = messages.filter(msg => 
                msg.id !== 'welcome-message' && 
                (msg.text && msg.text.trim() !== '' || msg.image)
              );

              if (validMessages.length > 0) {
              // Hitung unread messages berdasarkan read message IDs
            let unreadCount = 0;
            
            // Get read message IDs untuk player ini
            const readMessagesKey = `readMessages_${userId}`;
            const readMessagesData = localStorage.getItem(readMessagesKey);
            const readMessageIds = readMessagesData ? JSON.parse(readMessagesData) : [];
            
            // Hitung pesan user yang belum ada di read list
            unreadCount = validMessages.filter(msg => 
              msg.sender === 'user' && !readMessageIds.includes(msg.id)
            ).length;

              const lastActivity = validMessages.length > 0 
                ? new Date(validMessages[validMessages.length - 1].timestamp)
                : new Date();

              allChats.push({
                userId,
                messages: validMessages,
                lastActivity,
                unreadCount
              });
              }
            }
          } catch (error) {
            console.error(`Error loading chat for user ${userId}:`, error);
          }
        }
      }

      // Sort berdasarkan aktivitas terakhir
      allChats.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      
      // Check for new messages and play notification sound
      const currentMessageCounts: {[key: string]: number} = {};
      let hasNewMessages = false;
      
      allChats.forEach(chat => {
        const userMessageCount = chat.messages.filter(msg => msg.sender === 'user').length;
        currentMessageCounts[chat.userId] = userMessageCount;
        
        // Check if this user has new messages
        const previousCount = previousMessageCounts[chat.userId] || 0;
        if (userMessageCount > previousCount) {
          hasNewMessages = true;
        }
      });
      
      // Play notification sound if there are new messages AND not currently in chats tab
      if (hasNewMessages && Object.keys(previousMessageCounts).length > 0 && activeTab !== 'chats') {
        playNotificationSound();
        setHasNewMessages(true); // Set notification flag for UI
      }
      
      // Clear hasNewMessages flag if we're in chats tab
      if (activeTab === 'chats') {
        setHasNewMessages(false);
      }
      
      // Update previous message counts
      setPreviousMessageCounts(currentMessageCounts);
      
      // Smart state update - only update if there are meaningful changes
      setPlayerChats(prevChats => {
        // If different length, definitely update
        if (prevChats.length !== allChats.length) {
          return allChats;
        }
        
        // Check for meaningful changes in unreadCount or message count
        let hasChanges = false;
        for (let i = 0; i < allChats.length; i++) {
          const newChat = allChats[i];
          const prevChat = prevChats.find(p => p.userId === newChat.userId);
          
          if (!prevChat || 
              prevChat.unreadCount !== newChat.unreadCount || 
              prevChat.messages.length !== newChat.messages.length) {
            hasChanges = true;
            break;
          }
        }
        
        // Only update if there are actual changes
        return hasChanges ? allChats : prevChats;
      });

    } catch (error) {
      console.error('Error loading player chats:', error);
    }
  };

  // Load LIVE betting activities only - real-time current active bets
  const loadLiveBettingActivities = () => {
    try {
      // Load live betting activities from centralized storage
      const liveBettingData = localStorage.getItem('liveBettingActivities');
      
      if (liveBettingData) {
        const parsedActivities = JSON.parse(liveBettingData);
        if (Array.isArray(parsedActivities)) {
          // Map activities and convert timestamp
          const mappedActivities = parsedActivities.map((activity: Record<string, unknown>) => ({
            ...activity,
            timestamp: new Date(activity.timestamp as string)
          } as BettingActivity));
          
          // Get current server seri numbers for filtering
          const currentServer1Seri = serverTimers.server1.seri;
          const currentServer2Seri = serverTimers.server2.seri;
          
          // Load real timer data from PlayerDashboard
          const realTimerData = localStorage.getItem('currentServerTimer');
          let realTimer1 = 0, realTimer2 = 0;
          
          if (realTimerData) {
            const timerInfo = JSON.parse(realTimerData);
            realTimer1 = timerInfo.server1?.timeLeft || 0;
            realTimer2 = timerInfo.server2?.timeLeft || 0;
          }
          
          // Show only pending bets
          const liveBets = mappedActivities.filter((activity: BettingActivity) => {
            return activity.status === 'pending';
          });
          
          console.log(`🔍 Found ${liveBets.length} pending bets - Real timers: S1=${realTimer1}s, S2=${realTimer2}s`);
          
          // AGGREGATE BETTING ACTIVITIES - Combine same player, bet type, server, seri
          const aggregatedBets: { [key: string]: BettingActivity & { betCount: number } } = {};
          
          liveBets.forEach((activity) => {
            // Create aggregation key: userId_betType_server_seri
            const aggregationKey = `${activity.userId}_${activity.betType}_${activity.server}_${activity.seri}`;
            
            if (aggregatedBets[aggregationKey]) {
              // Combine with existing bet
              aggregatedBets[aggregationKey].amount += activity.amount;
              aggregatedBets[aggregationKey].betCount += 1;
              // Use latest timestamp
              if (activity.timestamp > aggregatedBets[aggregationKey].timestamp) {
                aggregatedBets[aggregationKey].timestamp = activity.timestamp;
                aggregatedBets[aggregationKey].id = activity.id; // Use latest ID for actions
              }
            } else {
              // Create new aggregated entry
              aggregatedBets[aggregationKey] = {
                ...activity,
                betCount: 1
              };
            }
          });
          
          // Convert back to array and sort by most recent first
          const finalBets = Object.values(aggregatedBets).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          
          setBettingActivities(finalBets);
          
          // Auto-clear bets when REAL timer ends
          checkAndClearFinishedBets(realTimer1, realTimer2);
          
          // Detect new bets for notification
          if (finalBets.length > previousBetCount && activeTab === 'betting') {
            const newBetsCount = finalBets.length - previousBetCount;
            console.log(`🔥 NEW AGGREGATED BET DETECTED! ${newBetsCount} new aggregated bet(s) - Total: ${finalBets.length}`);
            
            // Update document title to show new bet notification
            document.title = `🔴 NEW BET! (${finalBets.length}) - SENO Admin`;
            
            // Reset title after 3 seconds
            setTimeout(() => {
              document.title = 'SENO Admin Dashboard';
            }, 3000);
          }
          
          setPreviousBetCount(finalBets.length);
          
          if (finalBets.length > 0) {
            console.log(`🔴 AGGREGATED LIVE BETS: ${finalBets.length} unique betting activities`);
          }
        }
      } else {
        setBettingActivities([]);
      }
      
    } catch (error) {
      console.error('Error loading live betting activities:', error);
      setBettingActivities([]);
    }
  };

  // Load registered players data
  const loadRegisteredPlayers = () => {
    try {
      const registeredUsersData = localStorage.getItem('registeredUsers');
      if (registeredUsersData) {
        const usersObject = JSON.parse(registeredUsersData);
        
        // Convert object to array with additional info
        const playersArray = Object.entries(usersObject).map(([userId, userData]: [string, any]) => {
          // Get chat messages count
          const chatMessages = localStorage.getItem(`chatMessages_${userId}`);
          let messageCount = 0;
          let lastMessageTime = null;
          
          if (chatMessages) {
            try {
              const messages = JSON.parse(chatMessages);
              messageCount = messages.filter((msg: any) => msg.id !== 'welcome-message').length;
              if (messages.length > 0) {
                lastMessageTime = messages[messages.length - 1].timestamp;
              }
            } catch (error) {
              console.error(`Error parsing messages for user ${userId}:`, error);
            }
          }
          
          // Get player balance from localStorage using the correct key format
          let playerBalance = 0;
          try {
            const balanceKey = `balance_${userId}`;
            const savedBalance = localStorage.getItem(balanceKey);
            if (savedBalance) {
              playerBalance = parseInt(savedBalance) || 0;
            } else {
              // If no balance found, check betting activities as fallback
              const liveBettingData = localStorage.getItem('liveBettingActivities');
              if (liveBettingData) {
                const bettingActivities = JSON.parse(liveBettingData);
                const userBets = bettingActivities.filter((bet: any) => bet.userId === userId);
                if (userBets.length > 0) {
                  // Get the most recent balance from user's betting activities
                  const sortedBets = userBets.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  playerBalance = sortedBets[0].balance || 0;
                }
              }
            }
          } catch (error) {
            console.error(`Error getting balance for user ${userId}:`, error);
          }
          
          // Determine if player is online (active in last 5 minutes)
          const isOnline = lastMessageTime ? 
            (new Date().getTime() - new Date(lastMessageTime).getTime()) < 5 * 60 * 1000 : false;
          
          return {
            userId,
            fullName: userData.fullName || 'Unknown',
            password: userData.password || 'N/A',
            balance: playerBalance,
            registeredAt: userData.registeredAt,
            messageCount,
            lastMessageTime,
            isActive: messageCount > 0,
            isOnline
          };
        });
        
        // Sort by registration date (newest first)
        playersArray.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
        
        setRegisteredPlayers(playersArray);
        console.log(`📊 Loaded ${playersArray.length} registered players`);
      } else {
        setRegisteredPlayers([]);
      }
    } catch (error) {
      console.error('Error loading registered players:', error);
      setRegisteredPlayers([]);
    }
  };

  // Filter players based on search query
  const getFilteredPlayers = () => {
    if (!playerSearchQuery.trim()) {
      return registeredPlayers;
    }
    
    const query = playerSearchQuery.toLowerCase().trim();
    return registeredPlayers.filter(player => {
      const playerIdMatch = player.userId.toLowerCase().includes(query);
      const fullNameMatch = (player.fullName || '').toLowerCase().includes(query);
      return playerIdMatch || fullNameMatch;
    });
  };

  // Load CS announcement from localStorage
  const loadCsAnnouncement = () => {
    try {
      const announcement = localStorage.getItem('csAnnouncement') || '';
      setCsAnnouncement(announcement);
    } catch (error) {
      console.error('Error loading CS announcement:', error);
    }
  };

  // Save CS announcement to localStorage
  const saveCsAnnouncement = (announcement: string) => {
    try {
      localStorage.setItem('csAnnouncement', announcement);
      setCsAnnouncement(announcement);
      console.log('📢 CS Announcement updated:', announcement);
    } catch (error) {
      console.error('Error saving CS announcement:', error);
    }
  };

  // Handle announcement update
  const handleAnnouncementUpdate = () => {
    saveCsAnnouncement(csAnnouncement);
    setShowAnnouncementModal(false);
  };

  // Clear announcement
  const handleAnnouncementClear = () => {
    saveCsAnnouncement('');
    setShowAnnouncementModal(false);
  };

  // Load all player withdrawals from localStorage
  const loadAllWithdrawals = () => {
    try {
      const allWithdrawals: any[] = [];
      
      // Scan all localStorage keys for withdrawal history
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('withdrawalHistory_')) {
          const userId = key.replace('withdrawalHistory_', '');
          
          try {
            const withdrawalData = localStorage.getItem(key);
            if (withdrawalData) {
              const parsedWithdrawals = JSON.parse(withdrawalData);
              if (Array.isArray(parsedWithdrawals)) {
                // Add user info to each withdrawal
                const withdrawalsWithUserInfo = parsedWithdrawals.map((withdrawal: any) => {
                  const playerInfo = getPlayerInfo(userId);
                  return {
                    ...withdrawal,
                    userId,
                    userName: playerInfo.name,
                    userEmail: playerInfo.email,
                    timestamp: new Date(withdrawal.timestamp)
                  };
                });
                allWithdrawals.push(...withdrawalsWithUserInfo);
              }
            }
          } catch (error) {
            console.error(`Error parsing withdrawal data for ${userId}:`, error);
          }
        }
      }
      
      // Sort by timestamp (newest first)
      allWithdrawals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setAllWithdrawals(allWithdrawals);
      console.log(`💰 Loaded ${allWithdrawals.length} total withdrawals from all players`);
      
    } catch (error) {
      console.error('Error loading all withdrawals:', error);
      setAllWithdrawals([]);
    }
  };

  // Filter withdrawals based on search query
  const getGroupedWithdrawals = () => {
    const grouped: { [key: string]: any } = {};
    
    allWithdrawals.forEach(withdrawal => {
      if (!grouped[withdrawal.userId]) {
        grouped[withdrawal.userId] = {
          userId: withdrawal.userId,
          userName: withdrawal.userName,
          userEmail: withdrawal.userEmail,
          withdrawals: [],
          totalAmount: 0,
          totalCount: 0
        };
      }
      grouped[withdrawal.userId].withdrawals.push(withdrawal);
      grouped[withdrawal.userId].totalAmount += withdrawal.amount;
      grouped[withdrawal.userId].totalCount += 1;
    });
    
    return Object.values(grouped);
  };

  const getFilteredWithdrawalPlayers = () => {
    const groupedData = getGroupedWithdrawals();
    if (!withdrawalSearchQuery.trim()) return groupedData;
    const query = withdrawalSearchQuery.toLowerCase().trim();
    return groupedData.filter(player => {
      const userIdMatch = player.userId.toLowerCase().includes(query);
      const userNameMatch = (player.userName || '').toLowerCase().includes(query);
      const userEmailMatch = (player.userEmail || '').toLowerCase().includes(query);
      return userIdMatch || userNameMatch || userEmailMatch;
    });
  };

  // Delete withdrawal history for a specific player
  const handleDeleteWithdrawalHistory = (playerId: string) => {
    setDeletingWithdrawalPlayerId(playerId);
    setShowDeleteWithdrawalModal(true);
  };

  const confirmDeleteWithdrawalHistory = () => {
    try {
      // Remove withdrawal history from localStorage
      localStorage.removeItem(`withdrawalHistory_${deletingWithdrawalPlayerId}`);
      
      // Reload withdrawal data to reflect changes
      loadAllWithdrawals();
      
      // Close modal and reset state
      setShowDeleteWithdrawalModal(false);
      setDeletingWithdrawalPlayerId('');
      setExpandedPlayerId(null);
      
      console.log(`🗑️ Deleted withdrawal history for player: ${deletingWithdrawalPlayerId}`);
    } catch (error) {
      console.error('Error deleting withdrawal history:', error);
    }
  };

  // Delete single withdrawal record
  const handleDeleteSingleWithdrawal = (playerId: string, withdrawalId: string, playerName: string) => {
    setDeletingSingleWithdrawal({playerId, withdrawalId, playerName});
    setShowDeleteSingleWithdrawalModal(true);
  };

  const confirmDeleteSingleWithdrawal = () => {
    try {
      const {playerId, withdrawalId} = deletingSingleWithdrawal;
      
      // Get current withdrawal history
      const withdrawalData = localStorage.getItem(`withdrawalHistory_${playerId}`);
      if (withdrawalData) {
        const withdrawals = JSON.parse(withdrawalData);
        
        // Filter out the specific withdrawal
        const updatedWithdrawals = withdrawals.filter((w: any) => w.id !== withdrawalId);
        
        // Update localStorage
        if (updatedWithdrawals.length > 0) {
          localStorage.setItem(`withdrawalHistory_${playerId}`, JSON.stringify(updatedWithdrawals));
        } else {
          // If no withdrawals left, remove the key entirely
          localStorage.removeItem(`withdrawalHistory_${playerId}`);
        }
        
        // Reload withdrawal data to reflect changes
        loadAllWithdrawals();
        
        console.log(`🗑️ Deleted single withdrawal ${withdrawalId} for player: ${playerId}`);
      }
      
      // Close modal and reset state
      setShowDeleteSingleWithdrawalModal(false);
      setDeletingSingleWithdrawal({playerId: '', withdrawalId: '', playerName: ''});
      
    } catch (error) {
      console.error('Error deleting single withdrawal:', error);
    }
  };

  // Handle withdrawal status change (pending -> approved -> pending)
  const handleWithdrawalStatusChange = (playerId: string, withdrawalId: string) => {
    try {
      // Get current withdrawal history
      const withdrawalData = localStorage.getItem(`withdrawalHistory_${playerId}`);
      if (withdrawalData) {
        const withdrawals = JSON.parse(withdrawalData);
        
        // Find and update the specific withdrawal
        let statusChangedToApproved = false;
        const updatedWithdrawals = withdrawals.map((w: any) => {
          if (w.id === withdrawalId) {
            // Toggle between pending and approved
            const newStatus = w.status === 'pending' ? 'approved' : 'pending';
            console.log(`💫 Admin changed withdrawal ${withdrawalId} status: ${w.status} → ${newStatus}`);
            
            // Check if status changed to approved
            if (w.status === 'pending' && newStatus === 'approved') {
              statusChangedToApproved = true;
            }
            
            return { ...w, status: newStatus };
          }
          return w;
        });
        
        // Update localStorage
        localStorage.setItem(`withdrawalHistory_${playerId}`, JSON.stringify(updatedWithdrawals));
        
        // Send automatic CS notification if status changed to approved
        if (statusChangedToApproved) {
          sendWithdrawalApprovalCSMessage(playerId);
        }
        
        // Set trigger for player auto-refresh
        const refreshTrigger = {
          playerId: playerId,
          timestamp: Date.now(),
          action: 'withdrawal_status_change'
        };
        localStorage.setItem('playerRefreshTrigger', JSON.stringify(refreshTrigger));
        console.log(`🔄 Set auto-refresh trigger for player ${playerId}`);
        
        // Reload withdrawal data to reflect changes
        loadAllWithdrawals();
        
        console.log(`✅ Updated withdrawal status for player ${playerId}, withdrawal ${withdrawalId}`);
      }
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
    }
  };

  // Function to send automatic CS message for withdrawal approval
  const sendWithdrawalApprovalCSMessage = (playerId: string) => {
    try {
      const message = {
        id: `cs_withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: `Saldo penarikan anda telah berhasil kami kirim.Terima kasih`,
        sender: 'admin' as const,
        timestamp: new Date(),
        userId: playerId
      };

      // Get existing messages for this player
      const existingMessagesKey = `chatMessages_${playerId}`;
      let messages: any[] = [];
      
      const existingMessages = localStorage.getItem(existingMessagesKey);
      
      if (existingMessages) {
        try {
          messages = JSON.parse(existingMessages);
          if (!Array.isArray(messages)) {
            messages = [];
          }
        } catch (e) {
          messages = [];
        }
      }
      
      // Add the new CS message
      messages.push(message);
      
      // Save back to localStorage
      localStorage.setItem(existingMessagesKey, JSON.stringify(messages));
      
      console.log(`💬 Withdrawal approval CS message sent to ${playerId}: Saldo penarikan berhasil dikirim`);
      
    } catch (error) {
      console.error('Error sending withdrawal approval CS message:', error);
    }
  };

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tab: 'chats' | 'betting' | 'players' | 'withdrawals') => {
    setActiveTab(tab);
    localStorage.setItem('adminActiveTab', tab);
    console.log(`📋 Admin switched to ${tab} tab - saved to localStorage`);
  };

  // Load server timers dari localStorage (sync dengan player dashboard)
  const loadServerTimers = () => {
    try {
      // Load timer data dari localStorage yang disinkronkan dengan player dashboard
      const currentServerTimerData = localStorage.getItem('currentServerTimer');
      
      const newTimers: ServerTimer = {
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
            
            // Update next result from localStorage only if no admin override is active
            if (parsed.server1.nextResult !== undefined && !adminOverride.server1.isOverridden) {
              setNextResults(prev => {
                if (prev.server1 !== parsed.server1.nextResult) {
                  console.log(`🔄 [LOAD] Updating server1 nextResult: ${prev.server1} → ${parsed.server1.nextResult}`);
                  return { ...prev, server1: parsed.server1.nextResult };
                }
                return prev;
              });
            } else if (adminOverride.server1.isOverridden) {
              console.log(`🔒 [LOAD] Preserving server1 admin override: ${adminOverride.server1.overrideNumber}`);
            }
            
            // Check for admin override flag and update state
            if (parsed.server1.adminOverride) {
              const overrideTimestamp = parsed.server1.adminOverrideTimestamp || 0;
              const currentTime = Date.now();
              const timeDiff = currentTime - overrideTimestamp;
              
              // Admin override berlaku sampai timer habis atau di-reset manual
              // Tidak ada expiry berdasarkan waktu, hanya berdasarkan timer atau manual reset
              console.log(`🔒 [POLLING] PRESERVING admin override for server1: ${parsed.server1.nextResult} (age: ${Math.floor(timeDiff/1000)}s)`);
              setAdminOverride(prev => ({
                ...prev,
                server1: { isOverridden: true, overrideNumber: parsed.server1.nextResult || 0 }
              }));
              
              // Force nextResults to match admin override only if different
              setNextResults(prev => {
                if (prev.server1 !== parsed.server1.nextResult) {
                  console.log(`🔄 [SYNC] Updating server1 nextResult: ${prev.server1} → ${parsed.server1.nextResult}`);
                  return { ...prev, server1: parsed.server1.nextResult };
                }
                return prev;
              });
            } else {
              // Only reset if not currently overridden in local state
              setAdminOverride(prev => {
                if (!prev.server1.isOverridden) {
                  return {
                    ...prev,
                    server1: { isOverridden: false, overrideNumber: 0 }
                  };
                }
                // Keep current override state if it exists locally
                return prev;
              });
            }
          }
          
          if (parsed.server2) {
            newTimers.server2 = {
              timeLeft: parsed.server2.timeLeft || 0,
              seri: parsed.server2.seri || 0,
              isActive: parsed.server2.isActive || false
            };
            
            // Update next result from localStorage only if no admin override is active
            if (parsed.server2.nextResult !== undefined && !adminOverride.server2.isOverridden) {
              setNextResults(prev => {
                if (prev.server2 !== parsed.server2.nextResult) {
                  console.log(`🔄 [LOAD] Updating server2 nextResult: ${prev.server2} → ${parsed.server2.nextResult}`);
                  return { ...prev, server2: parsed.server2.nextResult };
                }
                return prev;
              });
            } else if (adminOverride.server2.isOverridden) {
              console.log(`🔒 [LOAD] Preserving server2 admin override: ${adminOverride.server2.overrideNumber}`);
            }
            
            // Check for admin override flag and update state
            if (parsed.server2.adminOverride) {
              const overrideTimestamp = parsed.server2.adminOverrideTimestamp || 0;
              const currentTime = Date.now();
              const timeDiff = currentTime - overrideTimestamp;
              
              // Admin override berlaku sampai timer habis atau di-reset manual
              // Tidak ada expiry berdasarkan waktu, hanya berdasarkan timer atau manual reset
              console.log(`🔒 [POLLING] PRESERVING admin override for server2: ${parsed.server2.nextResult} (age: ${Math.floor(timeDiff/1000)}s)`);
              setAdminOverride(prev => ({
                ...prev,
                server2: { isOverridden: true, overrideNumber: parsed.server2.nextResult || 0 }
              }));
              
              // Force nextResults to match admin override only if different
              setNextResults(prev => {
                if (prev.server2 !== parsed.server2.nextResult) {
                  console.log(`🔄 [SYNC] Updating server2 nextResult: ${prev.server2} → ${parsed.server2.nextResult}`);
                  return { ...prev, server2: parsed.server2.nextResult };
                }
                return prev;
              });
            } else {
              // Only reset if not currently overridden in local state
              setAdminOverride(prev => {
                if (!prev.server2.isOverridden) {
                  return {
                    ...prev,
                    server2: { isOverridden: false, overrideNumber: 0 }
                  };
                }
                // Keep current override state if it exists locally
                return prev;
              });
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
  

  
  // Auto-clear old betting activities when seri changes - SIMPLIFIED
  const checkAndClearOldBets = (currentServer1Seri: number, currentServer2Seri: number) => {
    try {
      // Update previous seri for tracking (but don't auto-clear for now)
      if (currentServer1Seri !== previousSeri.server1 || currentServer2Seri !== previousSeri.server2) {
        const isInitialLoad = previousSeri.server1 === 0 && previousSeri.server2 === 0;
        
        if (!isInitialLoad) {
          console.log(`🔄 SERI CHANGED - Server1: ${previousSeri.server1} → ${currentServer1Seri}, Server2: ${previousSeri.server2} → ${currentServer2Seri}`);
          // Note: Auto-clear disabled to prevent aggressive clearing
        }
        
        setPreviousSeri({
          server1: currentServer1Seri,
          server2: currentServer2Seri
        });
      }
      
    } catch (error) {
      console.error('Error in seri tracking:', error);
    }
  };
  
  // Change bet type for aggregated betting activities
  const changeBetType = (activityId: string, newBetType: string) => {
    try {
      // Load current betting activities from localStorage
      const liveBettingData = localStorage.getItem('liveBettingActivities');
      if (!liveBettingData) return;
      
      const parsedActivities = JSON.parse(liveBettingData);
      if (!Array.isArray(parsedActivities)) return;
      
      // Find the aggregated activity in current state
      const aggregatedActivity = bettingActivities.find(activity => activity.id === activityId);
      if (!aggregatedActivity) return;
      
      // Update ALL individual betting activities that match the aggregation key
      const aggregationKey = `${aggregatedActivity.userId}_${aggregatedActivity.betType}_${aggregatedActivity.server}_${aggregatedActivity.seri}`;
      
      const updatedActivities = parsedActivities.map((activity: any) => {
        const currentKey = `${activity.userId}_${activity.betType}_${activity.server}_${activity.seri}`;
        
        if (currentKey === aggregationKey && activity.status === 'pending') {
          return {
            ...activity,
            betType: newBetType,
            adminControlled: true
          };
        }
        return activity;
      });
      
      // Save back to localStorage
      localStorage.setItem('liveBettingActivities', JSON.stringify(updatedActivities));
      
      // Reload activities to reflect changes
      loadLiveBettingActivities();
      
      console.log(`🔄 Admin changed bet type from ${aggregatedActivity.betType} to ${newBetType} for: ${aggregationKey}`);
      
    } catch (error) {
      console.error('Error changing bet type:', error);
    }
  };

  // Auto-clear bets when timer reaches 0 (game ends)
  const checkAndClearFinishedBets = (server1TimeLeft: number, server2TimeLeft: number) => {
    const liveBettingData = localStorage.getItem('liveBettingActivities');
    if (!liveBettingData) return;
    
    const parsedActivities = JSON.parse(liveBettingData);
    if (!Array.isArray(parsedActivities)) return;
    
    // Clear bets for servers where timer has ended (timeLeft <= 0)
    const activeBets = parsedActivities.filter((activity: any) => {
      if (activity.status !== 'pending') return true; // Keep non-pending bets
      
      // Remove pending bets for servers where timer has ended
      if (activity.server === 'server1' && server1TimeLeft <= 0) {
        console.log(`🧹 Auto-clearing Server 1 bet: ${activity.id} (timer ended)`);
        return false;
      }
      if (activity.server === 'server2' && server2TimeLeft <= 0) {
        console.log(`🧹 Auto-clearing Server 2 bet: ${activity.id} (timer ended)`);
        return false;
      }
      
      return true; // Keep active bets
    });
    
    // Only update if something was cleared
    if (activeBets.length !== parsedActivities.length) {
      localStorage.setItem('liveBettingActivities', JSON.stringify(activeBets));
      console.log(`🧹 Auto-cleared finished bets. ${parsedActivities.length - activeBets.length} bets removed.`);
    }
  };

  // Clear individual betting activity manually
  const clearBettingActivity = (activityId: string) => {
    try {
      // Load current betting activities from localStorage
      const liveBettingData = localStorage.getItem('liveBettingActivities');
      if (!liveBettingData) return;
      
      const parsedActivities = JSON.parse(liveBettingData);
      if (!Array.isArray(parsedActivities)) return;
      
      // Remove the specific betting activity by ID
      const updatedActivities = parsedActivities.filter((activity: any) => activity.id !== activityId);
      
      // Save back to localStorage
      localStorage.setItem('liveBettingActivities', JSON.stringify(updatedActivities));
      
      // Reload activities to reflect changes
      loadLiveBettingActivities();
      
      console.log(`🗑️ Admin manually cleared betting ID: ${activityId}`);
      
    } catch (error) {
      console.error('Error clearing betting activity:', error);
    }
  };

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<BettingActivity | null>(null);
  const [editBetType, setEditBetType] = useState('');
  const [editAmount, setEditAmount] = useState(0);

  // Open edit modal
  const openEditModal = (activity: BettingActivity) => {
    setEditingActivity(activity);
    setEditBetType(activity.betType);
    setEditAmount(activity.amount);
    setEditModalOpen(true);
  };

  // Save live betting edit
  const saveLiveBettingEdit = () => {
    if (!editingActivity) return;
    
    try {
      // Update local state
      const updatedActivities = bettingActivities.map(activity => {
        if (activity.id === editingActivity.id) {
          return {
            ...activity,
            betType: editBetType as any,
            amount: editAmount,
            adminControlled: true
          };
        }
        return activity;
      });
      setBettingActivities(updatedActivities);
      
      // Update centralized storage
      const allActivities = JSON.parse(localStorage.getItem('liveBettingActivities') || '[]');
      const updatedAllActivities = allActivities.map((activity: BettingActivity) => {
        if (activity.id === editingActivity.id) {
          return {
            ...activity,
            betType: editBetType as any,
            amount: editAmount,
            adminControlled: true
          };
        }
        return activity;
      });
      localStorage.setItem('liveBettingActivities', JSON.stringify(updatedAllActivities));
      
      console.log(`🔄 Admin edited bet: ${editingActivity.id} -> Type: ${editBetType}, Amount: ${editAmount}`);
      
      // Close modal
      setEditModalOpen(false);
      setEditingActivity(null);
    } catch (error) {
      console.error('Error editing bet:', error);
    }
  };



  // Send reply ke player
  const sendReply = () => {
    if (!selectedPlayer || (!replyMessage.trim() && !selectedAdminImage)) return;

    try {
      const newMessage: ChatMessage = {
        id: `admin-${Date.now()}`,
        text: replyMessage.trim(),
        image: selectedAdminImage || undefined,
        sender: 'admin',
        timestamp: new Date(),
        userId: selectedPlayer
      };

      // Update localStorage player
      const storageKey = `chatMessages_${selectedPlayer}`;
      const existingMessages = localStorage.getItem(storageKey);
      let messages: ChatMessage[] = [];
      
      if (existingMessages) {
        messages = JSON.parse(existingMessages);
      }
      
      messages.push(newMessage);
      localStorage.setItem(storageKey, JSON.stringify(messages));

      // Update state lokal
      setPlayerChats(prev => prev.map(chat => {
        if (chat.userId === selectedPlayer) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage],
            lastActivity: new Date(),
            unreadCount: 0 // Reset unread karena admin sudah reply
          };
        }
        return chat;
      }));

      setReplyMessage('');
      setSelectedAdminImage(null);
      // Auto-scroll removed

      const messageType = selectedAdminImage ? 'photo' : 'text';
      console.log(`✅ Admin ${messageType} sent to user ${selectedPlayer}: ${replyMessage.trim() || 'Photo message'}`);
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  // Handle admin image selection
  const handleAdminImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar! Maksimal 5MB.');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar!');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedAdminImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle key press for admin reply
  const handleAdminKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // Delete pesan individual - Improved and more reliable approach
  const deleteIndividualMessage = (messageId: string) => {
    console.log('🔴 DELETE CALLED - Message ID:', messageId, 'Player:', selectedPlayer);
    
    if (!selectedPlayer) {
      console.error('❌ No player selected');
      alert('Error: Tidak ada player yang dipilih');
      return;
    }

    if (!messageId) {
      console.error('❌ No message ID provided');
      alert('Error: ID pesan tidak valid');
      return;
    }

    // Direct deletion without confirmation for admin
    const currentPlayerData = playerChats.find(chat => chat.userId === selectedPlayer);
    const messageToDelete = currentPlayerData?.messages.find(m => m.id === messageId);
    const messageContent = messageToDelete?.text?.substring(0, 50) || (messageToDelete?.image ? '[Photo]' : 'pesan ini');
    console.log(`🗑️ Admin deleting message: "${messageContent}"`);
    
    // No confirmation needed for admin - direct delete

    try {
      console.log('🔄 Starting delete process...');
      
      // Step 1: Update localStorage
      const storageKey = `chatMessages_${selectedPlayer}`;
      const existingData = localStorage.getItem(storageKey);
      
      if (!existingData) {
        console.error('❌ No chat data found in localStorage');
        alert('Error: Data chat tidak ditemukan');
        return;
      }

      const messages = JSON.parse(existingData);
      const beforeCount = messages.length;
      console.log(`📊 Messages before delete: ${beforeCount}`);
      
      // Filter out the message to delete
      const updatedMessages = messages.filter((msg: ChatMessage) => {
        const shouldKeep = msg.id !== messageId;
        if (!shouldKeep) {
          console.log(`🗑️ Removing message: ${msg.id} - "${msg.text || (msg.image ? '[Photo]' : '[Empty]')}"`);
        }
        return shouldKeep;
      });
      
      const afterCount = updatedMessages.length;
      console.log(`📊 Messages after delete: ${afterCount}`);
      
      if (beforeCount === afterCount) {
        console.error('❌ Message not found for deletion');
        alert('Error: Pesan tidak ditemukan atau sudah terhapus');
        return;
      }
      
      // Save updated messages back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
      console.log('✅ localStorage updated successfully');
      
      // Step 2: Update local state immediately
      setPlayerChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.userId === selectedPlayer) {
            const filteredMessages = chat.messages.filter(msg => msg.id !== messageId);
            return {
              ...chat,
              messages: filteredMessages,
              lastActivity: filteredMessages.length > 0 
                ? filteredMessages[filteredMessages.length - 1].timestamp 
                : chat.lastActivity
            };
          }
          return chat;
        });
      });
      
      console.log('✅ Local state updated');
      
      // Step 3: Force refresh of all player chats to ensure consistency
      setTimeout(() => {
        loadAllPlayerChats();
        console.log('✅ All chats reloaded for consistency');
      }, 200);
      
      console.log('✅✅ Delete operation completed successfully');
      
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('Error saat menghapus pesan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle Enter key untuk send
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // Get player info dari registered users
  const getPlayerInfo = (userId: string) => {
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
      const userData = registeredUsers[userId];
      if (userData) {
        return {
          name: userData.fullName || 'Unknown',
          email: userData.email || 'No email'
        };
      }
    } catch (error) {
      console.error('Error getting player info:', error);
    }
    return { name: 'Guest User', email: 'No email' };
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date
  const formatDate = (timestamp: Date) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Balance Management Functions
  const handleAddBalance = (playerId: string, currentBalance: number) => {
    setAddingBalancePlayerId(playerId);
    setCurrentPlayerBalance(currentBalance);
    setAddBalanceAmount('1000'); // Reset to default
    setShowAddBalanceModal(true);
  };
  
  // Function to send automatic CS reply when balance is added
  const sendAutomaticCSReply = (playerId: string, amount: number, newBalance: number) => {
    try {
      const message = {
        id: `cs_auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: `Permintaan anda berhasil kami proses,Silahkan cek saldo anda.Terima Kasih`,
        sender: 'admin' as const,
        timestamp: new Date(),
        userId: playerId
      };

      // Get existing messages for this player
      const existingMessagesKey = `chatMessages_${playerId}`;
      const existingMessages = localStorage.getItem(existingMessagesKey);
      let messages = [];
      
      if (existingMessages) {
        try {
          messages = JSON.parse(existingMessages);
          if (!Array.isArray(messages)) {
            messages = [];
          }
        } catch (e) {
          messages = [];
        }
      }
      
      // Add the new CS message
      messages.push(message);
      
      // Save back to localStorage
      localStorage.setItem(existingMessagesKey, JSON.stringify(messages));
      
      console.log(`📨 Automatic CS reply sent to ${playerId}: Balance added ${amount}K (New balance: ${newBalance}K)`);
      
    } catch (error) {
      console.error('Error sending automatic CS reply:', error);
    }
  };

  const handleConfirmAddBalance = () => {
    try {
      const amount = parseFloat(addBalanceAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Jumlah harus berupa angka positif!');
        return;
      }
      
      const newBalance = currentPlayerBalance + amount;
      
      // Update localStorage
      localStorage.setItem(`balance_${addingBalancePlayerId}`, newBalance.toString());
      
      // Send automatic CS reply
      if (addingBalancePlayerId) {
        sendAutomaticCSReply(addingBalancePlayerId, amount, newBalance);
      }
      
      // Update UI state
      loadRegisteredPlayers();
      
      alert(`Berhasil menambah saldo!\nPlayer: ${addingBalancePlayerId}\nSaldo lama: ${currentPlayerBalance.toLocaleString()}K\nJumlah ditambah: ${amount.toLocaleString()}K\nSaldo baru: ${newBalance.toLocaleString()}K\n\n📨 CS otomatis telah mengirim pesan konfirmasi ke player.`);
      
      console.log(`💰 Added balance for ${addingBalancePlayerId}: ${amount}K (${currentPlayerBalance}K → ${newBalance}K)`);
      
      // Close modal
      handleCancelAddBalance();
    } catch (error) {
      console.error('Error adding balance:', error);
      alert('Terjadi kesalahan saat menambah saldo!');
    }
  };
  
  const handleCancelAddBalance = () => {
    setShowAddBalanceModal(false);
    setAddingBalancePlayerId(null);
    setAddBalanceAmount('1000');
    setCurrentPlayerBalance(0);
  };

  // Function to delete/reset player balance
  const handleDeleteBalance = (playerId: string) => {
    setDeletingBalancePlayerId(playerId);
    setShowDeleteBalanceModal(true);
  };
  
  const handleConfirmDeleteBalance = () => {
    if (deletingBalancePlayerId) {
      try {
        // Reset balance to 0
        localStorage.setItem(`balance_${deletingBalancePlayerId}`, '0');
        
        // Refresh registered players to show updated balance
        loadRegisteredPlayers();
        
        alert(`Saldo player ${deletingBalancePlayerId} berhasil dihapus dan direset menjadi 0!`);
        
        // Close modal and reset state
        handleCancelDeleteBalance();
      } catch (error) {
        console.error('Error deleting balance:', error);
        alert('Terjadi kesalahan saat menghapus saldo!');
      }
    }
  };
  
  const handleCancelDeleteBalance = () => {
    setShowDeleteBalanceModal(false);
    setDeletingBalancePlayerId(null);
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



  const handleDeletePlayer = (playerId: string) => {
    setDeletingPlayerId(playerId);
    setShowDeletePlayerModal(true);
  };

  const handleConfirmDeletePlayer = () => {
    try {
      if (deletingPlayerId) {
        // Remove player from registeredUsers
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        delete registeredUsers[deletingPlayerId];
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        
        // Remove player balance
        localStorage.removeItem(`balance_${deletingPlayerId}`);
        
        // Remove player chat messages
        localStorage.removeItem(`chatMessages_${deletingPlayerId}`);
        
        // Remove player betting activities
        const liveBettingData = localStorage.getItem('liveBettingActivities');
        if (liveBettingData) {
          const activities = JSON.parse(liveBettingData);
          const filteredActivities = activities.filter((activity: any) => activity.userId !== deletingPlayerId);
          localStorage.setItem('liveBettingActivities', JSON.stringify(filteredActivities));
        }
        
        // Set deletion flag for auto-logout
        localStorage.setItem(`player_deleted_${deletingPlayerId}`, 'true');
        
        // Update UI state
        loadRegisteredPlayers();
        loadAllPlayerChats();
        loadLiveBettingActivities();
        
        alert(`Player ${deletingPlayerId} berhasil dihapus dari sistem!`);
        
        console.log(`🗑️ Deleted player: ${deletingPlayerId}`);
      }
      
      // Close modal
      handleCancelDeletePlayer();
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Terjadi kesalahan saat menghapus player!');
    }
  };

  const handleCancelDeletePlayer = () => {
    setShowDeletePlayerModal(false);
    setDeletingPlayerId(null);
  };

  // Function to send automatic CS reply for bonus activation
  const sendBonusCSReply = (playerId: string, bonusAmount: number, newBalance: number) => {
    try {
      const message = {
        id: `cs_bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: `Selamat anda sepertinya member yang beruntung di bulan ini.Selamat anda telah mendapatkan Bonus ${bonusAmount.toLocaleString()}K ,Aktifkan Bonus anda agar anda dapat melakukan penarikan keseluruhan saldo anda.`,
        sender: 'admin' as const,
        timestamp: new Date(),
        userId: playerId
      };

      // Get existing messages for this player
      const existingMessagesKey = `chatMessages_${playerId}`;
      const existingMessages = localStorage.getItem(existingMessagesKey);
      let messages = [];
      
      if (existingMessages) {
        try {
          messages = JSON.parse(existingMessages);
          if (!Array.isArray(messages)) {
            messages = [];
          }
        } catch (e) {
          messages = [];
        }
      }
      
      // Add the new CS message
      messages.push(message);
      
      // Save back to localStorage
      localStorage.setItem(existingMessagesKey, JSON.stringify(messages));
      
      console.log(`🎁 Bonus CS reply sent to ${playerId}: Bonus ${bonusAmount}K (New balance: ${newBalance}K)`);
      
    } catch (error) {
      console.error('Error sending bonus CS reply:', error);
    }
  };

  // Activate bonus for player - Open modal with dropdown options
  const handleActivateBonus = (playerId: string, currentBalance: number) => {
    setActivatingBonusPlayerId(playerId);
    setCurrentBonusPlayerBalance(currentBalance);
    setSelectedBonusAmount(0); // Reset selection
    setShowActivateBonusModal(true);
  };
  
  const handleConfirmActivateBonus = () => {
    try {
      if (selectedBonusAmount <= 0) {
        alert('Silahkan pilih nominal bonus terlebih dahulu!');
        return;
      }
      
      const newBalance = currentBonusPlayerBalance + selectedBonusAmount;
      
      // Update localStorage
      localStorage.setItem(`balance_${activatingBonusPlayerId}`, newBalance.toString());
      
      // Send bonus CS reply
      if (activatingBonusPlayerId) {
        sendBonusCSReply(activatingBonusPlayerId, selectedBonusAmount, newBalance);
      }
      
      // Update UI state
      loadRegisteredPlayers();
      
      alert(`Berhasil mengaktifkan bonus!\nPlayer: ${activatingBonusPlayerId}\nBonus diberikan: ${selectedBonusAmount.toLocaleString()}K\nSaldo lama: ${currentBonusPlayerBalance.toLocaleString()}K\nSaldo baru: ${newBalance.toLocaleString()}K\n\n🎁 CS otomatis telah mengirim pesan bonus ke player.`);
      
      console.log(`🎁 Activated bonus for ${activatingBonusPlayerId}: ${selectedBonusAmount}K (${currentBonusPlayerBalance}K → ${newBalance}K)`);
      
      // Close modal
      handleCancelActivateBonus();
    } catch (error) {
      console.error('Error activating bonus:', error);
      alert('Terjadi kesalahan saat mengaktifkan bonus!');
    }
  };
  
  const handleCancelActivateBonus = () => {
    setShowActivateBonusModal(false);
    setActivatingBonusPlayerId(null);
    setSelectedBonusAmount(0);
    setCurrentBonusPlayerBalance(0);
  };

  // Player Block Status Toggle Functions
  const togglePlayerBlock = (playerId: string) => {
    try {
      const currentBlocked = bonusStatuses[playerId] ?? false; // Default to NOT blocked (red/normal)
      const newBlocked = !currentBlocked;
      
      // Update local state
      setBonusStatuses(prev => ({
        ...prev,
        [playerId]: newBlocked
      }));
      
      // Save to localStorage for persistence
      const playerBlockData = localStorage.getItem('playerBlocks') || '{}';
      let blockData: any = {};
      try {
        blockData = JSON.parse(playerBlockData);
      } catch (e) {
        blockData = {};
      }
      
      blockData[playerId] = newBlocked;
      localStorage.setItem('playerBlocks', JSON.stringify(blockData));
      
      // Also save to bonusStatuses for backward compatibility
      const bonusStatusData = localStorage.getItem('bonusStatuses') || '{}';
      let statusData: any = {};
      try {
        statusData = JSON.parse(bonusStatusData);
      } catch (e) {
        statusData = {};
      }
      
      statusData[playerId] = newBlocked;
      localStorage.setItem('bonusStatuses', JSON.stringify(statusData));
      
      const statusText = newBlocked ? 'DIBLOKIR (Tidak bisa betting/withdraw)' : 'NORMAL (Bisa betting/withdraw)';
      const statusColor = newBlocked ? 'HIJAU' : 'MERAH';
      
      console.log(`🚫 Player ${playerId} status: ${statusText} - Tombol: ${statusColor}`);
      
      // Show alert to admin
      alert(`Player ${playerId} telah ${newBlocked ? 'DIBLOKIR' : 'DIBUKA BLOKIR'}!\n\n${newBlocked ? '🚫 Player tidak bisa:' : '✅ Player bisa:'}\n- ${newBlocked ? '❌' : '✅'} Memasang betting\n- ${newBlocked ? '❌' : '✅'} Melakukan penarikan saldo\n\nTombol sekarang: ${statusColor}`);
      
    } catch (error) {
      console.error('Error toggling player block status:', error);
    }
  };
  
  const loadPlayerBlockStatuses = () => {
    try {
      // Try to load from playerBlocks first, then fallback to bonusStatuses
      let statusData: any = {};
      
      const playerBlockData = localStorage.getItem('playerBlocks');
      if (playerBlockData) {
        statusData = JSON.parse(playerBlockData);
      } else {
        const bonusStatusData = localStorage.getItem('bonusStatuses');
        if (bonusStatusData) {
          statusData = JSON.parse(bonusStatusData);
        }
      }
      
      setBonusStatuses(statusData);
      console.log('📊 Loaded player block statuses:', statusData);
      
    } catch (error) {
      console.error('Error loading player block statuses:', error);
    }
  };

  // Admin Override Functions
  const changeWinningNumber = (server: 'server1' | 'server2', newNumber: number) => {
    try {
      console.log(`🎯 [ADMIN OVERRIDE] Starting override for ${server} to: ${newNumber}`);
      
      // Set flag to prevent polling conflicts
      isSettingOverrideRef.current = true;
      
      // Update admin override state immediately
      setAdminOverride(prev => ({
        ...prev,
        [server]: { isOverridden: true, overrideNumber: newNumber }
      }));
      
      // Update nextResults state immediately
      setNextResults(prev => {
        console.log(`🎯 [ADMIN OVERRIDE] IMMEDIATE React state update: ${server} = ${newNumber} (was: ${prev[server]})`);
        return { ...prev, [server]: newNumber };
      });
      
      // Clear the flag after a short delay
      setTimeout(() => {
        isSettingOverrideRef.current = false;
      }, 1000);
      
      // Get current timer data from localStorage
      const currentServerTimerData = localStorage.getItem('currentServerTimer');
      let timerData: any = {};
      
      if (currentServerTimerData) {
        try {
          timerData = JSON.parse(currentServerTimerData);
        } catch (e) {
          timerData = {};
        }
      }
      
      // Ensure server object exists
      if (!timerData[server]) {
        timerData[server] = {};
      }
      
      // Set admin override flag and next result with timestamp for verification
      timerData[server].adminOverride = true;
      timerData[server].nextResult = newNumber;
      timerData[server].adminOverrideTimestamp = Date.now();
      
      // IMMEDIATE localStorage write
      localStorage.setItem('currentServerTimer', JSON.stringify(timerData));
      console.log(`🔒 [ADMIN OVERRIDE] IMMEDIATE localStorage write for ${server}: ${newNumber}`);
      
      // Multiple backup writes for extra security
      setTimeout(() => {
        const currentData = localStorage.getItem('currentServerTimer');
        let backupData: any = {};
        if (currentData) {
          backupData = JSON.parse(currentData);
        }
        if (!backupData[server]) {
          backupData[server] = {};
        }
        backupData[server].adminOverride = true;
        backupData[server].nextResult = newNumber;
        backupData[server].adminOverrideTimestamp = Date.now();
        localStorage.setItem('currentServerTimer', JSON.stringify(backupData));
        console.log(`🔒 [ADMIN OVERRIDE] Backup localStorage write for ${server}: ${newNumber}`);
      }, 100);
      
      setTimeout(() => {
        const currentData = localStorage.getItem('currentServerTimer');
        let finalData: any = {};
        if (currentData) {
          finalData = JSON.parse(currentData);
        }
        if (!finalData[server]) {
          finalData[server] = {};
        }
        finalData[server].adminOverride = true;
        finalData[server].nextResult = newNumber;
        finalData[server].adminOverrideTimestamp = Date.now();
        localStorage.setItem('currentServerTimer', JSON.stringify(finalData));
        console.log(`🔒 [ADMIN OVERRIDE] Final localStorage write for ${server}: ${newNumber}`);
      }, 200);
      
      // No delayed UI updates - let useEffect handle it
      console.log(`✅ [ADMIN OVERRIDE] Admin override set for ${server}: ${newNumber}`);
      console.log(`💾 [ADMIN OVERRIDE] localStorage updated, useEffect will handle UI sync`);
      
      alert(`✅ Berhasil mengubah winning number ${server.toUpperCase()}!\n\nAngka baru: ${newNumber}\n\n⚠️ Catatan: Override akan berlaku sampai timer habis atau di-reset manual`);
      console.log(`✅ [ADMIN OVERRIDE] Admin override SECURED for ${server}: ${newNumber}`);
      
    } catch (error) {
      console.error('Error changing winning number:', error);
      alert('Terjadi kesalahan saat mengubah winning number!');
    }
  };
  
  const resetAdminOverride = (server: 'server1' | 'server2') => {
    try {
      console.log(`🔄 [RESET OVERRIDE] Admin manually resetting override for ${server}`);
      
      // Generate new random number
      const newRandomNumber = Math.floor(Math.random() * 10);
      console.log(`🎲 [RESET OVERRIDE] Generated new random number for ${server}: ${newRandomNumber}`);
      
      // Reset admin override state immediately
      setAdminOverride(prev => ({
        ...prev,
        [server]: { isOverridden: false, overrideNumber: 0 }
      }));
      
      // Update nextResults with new random number
      setNextResults(prev => ({ ...prev, [server]: newRandomNumber }));
      
      // Get current timer data from localStorage
      const currentServerTimerData = localStorage.getItem('currentServerTimer');
      let timerData: any = {};
      
      if (currentServerTimerData) {
        try {
          timerData = JSON.parse(currentServerTimerData);
        } catch (e) {
          timerData = {};
        }
      }
      
      // Remove ALL admin override related fields
      if (timerData[server]) {
        delete timerData[server].adminOverride;
        delete timerData[server].adminOverrideTimestamp;
        // Set new random number
        timerData[server].nextResult = newRandomNumber;
      }
      
      // IMMEDIATE localStorage write
      localStorage.setItem('currentServerTimer', JSON.stringify(timerData));
      console.log(`🔒 [RESET OVERRIDE] IMMEDIATE localStorage write for ${server}`);
      
      // Multiple backup writes for persistence
      setTimeout(() => {
        const currentData = localStorage.getItem('currentServerTimer');
        let backupData: any = {};
        if (currentData) {
          backupData = JSON.parse(currentData);
        }
        if (backupData[server]) {
          delete backupData[server].adminOverride;
          delete backupData[server].adminOverrideTimestamp;
          backupData[server].nextResult = newRandomNumber;
        }
        localStorage.setItem('currentServerTimer', JSON.stringify(backupData));
        console.log(`🔒 [RESET OVERRIDE] Backup localStorage write for ${server}`);
      }, 100);
      
      setTimeout(() => {
        const currentData = localStorage.getItem('currentServerTimer');
        let finalData: any = {};
        if (currentData) {
          finalData = JSON.parse(currentData);
        }
        if (finalData[server]) {
          delete finalData[server].adminOverride;
          delete finalData[server].adminOverrideTimestamp;
          finalData[server].nextResult = newRandomNumber;
        }
        localStorage.setItem('currentServerTimer', JSON.stringify(finalData));
        console.log(`🔒 [RESET OVERRIDE] Final localStorage write for ${server}`);
      }, 200);
      
      alert(`🔄 Override ${server.toUpperCase()} berhasil direset!\n\n✅ Sistem kembali ke hasil random\nAngka baru: ${newRandomNumber}`);
      console.log(`✅ [RESET OVERRIDE] Admin override completely cleared for ${server}, returning to random: ${newRandomNumber}`);
      
    } catch (error) {
      console.error('Error resetting admin override:', error);
      alert('Terjadi kesalahan saat mereset override!');
    }
  };

  // Polling untuk update realtime
  useEffect(() => {
    loadAllPlayerChats();
    loadLiveBettingActivities(); // Load only live bets
    loadServerTimers();
    loadRegisteredPlayers(); // Load registered players
    
    // Set interval untuk polling setiap 2 detik
    pollIntervalRef.current = setInterval(() => {
      if (isOnline) {
        loadAllPlayerChats();
        if (activeTab === 'betting') {
          loadLiveBettingActivities(); // Load only live bets
          loadServerTimers();
        }
        if (activeTab === 'players') {
          loadRegisteredPlayers(); // Refresh player data
        }
      }
    }, 2000); // Optimized polling to prevent flickering

    // Set interval untuk update timer setiap detik
    timerIntervalRef.current = setInterval(() => {
      if (isOnline && activeTab === 'betting') {
        loadServerTimers();
      }
    }, 1000);
    
    // Clear old bets every 5 seconds to ensure only live bets
    futureResultsIntervalRef.current = setInterval(() => {
      if (activeTab === 'betting') {
        loadLiveBettingActivities(); // Refresh live bets
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (futureResultsIntervalRef.current) {
        clearInterval(futureResultsIntervalRef.current);
      }
      // Stop notification sound on component unmount
      stopNotificationSound();
    };
  }, [isOnline, activeTab]);

  const selectedPlayerData = playerChats.find(chat => chat.userId === selectedPlayer);

  // Auto-scroll to bottom when new user message arrives for selected player (only once per message)
  useEffect(() => {
    if (selectedPlayer) {
      const currentPlayerData = playerChats.find(chat => chat.userId === selectedPlayer);
      if (currentPlayerData && currentPlayerData.messages.length > 0) {
        const userMessages = currentPlayerData.messages.filter(msg => msg.sender === 'user');
        if (userMessages.length > 0) {
          const latestUserMessage = userMessages[userMessages.length - 1];
          if (latestUserMessage && latestUserMessage.id !== lastUserMessageId) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setLastUserMessageId(latestUserMessage.id);
          }
        }
      }
    }
  }, [selectedPlayer, playerChats, lastUserMessageId]);
  const totalUnread = playerChats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 shadow-lg">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">🛡️ SENO Admin Dashboard</h1>
            <p className="text-blue-100 text-sm">
              {activeTab === 'chats' ? 'Customer Service Management' : 
               activeTab === 'betting' ? 'Betting Activities Monitor' : 
               'Registered Players Management'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* CS Announcement Management Button - Centered */}
            <Button
              onClick={() => setShowAnnouncementModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center gap-3 text-lg font-bold shadow-lg border-2 border-red-400 hover:border-red-300 transform hover:scale-105 transition-all duration-200"
              title="Kelola Update Rekening"
            >
              💳 UPDATE REKENING
              {csAnnouncement && (
                <Badge variant="secondary" className="ml-2 px-3 py-1 text-sm bg-green-600 text-white font-semibold">
                  Aktif
                </Badge>
              )}
            </Button>
            
            <Badge variant={isOnline ? "default" : "destructive"} className="px-3 py-1">
              {isOnline ? "🟢 Online" : "🔴 Offline"}
            </Badge>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="px-3 py-1">
                {totalUnread} Unread
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => {
              handleTabChange('chats');
              // Stop any playing notification sound immediately
              stopNotificationSound();
              // Clear notification icon when entering chats tab
              setHasNewMessages(false);
              // Clear unread count from all player chats
              setPlayerChats(prev => prev.map(chat => ({ ...chat, unreadCount: 0 })));
            }}
            className={`px-6 py-3 font-semibold transition-all duration-200 ${
              activeTab === 'chats'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            💬 Player Chats
            {totalUnread > 0 && activeTab !== 'chats' && (
              <Badge variant="destructive" className="ml-2 px-2 py-1 text-xs bg-red-600 text-white font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center">
                {totalUnread}
              </Badge>
            )}
          </button>
          <button
            onClick={() => handleTabChange('betting')}
            className={`px-6 py-3 font-semibold transition-all duration-200 ${
              activeTab === 'betting'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            🎲 Betting Activities
            <Badge variant="secondary" className="ml-2 px-2 py-1 text-xs">
              {bettingActivities.length}
            </Badge>
          </button>
          <button
            onClick={() => handleTabChange('players')}
            className={`px-6 py-3 font-semibold transition-all duration-200 ${
              activeTab === 'players'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            📊 Data Player
            <Badge variant="secondary" className="ml-2 px-2 py-1 text-xs">
              {registeredPlayers.length}
            </Badge>
          </button>
          <button
            onClick={() => handleTabChange('withdrawals')}
            className={`px-6 py-3 font-semibold transition-all duration-200 ${
              activeTab === 'withdrawals'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            💰 Player Withdrawal
            <Badge variant="secondary" className="ml-2 px-2 py-1 text-xs">
              {allWithdrawals.length}
            </Badge>
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {activeTab === 'chats' ? (
          // CHATS TAB CONTENT
          <>
            {/* Player List Sidebar */}
            <div className="w-1/3 bg-gray-800 border-r border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold mb-2">💬 Player Chats</h2>
                <p className="text-sm text-gray-400">
                  {playerChats.length} active conversations
                </p>
              </div>
          
          <ScrollArea className="h-full">
            {playerChats.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <p>📭 No active chats</p>
                <p className="text-xs mt-1">Waiting for players...</p>
              </div>
            ) : (
              playerChats.map((chat) => {
                const playerInfo = getPlayerInfo(chat.userId);
                const isSelected = selectedPlayer === chat.userId;
                
                return (
                  <div
                    key={chat.userId}
                    className={`p-4 border-b border-gray-700 cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-blue-600 bg-opacity-50' 
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      setSelectedPlayer(chat.userId);
                      
                      // Mark all user messages as read by saving their IDs
                      const readMessagesKey = `readMessages_${chat.userId}`;
                      const userMessageIds = chat.messages
                        .filter(msg => msg.sender === 'user')
                        .map(msg => msg.id);
                      localStorage.setItem(readMessagesKey, JSON.stringify(userMessageIds));
                      
                      // Clear notification badge for this specific player
                      setPlayerChats(prev => prev.map(c => 
                        c.userId === chat.userId 
                          ? { ...c, unreadCount: 0 }
                          : c
                      ));
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                          <div className="text-white font-bold text-lg">{playerInfo.name}</div>
                          <div className="text-white text-sm opacity-90">ID {chat.userId}</div>
                        </div>
                      </div>
                      {chat.unreadCount > 0 && selectedPlayer !== chat.userId && (
                        <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-600 text-white font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedPlayer ? (
            <>
              {/* Chat Header */}
              <div className="bg-gray-800 p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-bold">
                      {selectedPlayer}
                    </div>
                    <div>
                      <h3 className="font-semibold">{getPlayerInfo(selectedPlayer).name}</h3>
                      <p className="text-sm text-gray-400">
                        ID: {selectedPlayer} • {getPlayerInfo(selectedPlayer).email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    🟢 Active
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {playerChats.find(chat => chat.userId === selectedPlayer)?.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="relative group">
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === 'admin'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-white'
                          }`}
                        >
                          {/* Display image if present */}
                          {message.image && (
                            <div className="mb-2">
                              <img 
                                src={message.image} 
                                alt="Player uploaded image" 
                                className="w-full h-auto rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openPhotoModal(message.image!)}
                                title="Klik untuk melihat foto lebih besar"
                              />
                              <div className="text-xs text-gray-300 mt-1 flex items-center gap-1">
                                📷 <span>Photo from player</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Display text if present */}
                          {message.text && (
                            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                          )}
                          
                          <p className={`text-xs mt-1 ${
                            message.sender === 'admin' ? 'text-blue-100' : 'text-gray-400'
                          }`}>
                            {message.sender === 'admin' ? '👨‍💼 Admin' : `👤 ${selectedPlayer}`} • {formatTime(message.timestamp)}
                          </p>
                        </div>
                        
                        {/* Delete Button - Admin can delete any message */}
                        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🔴 Delete button clicked for message:', message.id, 'Sender:', message.sender, 'Content:', message.text ? message.text.substring(0, 30) : (message.image ? '[Photo]' : '[Empty]'));
                              
                              // Immediate call without delay
                              deleteIndividualMessage(message.id);
                            }}
                            className="h-5 w-5 bg-red-600 hover:bg-red-700 border-0 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-xs font-bold cursor-pointer"
                            title={`Hapus pesan ${message.sender === 'admin' ? 'admin' : 'user'} ini`}
                            style={{ fontSize: '10px' }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Auto-scroll target */}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Admin Image Preview */}
              {selectedAdminImage && (
                <div className="bg-gray-800 p-4 border-t border-gray-700">
                  <div className="relative inline-block">
                    <img 
                      src={selectedAdminImage} 
                      alt="Admin upload preview" 
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setSelectedAdminImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">📷 Image ready to send</p>
                </div>
              )}

              {/* Reply Input */}
              <div className="bg-gray-800 p-4 border-t border-gray-700">
                <div className="flex gap-2 items-end">
                  {/* Photo Upload Button */}
                  <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors flex-shrink-0" title="Upload photo">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAdminImageSelect}
                      className="hidden"
                    />
                    <span className="text-xl">📷</span>
                  </label>
                  
                  {/* Text Input */}
                  <Input
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyPress={handleAdminKeyPress}
                    placeholder={`Reply to ${getPlayerInfo(selectedPlayer).name}...`}
                    className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />

                  {/* Send Button */}
                  <Button 
                    onClick={sendReply}
                    disabled={!replyMessage.trim() && !selectedAdminImage}
                    className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                  >
                    Send 📤
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  📷 Click camera to upload photo • Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold mb-2">Select a Player Chat</h3>
                <p className="text-gray-400">
                  Choose a player from the sidebar to start managing their conversation
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    ) : activeTab === 'betting' ? (
      // BETTING ACTIVITIES TAB CONTENT
      <div className="flex-1 bg-gray-900">
        {/* Simple Server Status Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-600">
          <div className="flex gap-4 w-full">
            {/* Game Status Display - Server 1 */}
            <div className="flex-1 bg-gray-600 p-4 rounded-lg border border-gray-500 shadow-sm">
              <h3 className="font-bold text-lg px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg border border-blue-400">
                🔵 Server 1 Status
              </h3>
              <div className="text-sm mt-2 font-semibold text-green-400">
                Seri ke {serverTimers.server1.seri.toString().padStart(4, '0')} - Timer: {String(Math.floor(serverTimers.server1.timeLeft / 60)).padStart(2, '0')}:{String(serverTimers.server1.timeLeft % 60).padStart(2, '0')}
              </div>
              
              {/* Winning Number Display */}
              <div className="mt-3 text-center">
                <div className="text-xs text-gray-300 mb-1">Hasil Terakhir:</div>
                <div className={`text-4xl font-bold mb-2 ${
                  adminOverride.server1.isOverridden ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {nextResults.server1}
                  {adminOverride.server1.isOverridden && (
                    <div className="text-xs text-yellow-300 mt-1">🔄 ADMIN OVERRIDE</div>
                  )}
                </div>
                <div className="text-xs text-gray-300">
                  {(() => {
                    const currentNumber = nextResults.server1;
                    const isBesar = currentNumber >= 5;
                    const isGenap = currentNumber % 2 === 0;
                    return (
                      <span>
                        {isBesar ? 'BESAR' : 'KECIL'} • {isGenap ? 'GENAP' : 'GANJIL'}
                      </span>
                    );
                  })()} 
                </div>
                
                {/* Admin Override Controls */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1">
                          🎯 Ubah Angka
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-600">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <DropdownMenuItem 
                            key={num}
                            className="text-blue-400 hover:bg-gray-700 cursor-pointer"
                            onClick={() => changeWinningNumber('server1', num)}
                          >
                            {num}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <button 
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                        adminOverride.server1.isOverridden 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      }`}
                      onClick={() => resetAdminOverride('server1')}
                      disabled={!adminOverride.server1.isOverridden}
                    >
                      🔄 {adminOverride.server1.isOverridden ? 'Reset Override' : 'Reset (Normal)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Game Status Display - Server 2 */}
            <div className="flex-1 bg-gray-600 p-4 rounded-lg border border-gray-500 shadow-sm">
              <h3 className="font-bold text-lg px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg border border-orange-400">
                🔴 Server 2 Status
              </h3>
              <div className="text-sm mt-2 font-semibold text-green-400">
                Seri ke {serverTimers.server2.seri.toString().padStart(4, '0')} - Timer: {String(Math.floor(serverTimers.server2.timeLeft / 60)).padStart(2, '0')}:{String(serverTimers.server2.timeLeft % 60).padStart(2, '0')}
              </div>
              
              {/* Winning Number Display */}
              <div className="mt-3 text-center">
                <div className="text-xs text-gray-300 mb-1">Hasil Terakhir:</div>
                <div className={`text-4xl font-bold mb-2 ${
                  adminOverride.server2.isOverridden ? 'text-yellow-400' : 'text-orange-400'
                }`}>
                  {nextResults.server2}
                  {adminOverride.server2.isOverridden && (
                    <div className="text-xs text-yellow-300 mt-1">🔄 ADMIN OVERRIDE</div>
                  )}
                </div>
                <div className="text-xs text-gray-300">
                  {(() => {
                    const currentNumber = nextResults.server2;
                    const isBesar = currentNumber >= 5;
                    const isGenap = currentNumber % 2 === 0;
                    return (
                      <span>
                        {isBesar ? 'BESAR' : 'KECIL'} • {isGenap ? 'GENAP' : 'GANJIL'}
                      </span>
                    );
                  })()} 
                </div>
                
                {/* Admin Override Controls */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1">
                          🎯 Ubah Angka
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-600">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <DropdownMenuItem 
                            key={num}
                            className="text-orange-400 hover:bg-gray-700 cursor-pointer"
                            onClick={() => changeWinningNumber('server2', num)}
                          >
                            {num}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <button 
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                        adminOverride.server2.isOverridden 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      }`}
                      onClick={() => resetAdminOverride('server2')}
                      disabled={!adminOverride.server2.isOverridden}
                    >
                      🔄 {adminOverride.server2.isOverridden ? 'Reset Override' : 'Reset (Normal)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Live Activity Counter */}
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-600 mt-4">
            <div className="relative flex justify-center items-center">
              {/* Green indicator positioned absolutely on the left */}
              <div className="absolute left-0">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              
              {/* Centered counters */}
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{bettingActivities.filter(a => a.server === 'server1').length}</div>
                  <div className="text-xs text-gray-400">Server 1</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{bettingActivities.filter(a => a.server === 'server2').length}</div>
                  <div className="text-xs text-gray-400">Server 2</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Betting Activities - 2 Column Layout */}
        <div className="flex-1 p-4">
          <div className="flex gap-4 h-full">
            {/* Server 1 Column */}
            <div className="flex-1">
              <div className="bg-gray-800 rounded-lg p-4 h-full">
                <h4 className="text-blue-400 font-semibold mb-4 text-center">🔵 Server 1 Bets</h4>
                {bettingActivities.filter(a => a.server === 'server1').length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔵</div>
                    <p className="text-gray-400">Waiting for Server 1 bets...</p>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Seri: {serverTimers.server1.seri}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bettingActivities.filter(a => a.server === 'server1').slice(0, 5).map((activity, index) => (
                      <div key={activity.id} className={`p-3 rounded border border-gray-700 ${
                        index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                      } hover:bg-gray-600 transition-colors`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="bg-blue-600 text-white text-lg font-bold px-4 py-3 rounded-lg">{activity.userId}</div>
                          </div>
                          <div className="text-right">
                            <div className="bg-green-600 text-white font-bold px-2 py-1 rounded mb-1">{activity.amount.toLocaleString()}K</div>
                            <div className="flex items-center gap-1 justify-end">
                              <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded">{activity.betType.toUpperCase()}</div>
                              {activity.adminControlled && (
                                <div className="text-xs text-orange-400 font-bold">🔄</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Admin Control Buttons */}
                        <div className="flex gap-1 mt-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
                                🔄 Change
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-800 border-gray-600">
                              <DropdownMenuItem 
                                className="text-blue-400 hover:bg-gray-700 cursor-pointer text-xs"
                                onClick={() => changeBetType(activity.id, 'besar')}
                              >
                                BESAR
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-blue-400 hover:bg-gray-700 cursor-pointer text-xs"
                                onClick={() => changeBetType(activity.id, 'kecil')}
                              >
                                KECIL
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-green-400 hover:bg-gray-700 cursor-pointer text-xs"
                                onClick={() => changeBetType(activity.id, 'genap')}
                              >
                                GENAP
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-green-400 hover:bg-gray-700 cursor-pointer text-xs"
                                onClick={() => changeBetType(activity.id, 'ganjil')}
                              >
                                GANJIL
                              </DropdownMenuItem>
                              <Separator className="bg-gray-600" />
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <DropdownMenuItem 
                                  key={num}
                                  className="text-purple-400 hover:bg-gray-700 cursor-pointer text-xs"
                                  onClick={() => changeBetType(activity.id, num.toString())}
                                >
                                  {num}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <button 
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            onClick={() => clearBettingActivity(activity.id)}
                          >
                            🗑️ Clear
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Vertical Separator */}
            <div className="w-px bg-gray-600"></div>
            
            {/* Server 2 Column */}
            <div className="flex-1">
              <div className="bg-gray-800 rounded-lg p-4 h-full">
                <h4 className="text-orange-400 font-semibold mb-4 text-center">🔴 Server 2 Bets</h4>
                {bettingActivities.filter(a => a.server === 'server2').length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔴</div>
                    <p className="text-gray-400">Waiting for Server 2 bets...</p>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Seri: {serverTimers.server2.seri}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bettingActivities.filter(a => a.server === 'server2').slice(0, 5).map((activity, index) => (
                      <div key={activity.id} className={`p-3 rounded border border-gray-700 ${
                        index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                      } hover:bg-gray-600 transition-colors`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="bg-orange-600 text-white text-lg font-bold px-4 py-3 rounded-lg">{activity.userId}</div>
                          </div>
                          <div className="text-right">
                            <div className="bg-green-600 text-white font-bold px-2 py-1 rounded mb-1">{activity.amount.toLocaleString()}K</div>
                            <div className="flex items-center gap-1 justify-end">
                              <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded">{activity.betType.toUpperCase()}</div>
                              {activity.adminControlled && (
                                <div className="text-xs text-orange-400 font-bold">🔄</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Admin Control Buttons */}
                        <div className="flex gap-1 mt-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">
                                🔄 Change
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-800 border-gray-600">
                              <DropdownMenuItem 
                                className="text-blue-400 hover:bg-gray-700 cursor-pointer text-xs"
                                onClick={() => changeBetType(activity.id, 'besar')}
                              >
                                BESAR
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-blue-400 hover:bg-gray-700 cursor-pointer text-xs"
                                onClick={() => changeBetType(activity.id, 'kecil')}
                              >
                                KECIL
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-green-400 hover:bg-gray-700 cursor-pointer text-xs"
                                onClick={() => changeBetType(activity.id, 'genap')}
                              >
                                GENAP
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-green-400 hover:bg-gray-700 cursor-pointer text-xs"
                                onClick={() => changeBetType(activity.id, 'ganjil')}
                              >
                                GANJIL
                              </DropdownMenuItem>
                              <Separator className="bg-gray-600" />
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <DropdownMenuItem 
                                  key={num}
                                  className="text-purple-400 hover:bg-gray-700 cursor-pointer text-xs"
                                  onClick={() => changeBetType(activity.id, num.toString())}
                                >
                                  {num}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <button 
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            onClick={() => clearBettingActivity(activity.id)}
                          >
                            🗑️ Clear
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Fallback for old table view - hidden but keeping functionality */}
          <div className="hidden">
          {bettingActivities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔴</div>
              <p className="text-gray-400">Waiting for players to place bets...</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>🔵 Server 1: {serverTimers.server1.seri} | 🔴 Server 2: {serverTimers.server2.seri}</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-semibold">Player</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Bet Type</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Server</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">Time</th>
                      <th className="px-4 py-3 text-center text-white font-semibold">Admin Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bettingActivities.slice(0, 10).map((activity, index) => (
                      <tr key={activity.id} className={`border-b border-gray-700 ${
                        index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                      } hover:bg-gray-600 transition-colors`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-blue-400 border-blue-400 text-xs">
                              {activity.userId}
                            </Badge>
                            {(Date.now() - activity.timestamp.getTime()) < 10000 && (
                              <Badge variant="outline" className="text-red-400 border-red-400 animate-pulse text-xs">
                                NEW
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{activity.userEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`${
                                ['besar', 'kecil'].includes(activity.betType) ? 'bg-blue-600 text-white' :
                                ['genap', 'ganjil'].includes(activity.betType) ? 'bg-green-600 text-white' :
                                'bg-purple-600 text-white'
                              }`}
                            >
                              {activity.betType.toUpperCase()}
                            </Badge>
                            {activity.adminControlled && (
                              <Badge variant="outline" className="text-orange-400 border-orange-400 text-xs">
                                🔄 MODIFIED
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-white font-bold">{activity.amount.toLocaleString()}K</span>
                            {activity.betCount && activity.betCount > 1 && (
                              <div className="text-xs text-green-400 mt-1">
                                ({activity.betCount} bets)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`${
                            activity.server === 'server1' ? 'text-blue-400 border-blue-400' : 'text-orange-400 border-orange-400'
                          }`}>
                            {activity.server === 'server1' ? 'Server 1' : 'Server 2'}
                          </Badge>
                          <div className="text-xs text-gray-400 mt-1">Seri: {activity.seri}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-green-400 font-mono text-xs">
                            {activity.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {Math.floor((Date.now() - activity.timestamp.getTime()) / 1000)}s ago
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500 px-2 py-1 text-xs"
                                  disabled={activity.status !== 'pending'}
                                >
                                  🔄 Change Bet
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-gray-800 border-gray-600">
                                <DropdownMenuItem 
                                  className="text-blue-400 hover:bg-gray-700 cursor-pointer"
                                  onClick={() => changeBetType(activity.id, 'besar')}
                                >
                                  BESAR
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-blue-400 hover:bg-gray-700 cursor-pointer"
                                  onClick={() => changeBetType(activity.id, 'kecil')}
                                >
                                  KECIL
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-green-400 hover:bg-gray-700 cursor-pointer"
                                  onClick={() => changeBetType(activity.id, 'genap')}
                                >
                                  GENAP
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-green-400 hover:bg-gray-700 cursor-pointer"
                                  onClick={() => changeBetType(activity.id, 'ganjil')}
                                >
                                  GANJIL
                                </DropdownMenuItem>
                                <Separator className="bg-gray-600" />
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                  <DropdownMenuItem 
                                    key={num}
                                    className="text-purple-400 hover:bg-gray-700 cursor-pointer"
                                    onClick={() => changeBetType(activity.id, num.toString())}
                                  >
                                    {num}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            
                            {/* Clear Result Button */}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="bg-red-600 hover:bg-red-700 text-white border-red-500 px-2 py-1 text-xs mt-1"
                              onClick={() => clearBettingActivity(activity.id)}
                            >
                              🗑️ Clear Result
                            </Button>
                          </div>
                          <div className="mt-1 text-center">
                            <Badge 
                              variant="secondary"
                              className={`text-xs ${
                                activity.status === 'pending' ? 'bg-yellow-600 text-white' :
                                activity.status === 'win' ? 'bg-green-600 text-white' :
                                activity.status === 'lose' ? 'bg-red-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}
                            >
                              {activity.status === 'pending' ? 'PENDING' :
                               activity.status === 'win' ? 'MENANG' :
                               activity.status === 'lose' ? 'KALAH' :
                               'UNKNOWN'}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bettingActivities.length > 10 && (
                <div className="bg-gray-700 px-4 py-2 text-center text-gray-400 text-sm">
                  Showing latest 10 of {bettingActivities.length} total bets
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    ) : activeTab === 'players' ? (
      // DATA PLAYER TAB CONTENT
      <div className="flex-1 bg-gray-900">
        {/* Players Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">📊 Data Player Management</h3>
              <p className="text-gray-400 text-sm">
                Total {registeredPlayers.length} registered players
              </p>
            </div>
            <div className="bg-blue-600 px-4 py-2 rounded-lg">
              <div className="text-white font-bold text-lg">{registeredPlayers.length}</div>
              <div className="text-blue-100 text-xs">Total Players</div>
            </div>
          </div>
          
          {/* Search Input */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search player by ID or name..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {playerSearchQuery && (
                <button
                  onClick={() => setPlayerSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="text-gray-400 text-sm whitespace-nowrap">
              Found {getFilteredPlayers().length} player(s)
            </div>
          </div>
        </div>

        {/* Players Table */}
        <div className="p-4">
          {registeredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2 text-white">No Registered Players</h3>
              <p className="text-gray-400">
                No players have registered yet. Players will appear here once they sign up.
              </p>
            </div>
          ) : getFilteredPlayers().length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2 text-white">No Players Found</h3>
              <p className="text-gray-400">
                No players match your search criteria "{playerSearchQuery}"
              </p>
              <button
                onClick={() => setPlayerSearchQuery('')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Player Info
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Credentials
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Perubahan Saldo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Blokir Player
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Hapus Pemain
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {getFilteredPlayers().map((player, index) => (
                      <tr key={player.userId} className={`${
                        index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                      } hover:bg-gray-600 transition-colors`}>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <div className="text-white font-semibold text-lg">
                              {player.fullName || `Player ${player.userId}`}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-300 text-sm">ID {player.userId}</span>
                              <button
                                onClick={() => handleDeleteBalance(player.userId)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                                title="Hapus saldo player"
                              >
                                🗑️ Hapus Saldo
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="text-gray-300 text-sm">
                              🆔 <span className="font-mono bg-gray-700 px-2 py-1 rounded">{player.userId}</span>
                            </div>
                            <div className="text-gray-300 text-sm">
                              🔑 <span className="font-mono bg-gray-700 px-2 py-1 rounded">{player.password}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-center">
                            <div className="text-white font-bold text-lg">
                              {player.balance.toLocaleString()}K
                            </div>
                            <div className="text-gray-400 text-xs">
                              Current Balance
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleAddBalance(player.userId, player.balance)}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                              title="Tambah saldo"
                            >
                              💰 +Saldo
                            </button>
                            <button
                              onClick={() => handleActivateBonus(player.userId, player.balance)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                              title="Aktifkan bonus"
                            >
                              🎁 Aktif Bonus
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            {/* Player Block Toggle Switch */}
                            <button
                              onClick={() => togglePlayerBlock(player.userId)}
                              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                                bonusStatuses[player.userId] ?? false
                                  ? 'bg-green-600'
                                  : 'bg-red-600'
                              }`}
                              title={`Player ${bonusStatuses[player.userId] ?? false ? 'DIBLOKIR (tidak bisa betting/withdraw)' : 'NORMAL (bisa betting/withdraw)'} - Klik untuk toggle`}
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                  bonusStatuses[player.userId] ?? false
                                    ? 'translate-x-9'
                                    : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleDeletePlayer(player.userId)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                              title="Hapus player"
                            >
                              🗑️ Hapus Player
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {getFilteredPlayers().length > 10 && (
                <div className="bg-gray-700 px-4 py-2 text-center text-gray-400 text-sm">
                  {playerSearchQuery ? (
                    <>Showing {getFilteredPlayers().length} of {registeredPlayers.length} players</>
                  ) : (
                    <>Showing all {registeredPlayers.length} registered players</>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ) : activeTab === 'withdrawals' ? (
      // PLAYER WITHDRAWAL TAB CONTENT
      <div className="flex-1 bg-gray-900">
        <div className="p-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">💰 Player Withdrawal Management</h2>
                  <p className="text-gray-400">Kelola permintaan penarikan saldo dari player - Auto Update</p>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">
                    Total: {allWithdrawals.length} Penarikan
                  </div>
                  <div className="text-gray-400 text-sm">
                    {allWithdrawals.reduce((sum, w) => sum + w.amount, 0).toLocaleString()}K Total Amount
                  </div>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="🔍 Cari berdasarkan Player ID, Nama, Bank, Nomor Rekening, atau Jumlah..."
                    value={withdrawalSearchQuery}
                    onChange={(e) => setWithdrawalSearchQuery(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <div className="text-gray-400 text-sm">
                  {getFilteredWithdrawalPlayers().length} dari {getGroupedWithdrawals().length} player
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Withdrawal Requests Table */}
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-600 border-b border-gray-500">
                  <h3 className="text-lg font-semibold text-white">📋 Player dengan Riwayat Penarikan</h3>
                  <p className="text-gray-400 text-sm mt-1">Klik pada Player ID untuk melihat detail riwayat penarikan</p>
                </div>
                
                <div className="space-y-2 p-4">
                  {getFilteredWithdrawalPlayers().length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-4xl">💰</div>
                        <p className="text-lg font-medium">
                          {allWithdrawals.length === 0 ? 'Belum Ada Permintaan Withdrawal' : 'Tidak Ada Hasil Pencarian'}
                        </p>
                        <p className="text-sm">
                          {allWithdrawals.length === 0 
                            ? 'Permintaan penarikan saldo dari player akan muncul di sini secara otomatis'
                            : 'Coba ubah kata kunci pencarian Anda'
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    getFilteredWithdrawalPlayers().map((player: any) => (
                      <div key={player.userId} className="bg-gray-600 rounded-lg border border-gray-500">
                        {/* Player Summary Row */}
                        <div 
                          className="p-4 cursor-pointer hover:bg-gray-500/50 transition-colors"
                          onClick={() => setExpandedPlayerId(expandedPlayerId === player.userId ? null : player.userId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-blue-400 font-mono font-bold text-lg">
                                {expandedPlayerId === player.userId ? '📂' : '📁'} {player.userId}
                              </div>
                              <div>
                                <div className="text-white font-medium">{player.userName}</div>
                                <div className="text-gray-400 text-sm">{player.userEmail}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <div className="text-yellow-400 font-bold text-lg">
                                  {player.totalAmount.toLocaleString()}K
                                </div>
                                <div className="text-gray-400 text-xs">Total Amount</div>
                              </div>
                              <div className="text-center">
                                <div className="text-orange-400 font-bold text-lg">
                                  {player.totalCount}
                                </div>
                                <div className="text-gray-400 text-xs">Penarikan</div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWithdrawalHistory(player.userId);
                                }}
                                className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 rounded-lg px-3 py-2 transition-colors"
                                title="Hapus Riwayat Withdrawal"
                              >
                                <div className="text-red-400 font-medium text-xs">
                                  🗑️ Hapus
                                </div>
                              </button>
                              <div className="text-gray-400">
                                {expandedPlayerId === player.userId ? '▼' : '▶'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Withdrawal History */}
                        {expandedPlayerId === player.userId && (
                          <div className="border-t border-gray-500 bg-gray-700/50">
                            <div className="p-4">
                              <h4 className="text-white font-medium mb-3">📋 Riwayat Penarikan {player.userName}</h4>
                              <div className="space-y-3">
                                {player.withdrawals
                                  .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                  .map((withdrawal: any) => (
                                  <div key={withdrawal.id} className="bg-gray-600 rounded-lg p-3 border border-gray-500">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                                      <div className="text-center">
                                        <div className="text-yellow-400 font-bold text-lg">
                                          {withdrawal.amount.toLocaleString()}K
                                        </div>
                                        <div className="text-gray-400 text-xs">
                                          Rp {(withdrawal.amount * 1000).toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-blue-400 font-medium">{withdrawal.bankName}</div>
                                        <div className="font-mono text-gray-300 text-sm">{withdrawal.accountNumber}</div>
                                      </div>
                                      <div className="text-center">
                                        <button
                                          onClick={() => handleWithdrawalStatusChange(player.userId, withdrawal.id)}
                                          className={`rounded px-3 py-2 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg border-2 ${
                                            withdrawal.status === 'approved'
                                              ? 'bg-green-600/20 border-green-500/50 hover:bg-green-600/30 hover:border-green-400'
                                              : 'bg-orange-600/20 border-orange-500/50 hover:bg-orange-600/30 hover:border-orange-400'
                                          }`}
                                          title={withdrawal.status === 'approved' ? '🔄 Klik untuk ubah ke PENDING' : '✅ Klik untuk APPROVE'}
                                        >
                                          <div className="flex items-center gap-1">
                                            <div className={`font-medium text-xs ${
                                              withdrawal.status === 'approved'
                                                ? 'text-green-400'
                                                : 'text-orange-400'
                                            }`}>
                                              {withdrawal.status === 'approved' ? '✅ APPROVED' : '⏳ PENDING'}
                                            </div>
                                            <div className={`text-xs opacity-70 ${
                                              withdrawal.status === 'approved'
                                                ? 'text-green-300'
                                                : 'text-orange-300'
                                            }`}>
                                              ▼
                                            </div>
                                          </div>
                                        </button>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-white text-sm">
                                          {withdrawal.timestamp.toLocaleDateString('id-ID', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </div>
                                        <div className="text-gray-400 text-xs">
                                          {withdrawal.timestamp.toLocaleTimeString('id-ID', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-mono text-xs bg-gray-500 px-2 py-1 rounded text-gray-300">
                                          #{withdrawal.id}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <button
                                          onClick={() => handleDeleteSingleWithdrawal(player.userId, withdrawal.id, player.userName)}
                                          className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 rounded px-2 py-1 transition-colors"
                                          title="Hapus Berkas Penarikan Ini"
                                        >
                                          <div className="text-red-400 font-medium text-xs">
                                            🗑️
                                          </div>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Withdrawal Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📊</div>
                    <div>
                      <p className="text-blue-400 font-semibold">Total Penarikan</p>
                      <p className="text-white text-lg font-bold">{allWithdrawals.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-600/20 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">⏳</div>
                    <div>
                      <p className="text-orange-400 font-semibold">Pending</p>
                      <p className="text-white text-lg font-bold">{allWithdrawals.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💰</div>
                    <div>
                      <p className="text-green-400 font-semibold">Total Amount</p>
                      <p className="text-white text-lg font-bold">
                        {allWithdrawals.reduce((sum, w) => sum + w.amount, 0).toLocaleString()}K
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">👥</div>
                    <div>
                      <p className="text-purple-400 font-semibold">Unique Players</p>
                      <p className="text-white text-lg font-bold">
                        {new Set(allWithdrawals.map(w => w.userId)).size}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null}



      {/* Delete Player Modal */}
      {showDeletePlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Konfirmasi Hapus Player</h3>
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-white mb-2">
                  Anda yakin ingin menghapus player <span className="font-mono text-red-400">{deletingPlayerId}</span>?
                </p>
                <div className="text-red-300 text-sm space-y-1">
                  <p>⚠️ Tindakan ini akan menghapus:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Akun dan kredensial player</li>
                    <li>Saldo dan riwayat transaksi</li>
                    <li>Pesan chat dan log aktivitas</li>
                    <li>Semua aktivitas betting</li>
                  </ul>
                  <p className="font-semibold text-red-400 mt-2">❌ Tindakan ini tidak dapat dibatalkan!</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDeletePlayer}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDeletePlayer}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  🗑️ Hapus Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Balance Modal */}
      {showAddBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-xl font-bold text-green-400 mb-4">💰 Tambah Saldo Player</h3>
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-white mb-2">
                  Menambah saldo untuk player: <span className="font-mono text-green-400">{addingBalancePlayerId}</span>
                </p>
                <div className="text-green-300 text-sm space-y-1">
                  <p>💰 Saldo saat ini: <span className="font-bold">{currentPlayerBalance.toLocaleString()}K</span></p>
                  <p>➕ Jumlah yang akan ditambahkan:</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Nominal Saldo (dalam ribuan)
                </label>
                <input
                  type="number"
                  value={addBalanceAmount}
                  onChange={(e) => setAddBalanceAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Masukkan nominal saldo"
                  min="1"
                  step="1"
                  autoFocus
                />
                <div className="text-xs text-gray-400">
                  Saldo baru akan menjadi: <span className="font-bold text-green-400">
                    {(currentPlayerBalance + (parseFloat(addBalanceAmount) || 0)).toLocaleString()}K
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelAddBalance}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmAddBalance}
                  disabled={!addBalanceAmount || parseFloat(addBalanceAmount) <= 0}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  💰 Tambah Saldo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Balance Modal */}
      {showDeleteBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-xl font-bold text-red-400 mb-4">🗑️ Hapus Saldo Player</h3>
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-white mb-2">
                  Anda yakin ingin menghapus saldo player <span className="font-mono text-red-400">{deletingBalancePlayerId}</span>?
                </p>
                <div className="text-red-300 text-sm space-y-1">
                  <p>⚠️ Tindakan ini akan:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Mereset saldo player menjadi 0</li>
                    <li>Tidak akan mengirim notifikasi ke player</li>
                    <li>Perubahan berlaku segera</li>
                  </ul>
                  <p className="font-semibold text-yellow-400 mt-2">⚠️ Player tidak akan menerima notifikasi</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDeleteBalance}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDeleteBalance}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  🗑️ Hapus Saldo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activate Bonus Modal */}
      {showActivateBonusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-xl font-bold text-purple-400 mb-4">🎁 Aktifkan Bonus Player</h3>
            <div className="space-y-4">
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-white mb-2">
                  Memberikan bonus untuk player: <span className="font-mono text-purple-400">{activatingBonusPlayerId}</span>
                </p>
                <div className="text-purple-300 text-sm space-y-1">
                  <p>💰 Saldo saat ini: <span className="font-bold">{currentBonusPlayerBalance.toLocaleString()}K</span></p>
                  <p>🎁 Pilih nominal bonus:</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Nominal Bonus Available
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[99999, 77777, 59999, 29999, 19999, 9999, 7777, 5555, 1111].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedBonusAmount(amount)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedBonusAmount === amount
                          ? 'bg-purple-600 text-white border-2 border-purple-400'
                          : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {amount.toLocaleString()}K
                    </button>
                  ))}
                </div>
                {selectedBonusAmount > 0 && (
                  <div className="text-xs text-purple-400 bg-purple-900/20 p-2 rounded">
                    Saldo baru akan menjadi: <span className="font-bold text-purple-300">
                      {(currentBonusPlayerBalance + selectedBonusAmount).toLocaleString()}K
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelActivateBonus}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmActivateBonus}
                  disabled={selectedBonusAmount <= 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  🎁 Aktifkan Bonus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Withdrawal History Modal */}
      {showDeleteWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-xl font-bold text-red-400 mb-4">🗑️ Hapus Riwayat Withdrawal</h3>
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-white mb-2">
                  Anda yakin ingin menghapus semua riwayat withdrawal untuk player <span className="font-mono text-red-400">{deletingWithdrawalPlayerId}</span>?
                </p>
                <div className="text-red-300 text-sm space-y-1">
                  <p>⚠️ Tindakan ini akan:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Menghapus semua riwayat penarikan player ini</li>
                    <li>Data tidak dapat dikembalikan setelah dihapus</li>
                    <li>Player tidak akan menerima notifikasi</li>
                    <li>Perubahan berlaku segera</li>
                  </ul>
                  <p className="font-semibold text-yellow-400 mt-2">⚠️ Data akan hilang permanen!</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteWithdrawalModal(false);
                    setDeletingWithdrawalPlayerId('');
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteWithdrawalHistory}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  🗑️ Hapus Riwayat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Withdrawal Modal */}
      {showDeleteSingleWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-xl font-bold text-red-400 mb-4">🗑️ Hapus Berkas Penarikan</h3>
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-white mb-2">
                  Anda yakin ingin menghapus berkas penarikan ini?
                </p>
                <div className="bg-gray-700 rounded p-3 mb-3">
                  <div className="text-sm space-y-1">
                    <div className="text-gray-300">
                      <span className="text-gray-400">Player:</span> <span className="font-mono text-blue-400">{deletingSingleWithdrawal.playerName}</span> ({deletingSingleWithdrawal.playerId})
                    </div>
                    <div className="text-gray-300">
                      <span className="text-gray-400">ID Transaksi:</span> <span className="font-mono text-yellow-400">#{deletingSingleWithdrawal.withdrawalId}</span>
                    </div>
                  </div>
                </div>
                <div className="text-red-300 text-sm space-y-1">
                  <p>⚠️ Tindakan ini akan:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Menghapus berkas penarikan ini dari riwayat player</li>
                    <li>Data tidak dapat dikembalikan setelah dihapus</li>
                    <li>Player tidak akan melihat transaksi ini lagi</li>
                    <li>Perubahan berlaku segera</li>
                  </ul>
                  <p className="font-semibold text-yellow-400 mt-2">⚠️ Berkas akan hilang permanen!</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteSingleWithdrawalModal(false);
                    setDeletingSingleWithdrawal({playerId: '', withdrawalId: '', playerName: ''});
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteSingleWithdrawal}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  🗑️ Hapus Berkas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CS Announcement Management Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              📢 Kelola Pengumuman Customer Service
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Pengumuman Penting untuk Player
                </label>
                <textarea
                  value={csAnnouncement}
                  onChange={(e) => setCsAnnouncement(e.target.value)}
                  placeholder="Masukkan pengumuman penting untuk ditampilkan di halaman Customer Service..."
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-400 resize-none"
                  rows={6}
                />
                <p className="text-gray-400 text-xs mt-1">
                  Pengumuman akan ditampilkan secara real-time di halaman CS semua player
                </p>
              </div>
              
              {/* Preview */}
              {csAnnouncement && (
                <div className="mt-4">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Preview Pengumuman:
                  </label>
                  <div className="p-4 bg-gradient-to-r from-gray-700 to-gray-800 border-2 border-gray-600 rounded-lg shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">📢</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                          <span className="animate-pulse">🔴</span>
                          PENGUMUMAN PENTING
                        </h3>
                        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                          {csAnnouncement}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-600">
                <button
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    // Reset to original value if cancelled
                    loadCsAnnouncement();
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleAnnouncementClear}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  🗑️ Hapus Pengumuman
                </button>
                <button
                  onClick={handleAnnouncementUpdate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  💾 Simpan Pengumuman
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
      
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

export default AdminDashboard;
