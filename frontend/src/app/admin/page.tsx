'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  status: string;
  joinDate: string;
  lastActive: string;
  usage: {
    aiRequests: number;
    vectorStorage: number;
    chatRooms: number;
  };
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  planDistribution: {
    basic: number;
    pro: number;
    enterprise: number;
  };
  usageStats: {
    totalAIRequests: number;
    totalVectorStorage: number;
    totalChatRooms: number;
  };
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = () => {
    // Simulated admin data - in real app, fetch from backend
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'john@example.com',
        name: 'John Smith',
        plan: 'pro',
        status: 'active',
        joinDate: '2024-01-15',
        lastActive: '2024-09-18',
        usage: { aiRequests: 45000, vectorStorage: 850, chatRooms: 12 }
      },
      {
        id: '2',
        email: 'sarah@company.com',
        name: 'Sarah Johnson',
        plan: 'enterprise',
        status: 'active',
        joinDate: '2023-11-20',
        lastActive: '2024-09-17',
        usage: { aiRequests: 125000, vectorStorage: 2500, chatRooms: 35 }
      },
      {
        id: '3',
        email: 'mike@startup.io',
        name: 'Mike Wilson',
        plan: 'basic',
        status: 'inactive',
        joinDate: '2024-03-10',
        lastActive: '2024-08-22',
        usage: { aiRequests: 8500, vectorStorage: 150, chatRooms: 3 }
      },
      {
        id: '4',
        email: 'emma@design.co',
        name: 'Emma Davis',
        plan: 'pro',
        status: 'active',
        joinDate: '2024-02-05',
        lastActive: '2024-09-18',
        usage: { aiRequests: 67000, vectorStorage: 1200, chatRooms: 18 }
      },
      {
        id: '5',
        email: 'alex@techcorp.com',
        name: 'Alex Chen',
        plan: 'enterprise',
        status: 'active',
        joinDate: '2023-09-12',
        lastActive: '2024-09-18',
        usage: { aiRequests: 89000, vectorStorage: 3200, chatRooms: 28 }
      }
    ];

    const mockStats: SystemStats = {
      totalUsers: 1247,
      activeUsers: 892,
      totalRevenue: 87350,
      planDistribution: {
        basic: 456,
        pro: 623,
        enterprise: 168
      },
      usageStats: {
        totalAIRequests: 2450000,
        totalVectorStorage: 125000,
        totalChatRooms: 4580
      }
    };

    setUsers(mockUsers);
    setSystemStats(mockStats);
    setLoading(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || user.plan === selectedPlan;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const handleSuspendUser = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'suspended' : 'active' }
        : user
    ));
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Loading admin dashboard...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage users, monitor system performance, and oversee platform operations
          </p>
        </div>

        {/* System Overview Cards */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{systemStats.totalUsers.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">
                {systemStats.activeUsers} active ({Math.round((systemStats.activeUsers / systemStats.totalUsers) * 100)}%)
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Revenue</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">${systemStats.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">Monthly recurring revenue</p>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">AI Requests</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{(systemStats.usageStats.totalAIRequests / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-gray-600 mt-1">This month</p>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Storage Used</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">{Math.round(systemStats.usageStats.totalVectorStorage / 1000)}K</p>
              <p className="text-sm text-gray-600 mt-1">Documents stored</p>
            </Card>
          </div>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System Status</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 lg:mb-0">
                  User Management
                </h2>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64"
                  />
                  
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Plan</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Usage</th>
                      <th className="text-left py-3 px-4">Last Active</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getPlanColor(user.plan)}>
                            {user.plan}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p>AI: {user.usage.aiRequests.toLocaleString()}</p>
                            <p>Storage: {user.usage.vectorStorage}</p>
                            <p>Rooms: {user.usage.chatRooms}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(user.lastActive).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSuspendUser(user.id)}
                            >
                              {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Plan Distribution</h3>
                {systemStats && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Basic Plan</span>
                      <span className="font-medium">{systemStats.planDistribution.basic} users</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Pro Plan</span>
                      <span className="font-medium">{systemStats.planDistribution.pro} users</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Enterprise</span>
                      <span className="font-medium">{systemStats.planDistribution.enterprise} users</span>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Usage Metrics</h3>
                {systemStats && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Total AI Requests</span>
                      <span className="font-medium">{(systemStats.usageStats.totalAIRequests / 1000000).toFixed(1)}M</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Documents Stored</span>
                      <span className="font-medium">{systemStats.usageStats.totalVectorStorage.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Chat Rooms</span>
                      <span className="font-medium">{systemStats.usageStats.totalChatRooms}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* System Status Tab */}
          <TabsContent value="system">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Service Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Frontend Service</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Backend API</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Payment Service</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Vector Database</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>AI Service</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Monitoring</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                </div>
              </Card>

              <Alert>
                <AlertDescription>
                  All systems are operational. Last health check: {new Date().toLocaleString()}
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Platform Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Users per Plan
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input placeholder="Basic Plan Limit" defaultValue="10000" />
                    <Input placeholder="Pro Plan Limit" defaultValue="100000" />
                    <Input placeholder="Enterprise Limit" defaultValue="Unlimited" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Maintenance Mode
                  </label>
                  <Button variant="outline">Enable Maintenance Mode</Button>
                </div>
                
                <div className="pt-4">
                  <Button>Save Settings</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;