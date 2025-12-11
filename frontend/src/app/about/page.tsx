'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const AboutPage = () => {
  const team = [
    {
      name: 'Alex Thompson',
      role: 'CEO & Co-Founder',
      bio: 'Former AI researcher at Google with 10+ years in machine learning and enterprise software.',
      avatar: 'AT',
      linkedin: '#'
    },
    {
      name: 'Sarah Kim',
      role: 'CTO & Co-Founder',
      bio: 'Ex-principal engineer at OpenAI, specialized in large-scale distributed systems and AI infrastructure.',
      avatar: 'SK',
      linkedin: '#'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Head of Product',
      bio: 'Product leader with experience at Stripe and Slack, focused on developer tools and SaaS platforms.',
      avatar: 'MR',
      linkedin: '#'
    },
    {
      name: 'Emily Chen',
      role: 'Head of Engineering',
      bio: 'Full-stack architect with expertise in cloud infrastructure and real-time systems.',
      avatar: 'EC',
      linkedin: '#'
    }
  ];

  const milestones = [
    {
      year: '2023',
      title: 'Company Founded',
      description: 'Started with a vision to democratize AI for businesses of all sizes'
    },
    {
      year: '2024',
      title: 'First 1,000 Users',
      description: 'Reached our first major milestone with users across 30 countries'
    },
    {
      year: '2024',
      title: 'Series A Funding',
      description: 'Raised $15M to accelerate product development and team growth'
    },
    {
      year: '2025',
      title: '10,000+ Active Users',
      description: 'Serving thousands of businesses with enterprise-grade AI solutions'
    }
  ];

  const values = [
    {
      title: 'Innovation First',
      description: 'We push the boundaries of what\'s possible with AI technology',
      icon: '🚀'
    },
    {
      title: 'Customer Success',
      description: 'Your success is our success. We build for real business needs',
      icon: '🎯'
    },
    {
      title: 'Transparency',
      description: 'Open communication, honest pricing, and clear documentation',
      icon: '🔍'
    },
    {
      title: 'Security & Privacy',
      description: 'Enterprise-grade security with respect for user privacy',
      icon: '🔒'
    }
  ];

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
            Building the Future of
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}AI-Powered Business
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            We're on a mission to make advanced AI accessible to every business, 
            enabling teams to collaborate smarter and achieve more.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              We believe that artificial intelligence should enhance human capability, not replace it. 
              Our platform empowers teams to harness the power of AI while maintaining the human touch 
              that drives innovation and creativity. We're democratizing access to enterprise-grade AI 
              tools, making them available to businesses of all sizes.
            </p>
          </div>

          {/* Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {values.map((value, index) => (
              <Card key={index} className="p-8 border-0 bg-gray-50">
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-lg text-gray-600">
              Experienced leaders from top tech companies, united by a passion for AI innovation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-white">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl">
                    {member.avatar}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm mb-4">{member.bio}</p>
                <Button variant="outline" size="sm">
                  LinkedIn
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Journey</h2>
            <p className="text-lg text-gray-600">
              From startup to serving thousands of businesses worldwide
            </p>
          </div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <Badge className="bg-blue-100 text-blue-700 font-semibold px-3 py-1">
                    {milestone.year}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{milestone.title}</h3>
                  <p className="text-gray-600">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">By the Numbers</h2>
            <p className="text-blue-100 text-lg">Our impact on businesses worldwide</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">10,000+</div>
              <div className="text-blue-100">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">500M+</div>
              <div className="text-blue-100">AI Requests Processed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-blue-100">Countries Served</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-blue-100">Uptime SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Careers CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Join Our Team</h2>
          <p className="text-lg text-gray-600 mb-8">
            We're always looking for talented individuals who share our passion for AI innovation. 
            Help us build the future of intelligent business tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
              View Open Positions
            </Button>
            <Button size="lg" variant="outline">
              Learn About Our Culture
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;