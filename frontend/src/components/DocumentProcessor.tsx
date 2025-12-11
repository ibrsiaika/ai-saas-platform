'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Upload, 
  Download, 
  Search, 
  Eye, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  File,
  Image,
  FileSpreadsheet,
  Code,
  Brain,
  Zap
} from 'lucide-react';

interface DocumentAnalysis {
  id: string;
  fileName: string;
  fileType: string;
  size: number;
  uploadedAt: Date;
  status: 'processing' | 'completed' | 'error';
  analysis?: {
    summary: string;
    keyPoints: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    topics: string[];
    entities: Array<{ name: string; type: string; confidence: number }>;
    readabilityScore: number;
    wordCount: number;
    pageCount: number;
  };
  aiInsights?: {
    recommendations: string[];
    questions: string[];
    relatedConcepts: string[];
  };
}

export default function DocumentProcessor() {
  const [documents, setDocuments] = useState<DocumentAnalysis[]>([
    {
      id: '1',
      fileName: 'business_proposal.pdf',
      fileType: 'pdf',
      size: 2048000,
      uploadedAt: new Date(),
      status: 'completed',
      analysis: {
        summary: 'A comprehensive business proposal outlining a new SaaS platform for document management and AI analysis.',
        keyPoints: [
          'Market opportunity worth $2.5B annually',
          'Competitive advantage through AI integration',
          'Projected 300% ROI within 24 months',
          'Requires $500K initial investment'
        ],
        sentiment: 'positive',
        topics: ['Business', 'Technology', 'Investment', 'SaaS'],
        entities: [
          { name: 'DocuAI Inc.', type: 'Organization', confidence: 0.95 },
          { name: 'John Smith', type: 'Person', confidence: 0.89 },
          { name: '$500,000', type: 'Money', confidence: 0.97 }
        ],
        readabilityScore: 82,
        wordCount: 2450,
        pageCount: 12
      },
      aiInsights: {
        recommendations: [
          'Consider adding more market research data',
          'Include competitive analysis section',
          'Provide detailed financial projections'
        ],
        questions: [
          'What is the customer acquisition strategy?',
          'How will you handle data privacy compliance?',
          'What are the key risk factors?'
        ],
        relatedConcepts: ['Machine Learning', 'Document Management', 'Cloud Computing', 'Enterprise Software']
      }
    }
  ]);

  const [selectedDocument, setSelectedDocument] = useState<string>('1');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-600" />;
      case 'doc': 
      case 'docx': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'xlsx':
      case 'xls': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'jpg':
      case 'png':
      case 'gif': return <Image className="w-5 h-5 text-purple-600" />;
      case 'js':
      case 'ts':
      case 'py': return <Code className="w-5 h-5 text-orange-600" />;
      default: return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Add new document
          const newDoc: DocumentAnalysis = {
            id: Date.now().toString(),
            fileName: file.name,
            fileType: file.name.split('.').pop() || '',
            size: file.size,
            uploadedAt: new Date(),
            status: 'processing'
          };
          
          setDocuments(prev => [...prev, newDoc]);
          setSelectedDocument(newDoc.id);
          
          // Simulate processing completion
          setTimeout(() => {
            setDocuments(prev => prev.map(doc => 
              doc.id === newDoc.id 
                ? { ...doc, status: 'completed' as const }
                : doc
            ));
          }, 3000);
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const currentDocument = documents.find(doc => doc.id === selectedDocument);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
          Document Processor
        </h1>
        <p className="text-gray-600 text-lg">
          AI-powered document analysis with intelligent insights and processing
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Documents</h3>
              <p className="text-gray-600 mb-4">
                Support for PDF, Word, Excel, PowerPoint, and image files
              </p>
              <Button onClick={triggerFileUpload} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Choose Files'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png,.gif"
                className="hidden"
              />
            </div>
            {isUploading && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processed</p>
                <p className="text-2xl font-bold">{documents.filter(d => d.status === 'completed').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold">{documents.filter(d => d.status === 'processing').length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold">
                  {formatFileSize(documents.reduce((sum, doc) => sum + doc.size, 0))}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="lg:col-span-1">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto">
              {documents.map(document => (
                <div
                  key={document.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDocument === document.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedDocument(document.id)}
                >
                  <div className="flex items-start gap-3">
                    {getFileIcon(document.fileType)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{document.fileName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(document.status)}
                        <span className="text-xs text-gray-500 capitalize">
                          {document.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(document.size)} • {document.uploadedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Document Analysis */}
        <div className="lg:col-span-2">
          {currentDocument ? (
            <Card className="h-[600px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getFileIcon(currentDocument.fileType)}
                    {currentDocument.fileName}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto">
                {currentDocument.status === 'processing' ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-lg font-medium mb-2">Processing Document</h3>
                    <p className="text-gray-600">AI is analyzing your document...</p>
                  </div>
                ) : currentDocument.analysis ? (
                  <Tabs defaultValue="summary" className="h-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="insights">AI Insights</TabsTrigger>
                      <TabsTrigger value="entities">Entities</TabsTrigger>
                      <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="space-y-4 mt-4">
                      <div>
                        <h3 className="font-medium mb-2">Summary</h3>
                        <p className="text-gray-700 leading-relaxed">
                          {currentDocument.analysis.summary}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Key Points</h3>
                        <ul className="space-y-2">
                          {currentDocument.analysis.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Topics</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentDocument.analysis.topics.map((topic, index) => (
                            <Badge key={index} variant="outline">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="insights" className="space-y-4 mt-4">
                      {currentDocument.aiInsights && (
                        <>
                          <div>
                            <h3 className="font-medium mb-2 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              AI Recommendations
                            </h3>
                            <ul className="space-y-2">
                              {currentDocument.aiInsights.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h3 className="font-medium mb-2">Generated Questions</h3>
                            <ul className="space-y-2">
                              {currentDocument.aiInsights.questions.map((question, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-blue-600 font-medium">Q:</span>
                                  <span className="text-gray-700">{question}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h3 className="font-medium mb-2">Related Concepts</h3>
                            <div className="flex flex-wrap gap-2">
                              {currentDocument.aiInsights.relatedConcepts.map((concept, index) => (
                                <Badge key={index} variant="secondary">{concept}</Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="entities" className="space-y-4 mt-4">
                      <div>
                        <h3 className="font-medium mb-2">Named Entities</h3>
                        <div className="space-y-3">
                          {currentDocument.analysis.entities.map((entity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <span className="font-medium">{entity.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {entity.type}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600">
                                  {(entity.confidence * 100).toFixed(0)}% confidence
                                </div>
                                <Progress 
                                  value={entity.confidence * 100} 
                                  className="w-20 h-2 mt-1" 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="metrics" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {currentDocument.analysis.wordCount.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">Words</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {currentDocument.analysis.pageCount}
                            </p>
                            <p className="text-sm text-gray-600">Pages</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-purple-600">
                              {currentDocument.analysis.readabilityScore}
                            </p>
                            <p className="text-sm text-gray-600">Readability Score</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className={`text-2xl font-bold ${
                              currentDocument.analysis.sentiment === 'positive' ? 'text-green-600' :
                              currentDocument.analysis.sentiment === 'negative' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {currentDocument.analysis.sentiment}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">Sentiment</p>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Processing Failed</h3>
                    <p className="text-gray-600">Unable to process this document</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a document to view analysis</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}