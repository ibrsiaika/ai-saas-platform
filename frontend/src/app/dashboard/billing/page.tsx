'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SubscriptionData {
  status: string;
  plan: {
    name: string;
    price: number;
    features: string[];
  } | null;
  currentPeriodEnd: Date | null;
  customerId: string;
  subscriptionId: string;
}

interface UsageData {
  aiRequests: {
    used: number;
    limit: number;
    resetDate: Date;
  };
  vectorStorage: {
    used: number;
    limit: number;
    resetDate: Date | null;
  };
  chatRooms: {
    used: number;
    limit: number;
    resetDate: Date | null;
  };
}

const BillingPage = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const userId = localStorage.getItem('userId') || 'demo-user';
      
      // Fetch subscription data
      const subResponse = await fetch(`http://localhost:3003/api/subscription/${userId}`);
      const subData = await subResponse.json();
      setSubscription(subData);

      // Fetch usage data
      const usageResponse = await fetch(`http://localhost:3003/api/usage/${userId}`);
      const usageData = await usageResponse.json();
      setUsage(usageData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!subscription?.customerId) {
      alert('No active subscription found');
      return;
    }

    try {
      const response = await fetch('http://localhost:3003/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: subscription.customerId
        }),
      });

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Loading billing information...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Billing & Usage
          </h1>
          <p className="text-gray-600">
            Manage your subscription and monitor your usage
          </p>
        </div>

        {/* Current Subscription */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current Subscription
          </h2>
          
          {subscription?.plan ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {subscription.plan.name}
                  </h3>
                  <p className="text-gray-600">
                    ${subscription.plan.price}/month
                  </p>
                </div>
                <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                  {subscription.status}
                </Badge>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Plan Features:</h4>
                <ul className="space-y-1">
                  {subscription.plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              {subscription.currentPeriodEnd && (
                <div className="text-sm text-gray-600">
                  Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              )}
              
              <div className="flex space-x-4">
                <Button onClick={handleManageBilling}>
                  Manage Billing
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
                  Change Plan
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No active subscription found</p>
              <Button onClick={() => window.location.href = '/pricing'}>
                Choose a Plan
              </Button>
            </div>
          )}
        </Card>

        {/* Usage Statistics */}
        {usage && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Usage This Month
            </h2>
            
            <div className="space-y-6">
              {/* AI Requests */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">AI Requests</h3>
                  <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usage.aiRequests.used, usage.aiRequests.limit))}`}>
                    {usage.aiRequests.used.toLocaleString()} / {usage.aiRequests.limit === -1 ? 'Unlimited' : usage.aiRequests.limit.toLocaleString()}
                  </span>
                </div>
                {usage.aiRequests.limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(usage.aiRequests.used, usage.aiRequests.limit)} 
                    className="h-2"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Resets on {new Date(usage.aiRequests.resetDate).toLocaleDateString()}
                </p>
              </div>

              {/* Vector Storage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Vector Storage</h3>
                  <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usage.vectorStorage.used, usage.vectorStorage.limit))}`}>
                    {usage.vectorStorage.used.toLocaleString()} / {usage.vectorStorage.limit === -1 ? 'Unlimited' : `${usage.vectorStorage.limit.toLocaleString()} documents`}
                  </span>
                </div>
                {usage.vectorStorage.limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(usage.vectorStorage.used, usage.vectorStorage.limit)} 
                    className="h-2"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Storage usage (does not reset monthly)
                </p>
              </div>

              {/* Chat Rooms */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Active Chat Rooms</h3>
                  <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usage.chatRooms.used, usage.chatRooms.limit))}`}>
                    {usage.chatRooms.used} / {usage.chatRooms.limit === -1 ? 'Unlimited' : usage.chatRooms.limit}
                  </span>
                </div>
                {usage.chatRooms.limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(usage.chatRooms.used, usage.chatRooms.limit)} 
                    className="h-2"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Currently active chat rooms
                </p>
              </div>
            </div>

            {/* Usage Alerts */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Usage Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Monitor your usage to avoid unexpected overages</li>
                <li>• Upgrade your plan if you consistently hit limits</li>
                <li>• Contact support for custom enterprise pricing</li>
              </ul>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BillingPage;