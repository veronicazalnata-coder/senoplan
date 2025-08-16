import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

const RefreshPage = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastRefreshTime(new Date());
    
    // Simulate refresh action
    setTimeout(() => {
      setIsRefreshing(false);
      // Refresh the entire page
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            Refresh Page
          </CardTitle>
          <CardDescription className="text-gray-600">
            Klik tombol di bawah untuk refresh halaman
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <RefreshCw 
                className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh Page'}
            </Button>
          </div>
          
          {lastRefreshTime && !isRefreshing && (
            <div className="text-center text-sm text-gray-500">
              Last refreshed: {lastRefreshTime.toLocaleTimeString()}
            </div>
          )}
          
          <div className="text-center text-xs text-gray-400">
            Halaman akan di-refresh secara otomatis setelah animasi selesai
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefreshPage;
