'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const BlogPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const blogPosts = [
    {
      id: 1,
      title: 'The Future of AI in Business: Trends to Watch in 2025',
      excerpt: 'Explore the latest AI trends that are reshaping how businesses operate, from generative AI to autonomous systems.',
      author: 'Alex Thompson',
      authorAvatar: 'AT',
      date: '2025-09-15',
      readTime: '8 min read',
      category: 'AI Trends',
      image: '/api/placeholder/600/300',
      featured: true
    },
    {
      id: 2,
      title: 'Building Scalable AI Applications: Best Practices',
      excerpt: 'Learn how to design and implement AI applications that can scale with your business growth.',
      author: 'Sarah Kim',
      authorAvatar: 'SK',
      date: '2025-09-12',
      readTime: '12 min read',
      category: 'Development',
      image: '/api/placeholder/600/300',
      featured: false
    },
    {
      id: 3,
      title: 'Real-time Collaboration: The New Standard for Remote Teams',
      excerpt: 'How real-time AI-powered collaboration tools are transforming distributed workforce productivity.',
      author: 'Michael Rodriguez',
      authorAvatar: 'MR',
      date: '2025-09-10',
      readTime: '6 min read',
      category: 'Collaboration',
      image: '/api/placeholder/600/300',
      featured: false
    },
    {
      id: 4,
      title: 'Vector Databases: The Backbone of Modern AI Applications',
      excerpt: 'Understanding how vector databases enable intelligent search and recommendation systems.',
      author: 'Emily Chen',
      authorAvatar: 'EC',
      date: '2025-09-08',
      readTime: '10 min read',
      category: 'Technology',
      image: '/api/placeholder/600/300',
      featured: false
    },
    {
      id: 5,
      title: 'Security and Privacy in AI: Enterprise Considerations',
      excerpt: 'Essential security practices for implementing AI in enterprise environments.',
      author: 'Alex Thompson',
      authorAvatar: 'AT',
      date: '2025-09-05',
      readTime: '9 min read',
      category: 'Security',
      image: '/api/placeholder/600/300',
      featured: false
    },
    {
      id: 6,
      title: 'Customer Success Story: How TechCorp Increased Productivity by 300%',
      excerpt: 'Learn how TechCorp transformed their operations using our AI SaaS platform.',
      author: 'Sarah Kim',
      authorAvatar: 'SK',
      date: '2025-09-03',
      readTime: '7 min read',
      category: 'Case Study',
      image: '/api/placeholder/600/300',
      featured: false
    }
  ];

  const categories = ['all', 'AI Trends', 'Development', 'Collaboration', 'Technology', 'Security', 'Case Study'];

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = blogPosts.find(post => post.featured);
  const regularPosts = filteredPosts.filter(post => !post.featured);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">AI</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI SaaS Platform
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Back to Home
              </Button>
              <Button onClick={() => window.location.href = '/auth/register'}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            AI Insights & Resources
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Stay ahead of the curve with the latest AI trends, best practices, and industry insights
          </p>
          
          {/* Newsletter Signup */}
          <div className="max-w-md mx-auto">
            <div className="flex gap-4">
              <Input
                placeholder="Enter your email for updates"
                type="email"
                className="flex-1"
              />
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
                >
                  {category === 'all' ? 'All Posts' : category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && selectedCategory === 'all' && !searchTerm && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                Featured Article
              </Badge>
            </div>
            
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-12 flex items-center justify-center">
                  <div className="text-6xl">📰</div>
                </div>
                <div className="p-8 lg:p-12">
                  <Badge className="mb-4 bg-blue-100 text-blue-700">
                    {featuredPost.category}
                  </Badge>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                    {featuredPost.title}
                  </h2>
                  <p className="text-gray-600 mb-6 text-lg">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center space-x-4 mb-6">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        {featuredPost.authorAvatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900">{featuredPost.author}</div>
                      <div className="text-gray-500 text-sm">
                        {new Date(featuredPost.date).toLocaleDateString()} • {featuredPost.readTime}
                      </div>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                    Read Full Article
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {regularPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 h-48 flex items-center justify-center">
                    <div className="text-4xl">📄</div>
                  </div>
                  <div className="p-6">
                    <Badge className="mb-3 bg-gray-100 text-gray-700">
                      {post.category}
                    </Badge>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                          {post.authorAvatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{post.author}</div>
                        <div className="text-gray-500 text-xs">
                          {new Date(post.date).toLocaleDateString()} • {post.readTime}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Read More
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-6">
            Never Miss an Update
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get the latest AI insights, product updates, and industry news delivered to your inbox
          </p>
          <div className="max-w-md mx-auto flex gap-4">
            <Input
              placeholder="Enter your email"
              type="email"
              className="flex-1 bg-white"
            />
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore by Category</h2>
            <p className="text-lg text-gray-600">
              Find content that matches your interests
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(1).map((category) => (
              <Button
                key={category}
                variant="outline"
                className="h-auto p-4 text-center"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;