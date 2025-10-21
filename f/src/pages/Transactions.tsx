import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  TrendingUp, 
  Wallet,
  Search,
  Receipt
} from "lucide-react";
import UsdtIcon from "@/components/ui/usdt-icon";

const Transactions = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);

  const stats = [
    {
      icon: ArrowDownToLine,
      label: "Total Deposits",
      amount: "5,750.00",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      icon: ArrowUpFromLine,
      label: "Total Withdrawals",
      amount: "2,250.00",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      icon: TrendingUp,
      label: "Total Profits",
      amount: "450.00",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      icon: Wallet,
      label: "Current Balance",
      amount: "3,950.00",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    }
  ];

  const filterTabs = [
    { value: 'all', label: 'All', count: 24 },
    { value: 'deposit', label: 'Deposits', count: 5 },
    { value: 'withdrawal', label: 'Withdrawals', count: 3 },
    { value: 'investment', label: 'Investments', count: 8 },
    { value: 'profit', label: 'Profits', count: 6 },
    { value: 'referral', label: 'Referrals', count: 1 },
    { value: 'refund', label: 'Refunds', count: 1 }
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
            <p className="text-muted-foreground mt-2">
              View all your financial activities and balance changes
            </p>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {stat.amount}
                        </span>
                        <UsdtIcon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters & Search */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    {filterTabs.map((tab) => (
                      <TabsTrigger 
                        key={tab.value} 
                        value={tab.value}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        {tab.label} ({tab.count})
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Date Filter */}
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {/* Chain Filter */}
                  <select
                    value={chainFilter}
                    onChange={(e) => setChainFilter(e.target.value)}
                    className="px-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Chains</option>
                    <option value="TRC20">TRC20</option>
                    <option value="BEP20">BEP20</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardContent className="p-6">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Receipt className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                  <p className="text-sm text-muted-foreground">
                    Your transaction history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Transaction cards will be added here */}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Transactions;
