'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Target,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Settings,
  Download,
  Calendar
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Cell, Pie, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface UsageAnalytics {
  totalCost: number;
  totalTokens: number;
  avgResponseTime: number;
  totalRequests: number;
  providerBreakdown: Record<string, { cost: number; tokens: number; requests: number }>;
  dailyUsage: Array<{ date: string; cost: number; tokens: number; requests: number }>;
  costPerToken: number;
}

interface OptimizationRecommendation {
  type: 'provider_switch' | 'model_downgrade' | 'bulk_processing' | 'cache_hit' | 'budget_alert';
  message: string;
  potentialSavings: number;
  confidence: number;
  actionable: boolean;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

export default function CostOptimization() {
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(100);
  const [budgetUsed, setBudgetUsed] = useState(67.5);
  const [optimizationEnabled, setOptimizationEnabled] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Simulate loading analytics data
    const mockAnalytics: UsageAnalytics = {
      totalCost: 67.50,
      totalTokens: 2500000,
      avgResponseTime: 1250,
      totalRequests: 1847,
      costPerToken: 0.000027,
      providerBreakdown: {
        'openai': { cost: 42.30, tokens: 1500000, requests: 980 },
        'anthropic': { cost: 18.20, tokens: 700000, requests: 540 },
        'google': { cost: 5.80, tokens: 250000, requests: 230 },
        'ollama': { cost: 1.20, tokens: 50000, requests: 97 }
      },
      dailyUsage: [
        { date: '2024-01-01', cost: 2.3, tokens: 85000, requests: 67 },
        { date: '2024-01-02', cost: 3.1, tokens: 115000, requests: 89 },
        { date: '2024-01-03', cost: 2.8, tokens: 102000, requests: 74 },
        { date: '2024-01-04', cost: 4.2, tokens: 155000, requests: 123 },
        { date: '2024-01-05', cost: 3.7, tokens: 138000, requests: 98 },
        { date: '2024-01-06', cost: 2.9, tokens: 107000, requests: 81 },
        { date: '2024-01-07', cost: 3.5, tokens: 128000, requests: 95 }
      ]
    };

    const mockRecommendations: OptimizationRecommendation[] = [
      {
        type: 'provider_switch',
        message: 'Switch 30% of your requests to Google Gemini to save 23% on costs',
        potentialSavings: 15.53,
        confidence: 0.89,
        actionable: true
      },
      {
        type: 'bulk_processing',
        message: 'Process similar requests in batches to save 12% on total costs',
        potentialSavings: 8.10,
        confidence: 0.76,
        actionable: true
      },
      {
        type: 'cache_hit',
        message: 'Enable response caching to save 8% on repeated queries',
        potentialSavings: 5.40,
        confidence: 0.92,
        actionable: true
      },
      {
        type: 'budget_alert',
        message: 'You\'ve used 67.5% of your monthly budget',
        potentialSavings: 0,
        confidence: 1.0,
        actionable: false
      }
    ];

    setAnalytics(mockAnalytics);
    setRecommendations(mockRecommendations);
  }, []);

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'provider_switch': return <TrendingDown className="w-4 h-4" />;
      case 'bulk_processing': return <BarChart3 className="w-4 h-4" />;
      case 'cache_hit': return <Target className="w-4 h-4" />;
      case 'budget_alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'provider_switch': return 'bg-blue-100 text-blue-800';
      case 'bulk_processing': return 'bg-green-100 text-green-800';
      case 'cache_hit': return 'bg-purple-100 text-purple-800';
      case 'budget_alert': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pieChartData = analytics ? Object.entries(analytics.providerBreakdown).map(([provider, data]) => ({
    name: provider,
    value: data.cost,
    tokens: data.tokens,
    requests: data.requests
  })) : [];

  const totalPotentialSavings = recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);

  if (!analytics) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Cost Optimization
        </h1>
        <p className="text-gray-600 text-lg">
          Smart cost management and optimization for your AI platform usage
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Spend</p>
                <p className="text-2xl font-bold">${analytics.totalCost.toFixed(2)}</p>
                <p className="text-xs text-gray-500">of ${monthlyBudget} budget</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <Progress value={budgetUsed} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Potential Savings</p>
                <p className="text-2xl font-bold text-green-600">${totalPotentialSavings.toFixed(2)}</p>
                <p className="text-xs text-gray-500">
                  {((totalPotentialSavings / analytics.totalCost) * 100).toFixed(1)}% reduction
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cost per Token</p>
                <p className="text-2xl font-bold">${analytics.costPerToken.toFixed(6)}</p>
                <p className="text-xs text-gray-500">avg across providers</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Efficiency Score</p>
                <p className="text-2xl font-bold text-purple-600">87%</p>
                <p className="text-xs text-gray-500">optimization level</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommendations */}
        <div className="lg:col-span-1">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getRecommendationColor(rec.type)}`}>
                      {getRecommendationIcon(rec.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{rec.message}</p>
                      {rec.potentialSavings > 0 && (
                        <p className="text-green-600 font-semibold mt-1">
                          Save ${rec.potentialSavings.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Confidence:</span>
                      <Progress value={rec.confidence * 100} className="w-16 h-2" />
                      <span className="text-xs text-gray-600">
                        {(rec.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    {rec.actionable && (
                      <Button size="sm" variant="outline">
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Usage Analytics
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    Last 30 days
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="usage" className="h-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="usage">Usage Trends</TabsTrigger>
                  <TabsTrigger value="providers">Provider Breakdown</TabsTrigger>
                  <TabsTrigger value="optimization">Optimization Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="usage" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Daily Cost Trend</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={analytics.dailyUsage}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="cost" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Token Usage</h3>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={analytics.dailyUsage}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="tokens" stroke="#8B5CF6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="providers" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-4">Cost Distribution</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPieChart>
                          <Pie
                            data={pieChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Provider Performance</h3>
                      {Object.entries(analytics.providerBreakdown).map(([provider, data]) => (
                        <div key={provider} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{provider}</span>
                            <Badge variant="outline">${data.cost.toFixed(2)}</Badge>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Tokens: {data.tokens.toLocaleString()}</div>
                            <div>Requests: {data.requests}</div>
                            <div>Cost/Token: ${(data.cost / data.tokens).toFixed(6)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="optimization" className="mt-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-4">Optimization Settings</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Monthly Budget</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">$</span>
                            <input
                              type="number"
                              value={monthlyBudget}
                              onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                              className="flex-1 px-2 py-1 border rounded text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Cost Priority</label>
                          <select className="w-full px-2 py-1 border rounded text-sm">
                            <option value="lowest">Lowest Cost</option>
                            <option value="balanced">Balanced</option>
                            <option value="performance">Best Performance</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Optimization Features</h3>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Auto Optimization</p>
                          <p className="text-xs text-gray-600">Automatically route to most cost-effective providers</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={optimizationEnabled}
                          onChange={(e) => setOptimizationEnabled(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Response Caching</p>
                          <p className="text-xs text-gray-600">Cache similar requests to reduce costs</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Bulk Processing</p>
                          <p className="text-xs text-gray-600">Batch similar requests for volume discounts</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Budget Alerts</p>
                          <p className="text-xs text-gray-600">Get notified when approaching budget limits</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}