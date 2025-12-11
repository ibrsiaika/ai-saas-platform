'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { 
  Bot, 
  Brain, 
  Cpu, 
  DollarSign, 
  Zap, 
  Settings, 
  BarChart3, 
  MessageSquare, 
  Sparkles,
  Clock,
  TrendingDown,
  TrendingUp,
  Shield
} from 'lucide-react';

interface AIProvider {
  provider: string;
  config: {
    name: string;
    models: string[];
    pricing: {
      inputTokens: number;
      outputTokens: number;
    };
    capabilities: {
      chat: boolean;
      completion: boolean;
      embeddings: boolean;
      vision: boolean;
      functionCalling: boolean;
      streaming: boolean;
    };
  };
  available: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
  responseTime?: number;
}

interface CostEstimate {
  provider: string;
  estimatedCost: number;
}

export default function MultiAIInterface() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [costPriority, setCostPriority] = useState<'lowest' | 'balanced' | 'performance'>('balanced');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [costEstimates, setCostEstimates] = useState<CostEstimate[]>([]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  // Load providers on component mount
  useEffect(() => {
    loadProviders();
  }, []);

  // Get cost estimates when message changes
  useEffect(() => {
    if (message && message.length > 10) {
      estimateCosts();
    }
  }, [message, conversation]);

  const loadProviders = async () => {
    try {
      const data = await api.getProviders();
      setProviders(data);
      
      // Set default provider
      const availableProvider = data.find((p: AIProvider) => p.available);
      if (availableProvider) {
        setSelectedProvider(availableProvider.provider);
        setSelectedModel(availableProvider.config.models[0]);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const estimateCosts = async () => {
    try {
      const estimates = await api.getCostEstimate({
        message,
        conversation,
        provider: selectedProvider,
        model: selectedModel
      });
      setCostEstimates(estimates);
    } catch (error) {
      console.error('Failed to estimate costs:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    const userMessage: ChatMessage = { role: 'user', content: message };
    setConversation(prev => [...prev, userMessage]);
    setMessage('');

    try {
      const data = await api.sendChatMessage({
        message,
        conversation,
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
        costPriority
      });
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        provider: data.provider,
        model: data.model,
        usage: data.usage,
        responseTime: data.responseTime
      };

      setConversation(prev => [...prev, assistantMessage]);
      setTotalCost(prev => prev + (data.usage?.totalCost || 0));
      setTotalTokens(prev => prev + (data.usage?.inputTokens || 0) + (data.usage?.outputTokens || 0));

    } catch (error) {
      console.error('Failed to send message:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return <Bot className="w-4 h-4" />;
      case 'anthropic': return <Brain className="w-4 h-4" />;
      case 'google': return <Sparkles className="w-4 h-4" />;
      case 'ollama': return <Cpu className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-100 text-green-800';
      case 'anthropic': return 'bg-purple-100 text-purple-800';
      case 'google': return 'bg-blue-100 text-blue-800';
      case 'ollama': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedProviderConfig = providers.find(p => p.provider === selectedProvider)?.config;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Multi-AI Platform
        </h1>
        <p className="text-gray-600 text-lg">
          Intelligent AI routing with cost optimization and multi-provider support
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tokens</p>
                <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Providers</p>
                <p className="text-2xl font-bold">{providers.filter(p => p.available).length}</p>
              </div>
              <Cpu className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messages</p>
                <p className="text-2xl font-bold">{conversation.filter(m => m.role === 'user').length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Multi-AI Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Conversation */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                {conversation.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === 'assistant' && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {msg.provider && (
                            <Badge className={getProviderColor(msg.provider)}>
                              {getProviderIcon(msg.provider)}
                              {msg.provider}
                            </Badge>
                          )}
                          {msg.model && (
                            <Badge variant="outline">{msg.model}</Badge>
                          )}
                          {msg.usage && (
                            <Badge variant="outline">
                              ${msg.usage.totalCost.toFixed(4)}
                            </Badge>
                          )}
                          {msg.responseTime && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {msg.responseTime}ms
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border shadow-sm p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-500">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isLoading || !message.trim()}
                  className="self-end"
                >
                  <Zap className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings and Providers Panel */}
        <div className="space-y-6">
          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                AI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Provider</label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto (Smart Routing)</SelectItem>
                    {providers.filter(p => p.available).map(provider => (
                      <SelectItem key={provider.provider} value={provider.provider}>
                        <div className="flex items-center gap-2">
                          {getProviderIcon(provider.provider)}
                          {provider.config.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProviderConfig && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Model</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProviderConfig.models.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Cost Priority</label>
                <Select value={costPriority} onValueChange={(value: any) => setCostPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lowest">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-green-600" />
                        Lowest Cost
                      </div>
                    </SelectItem>
                    <SelectItem value="balanced">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        Balanced
                      </div>
                    </SelectItem>
                    <SelectItem value="performance">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        Best Performance
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Max Tokens</label>
                <Input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  min="1"
                  max="4000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cost Estimates */}
          {costEstimates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Cost Estimates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {costEstimates
                    .sort((a, b) => a.estimatedCost - b.estimatedCost)
                    .map(estimate => (
                      <div
                        key={estimate.provider}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          {getProviderIcon(estimate.provider)}
                          <span className="capitalize">{estimate.provider}</span>
                        </div>
                        <Badge variant="outline">
                          ${estimate.estimatedCost.toFixed(4)}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Provider Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {providers.map(provider => (
                  <div key={provider.provider} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(provider.provider)}
                      <span className="font-medium">{provider.config.name}</span>
                    </div>
                    <Badge className={provider.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {provider.available ? 'Available' : 'Offline'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}