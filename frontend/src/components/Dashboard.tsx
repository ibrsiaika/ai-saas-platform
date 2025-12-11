'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import MultiAIInterface from '@/components/MultiAIInterface';
import WorkflowAutomation from '@/components/WorkflowAutomation';
import DocumentProcessor from '@/components/DocumentProcessor';
import CostOptimization from '@/components/CostOptimization';
import { 
  Bot, 
  Brain, 
  FileText, 
  Workflow, 
  DollarSign, 
  Settings, 
  Menu, 
  X,
  Sparkles,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';

type TabType = 'chat' | 'workflows' | 'documents' | 'optimization' | 'overview';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-blue-600' },
    { id: 'chat', label: 'Multi-AI Chat', icon: Bot, color: 'text-purple-600' },
    { id: 'workflows', label: 'Workflows', icon: Workflow, color: 'text-green-600' },
    { id: 'documents', label: 'Documents', icon: FileText, color: 'text-orange-600' },
    { id: 'optimization', label: 'Cost Optimization', icon: DollarSign, color: 'text-red-600' }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'chat':
        return <MultiAIInterface />;
      case 'workflows':
        return <WorkflowAutomation />;
      case 'documents':
        return <DocumentProcessor />;
      case 'optimization':
        return <CostOptimization />;
      default:
        return <DashboardOverview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-full bg-surface border-r border-border shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">AI Platform</h1>
                <p className="text-xs text-text-muted">Multi-AI Solutions</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-border hover:text-text-primary'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Stats */}
          <div className="p-4 space-y-4">
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Quick Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">This Month</span>
                  <span className="font-medium">$67.50</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Requests</span>
                  <span className="font-medium">1,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Providers</span>
                  <span className="font-medium">4 Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-surface">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h1 className="font-bold text-lg">AI Platform</h1>
          <ThemeToggle />
        </div>

        {/* Content */}
        <main className="min-h-screen">
          {renderActiveTab()}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function DashboardOverview({ setActiveTab }: { setActiveTab: (tab: TabType) => void }) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Welcome to Your AI Platform
        </h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          Harness the power of multiple AI providers with intelligent routing, cost optimization, and advanced workflow automation
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="cursor-pointer" onClick={() => setActiveTab('optimization')}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm font-medium">Total Spend</p>
                  <p className="text-3xl font-bold text-primary">$67.50</p>
                  <p className="text-green-600 text-sm">↓ 15% vs last month</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="cursor-pointer" onClick={() => setActiveTab('chat')}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm font-medium">AI Requests</p>
                  <p className="text-3xl font-bold text-primary">1,847</p>
                  <p className="text-blue-600 text-sm">↑ 23% vs last month</p>
                </div>
                <Bot className="w-12 h-12 text-blue-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="cursor-pointer" onClick={() => setActiveTab('workflows')}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm font-medium">Workflows</p>
                  <p className="text-3xl font-bold text-primary">12</p>
                  <p className="text-purple-600 text-sm">3 running now</p>
                </div>
                <Workflow className="w-12 h-12 text-purple-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="cursor-pointer" onClick={() => setActiveTab('documents')}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm font-medium">Documents</p>
                  <p className="text-3xl font-bold text-primary">156</p>
                  <p className="text-orange-600 text-sm">89% processed</p>
                </div>
                <FileText className="w-12 h-12 text-orange-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Multi-AI Provider Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">
              Leverage multiple AI providers with intelligent routing and automatic fallback for maximum reliability and cost efficiency.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">OpenAI GPT-4</Badge>
              <Badge variant="outline">Anthropic Claude</Badge>
              <Badge variant="outline">Google Gemini</Badge>
              <Badge variant="outline">Local Ollama</Badge>
            </div>
            <Button onClick={() => setActiveTab('chat')} className="w-full">
              <Zap className="w-4 h-4 mr-2" />
              Try Multi-AI Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Smart Cost Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">
              Automatic cost optimization with usage analytics, intelligent model selection, and bulk pricing benefits.
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Potential Savings</span>
                <span className="font-semibold text-green-600">$29.10</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Efficiency Score</span>
                <span className="font-semibold text-blue-600">87%</span>
              </div>
            </div>
            <Button onClick={() => setActiveTab('optimization')} variant="outline" className="w-full">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Optimization
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={() => setActiveTab('chat')} 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Bot className="w-8 h-8 text-blue-600" />
              <span>Start AI Chat</span>
            </Button>
            
            <Button 
              onClick={() => setActiveTab('workflows')} 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Workflow className="w-8 h-8 text-purple-600" />
              <span>Create Workflow</span>
            </Button>
            
            <Button 
              onClick={() => setActiveTab('documents')} 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <FileText className="w-8 h-8 text-orange-600" />
              <span>Upload Document</span>
            </Button>
            
            <Button 
              onClick={() => setActiveTab('optimization')} 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Target className="w-8 h-8 text-green-600" />
              <span>Optimize Costs</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}