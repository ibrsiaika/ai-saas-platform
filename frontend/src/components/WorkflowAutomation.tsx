'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Code, 
  BarChart3, 
  Settings, 
  Download,
  Upload,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'document' | 'code' | 'analysis' | 'ai' | 'custom';
  status: 'pending' | 'running' | 'completed' | 'error';
  config: any;
  output?: any;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'running' | 'completed' | 'error';
  created: Date;
  lastRun?: Date;
}

export default function WorkflowAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'Document Analysis Pipeline',
      description: 'Automated document processing with AI analysis and summary generation',
      steps: [
        { id: '1', name: 'Document Upload', type: 'document', status: 'completed', config: {} },
        { id: '2', name: 'Text Extraction', type: 'document', status: 'completed', config: {} },
        { id: '3', name: 'AI Analysis', type: 'ai', status: 'running', config: {} },
        { id: '4', name: 'Summary Generation', type: 'ai', status: 'pending', config: {} },
        { id: '5', name: 'Report Export', type: 'document', status: 'pending', config: {} }
      ],
      status: 'running',
      created: new Date(),
      lastRun: new Date()
    },
    {
      id: '2',
      name: 'Code Generation Workflow',
      description: 'Automated code generation from specifications with testing and documentation',
      steps: [
        { id: '1', name: 'Requirements Analysis', type: 'ai', status: 'completed', config: {} },
        { id: '2', name: 'Code Generation', type: 'code', status: 'completed', config: {} },
        { id: '3', name: 'Unit Test Creation', type: 'code', status: 'completed', config: {} },
        { id: '4', name: 'Documentation', type: 'ai', status: 'pending', config: {} }
      ],
      status: 'draft',
      created: new Date(),
    }
  ]);

  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('1');
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-4 h-4" />;
      case 'code': return <Code className="w-4 h-4" />;
      case 'analysis': return <BarChart3 className="w-4 h-4" />;
      case 'ai': return <Zap className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const runWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId 
        ? { ...w, status: 'running' as const, lastRun: new Date() }
        : w
    ));
  };

  const pauseWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId 
        ? { ...w, status: 'draft' as const }
        : w
    ));
  };

  const createWorkflow = () => {
    if (!newWorkflowName.trim()) return;

    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: newWorkflowName,
      description: newWorkflowDescription,
      steps: [],
      status: 'draft',
      created: new Date()
    };

    setWorkflows(prev => [...prev, newWorkflow]);
    setNewWorkflowName('');
    setNewWorkflowDescription('');
  };

  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Workflow Automation
        </h1>
        <p className="text-gray-600 text-lg">
          Build and execute powerful automation workflows with AI integration
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Workflows</p>
                <p className="text-2xl font-bold">{workflows.length}</p>
              </div>
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Running</p>
                <p className="text-2xl font-bold">{workflows.filter(w => w.status === 'running').length}</p>
              </div>
              <Play className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{workflows.filter(w => w.status === 'completed').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">94%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <div className="lg:col-span-1">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Workflows</span>
                <Button size="sm" onClick={() => setSelectedWorkflow('')}>
                  <FileText className="w-4 h-4 mr-2" />
                  New
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflows.map(workflow => (
                <div
                  key={workflow.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedWorkflow === workflow.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedWorkflow(workflow.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium truncate">{workflow.name}</h3>
                    <Badge className={getStatusColor(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {workflow.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{workflow.steps.length} steps</span>
                    <span>{workflow.created.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Workflow Details */}
        <div className="lg:col-span-2">
          {selectedWorkflow === '' ? (
            /* Create New Workflow */
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>Create New Workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Workflow Name</label>
                  <Input
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="Enter workflow name..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={newWorkflowDescription}
                    onChange={(e) => setNewWorkflowDescription(e.target.value)}
                    placeholder="Describe what this workflow does..."
                    rows={4}
                  />
                </div>
                <Button onClick={createWorkflow} disabled={!newWorkflowName.trim()}>
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : currentWorkflow ? (
            /* Workflow Details */
            <Card className="h-[600px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentWorkflow.name}</CardTitle>
                  <div className="flex gap-2">
                    {currentWorkflow.status === 'running' ? (
                      <Button size="sm" variant="outline" onClick={() => pauseWorkflow(currentWorkflow.id)}>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => runWorkflow(currentWorkflow.id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Run
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="steps" className="h-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="steps">Steps</TabsTrigger>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                    <TabsTrigger value="results">Results</TabsTrigger>
                  </TabsList>

                  <TabsContent value="steps" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      {currentWorkflow.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium">
                              {index + 1}
                            </span>
                            {getStepIcon(step.type)}
                            <span className="font-medium">{step.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {step.type}
                            </Badge>
                            {getStatusIcon(step.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="config" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Execution Mode</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Sequential" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sequential">Sequential</SelectItem>
                            <SelectItem value="parallel">Parallel</SelectItem>
                            <SelectItem value="conditional">Conditional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Retry Policy</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="3 Attempts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No Retry</SelectItem>
                            <SelectItem value="3">3 Attempts</SelectItem>
                            <SelectItem value="5">5 Attempts</SelectItem>
                            <SelectItem value="10">10 Attempts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="results" className="space-y-4 mt-4">
                    <div className="text-center text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Results will appear here after workflow execution</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}