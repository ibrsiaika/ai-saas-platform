// Cost Optimization Service for Multi-AI Platform
import { multiAIManager } from './multiAI';

export interface UsageMetrics {
  userId: string;
  timestamp: Date;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  responseTime: number;
  requestType: 'chat' | 'completion' | 'analysis' | 'generation';
}

export interface CostOptimizationConfig {
  monthlyBudget?: number;
  costPerTokenLimit?: number;
  preferredProviders?: string[];
  costPriority: 'lowest' | 'balanced' | 'performance';
  enableBulkProcessing: boolean;
  enableCaching: boolean;
}

export interface BulkPricingTier {
  minTokens: number;
  maxTokens: number;
  discountPercent: number;
  provider: string;
}

export interface OptimizationRecommendation {
  type: 'provider_switch' | 'model_downgrade' | 'bulk_processing' | 'cache_hit' | 'budget_alert';
  message: string;
  potentialSavings: number;
  confidence: number;
  actionable: boolean;
}

class CostOptimizationService {
  private usageHistory: UsageMetrics[] = [];
  private cache = new Map<string, any>();
  private bulkPricingTiers: BulkPricingTier[] = [
    { minTokens: 100000, maxTokens: 500000, discountPercent: 10, provider: 'openai' },
    { minTokens: 500000, maxTokens: 1000000, discountPercent: 15, provider: 'openai' },
    { minTokens: 1000000, maxTokens: Infinity, discountPercent: 20, provider: 'openai' },
    { minTokens: 50000, maxTokens: 200000, discountPercent: 15, provider: 'anthropic' },
    { minTokens: 200000, maxTokens: 500000, discountPercent: 25, provider: 'anthropic' },
    { minTokens: 500000, maxTokens: Infinity, discountPercent: 30, provider: 'anthropic' }
  ];

  // Track usage for cost optimization
  trackUsage(metrics: UsageMetrics) {
    this.usageHistory.push(metrics);
    
    // Keep only last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.usageHistory = this.usageHistory.filter(m => m.timestamp >= thirtyDaysAgo);
  }

  // Get usage analytics for a user
  getUserUsageAnalytics(userId: string, period: string = '30d') {
    const userMetrics = this.usageHistory.filter(m => m.userId === userId);
    
    const totalCost = userMetrics.reduce((sum, m) => sum + m.cost, 0);
    const totalTokens = userMetrics.reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0);
    const avgResponseTime = userMetrics.reduce((sum, m) => sum + m.responseTime, 0) / userMetrics.length;
    
    const providerBreakdown = userMetrics.reduce((acc, m) => {
      if (!acc[m.provider]) {
        acc[m.provider] = { cost: 0, tokens: 0, requests: 0 };
      }
      acc[m.provider].cost += m.cost;
      acc[m.provider].tokens += m.inputTokens + m.outputTokens;
      acc[m.provider].requests += 1;
      return acc;
    }, {} as Record<string, { cost: number; tokens: number; requests: number }>);

    const dailyUsage = this.groupUsageByDay(userMetrics);
    
    return {
      totalCost,
      totalTokens,
      avgResponseTime: avgResponseTime || 0,
      totalRequests: userMetrics.length,
      providerBreakdown,
      dailyUsage,
      costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0
    };
  }

  // Get cost optimization recommendations
  getOptimizationRecommendations(userId: string, config: CostOptimizationConfig): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const userMetrics = this.usageHistory.filter(m => m.userId === userId);
    
    if (userMetrics.length === 0) return recommendations;

    // Check budget alerts
    if (config.monthlyBudget) {
      const monthlySpend = this.getMonthlySpend(userId);
      if (monthlySpend > config.monthlyBudget * 0.8) {
        recommendations.push({
          type: 'budget_alert',
          message: `You've used ${((monthlySpend / config.monthlyBudget) * 100).toFixed(1)}% of your monthly budget`,
          potentialSavings: 0,
          confidence: 1.0,
          actionable: true
        });
      }
    }

    // Analyze provider cost efficiency
    const providerAnalysis = this.analyzeProviderEfficiency(userMetrics);
    if (providerAnalysis.recommendedSwitch) {
      recommendations.push({
        type: 'provider_switch',
        message: `Switch to ${providerAnalysis.recommendedProvider} to save ${providerAnalysis.potentialSavings.toFixed(2)}% on costs`,
        potentialSavings: providerAnalysis.potentialSavings,
        confidence: providerAnalysis.confidence,
        actionable: true
      });
    }

    // Check for bulk processing opportunities
    const bulkOpportunity = this.identifyBulkProcessingOpportunity(userMetrics);
    if (bulkOpportunity.applicable) {
      recommendations.push({
        type: 'bulk_processing',
        message: `Process similar requests in batches to save ${bulkOpportunity.potentialSavings.toFixed(2)}%`,
        potentialSavings: bulkOpportunity.potentialSavings,
        confidence: 0.8,
        actionable: true
      });
    }

    // Check cache effectiveness
    const cacheAnalysis = this.analyzeCacheEffectiveness(userMetrics);
    if (cacheAnalysis.potentialSavings > 5) {
      recommendations.push({
        type: 'cache_hit',
        message: `Enable response caching to save ${cacheAnalysis.potentialSavings.toFixed(2)}% on repeated queries`,
        potentialSavings: cacheAnalysis.potentialSavings,
        confidence: 0.9,
        actionable: true
      });
    }

    return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  // Optimize request routing based on cost and performance
  async optimizeRequest(request: any, config: CostOptimizationConfig) {
    // Check cache first if enabled
    if (config.enableCaching) {
      const cacheKey = this.generateCacheKey(request);
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        return {
          ...cachedResponse,
          source: 'cache',
          cost: 0
        };
      }
    }

    // Get cost estimates for all providers
    const estimates = multiAIManager.estimateCost(request);
    
    // Apply cost optimization logic
    let selectedProvider = estimates[0];
    
    switch (config.costPriority) {
      case 'lowest':
        selectedProvider = estimates.sort((a, b) => a.estimatedCost - b.estimatedCost)[0];
        break;
      case 'performance':
        // Prefer high-performance providers even if more expensive
        const performanceOrder = ['openai', 'anthropic', 'google', 'ollama'];
        selectedProvider = estimates.sort((a, b) => {
          const aIndex = performanceOrder.indexOf(a.provider);
          const bIndex = performanceOrder.indexOf(b.provider);
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        })[0];
        break;
      default: // balanced
        // Score based on cost and performance
        selectedProvider = estimates.sort((a, b) => {
          const aScore = this.calculateBalancedScore(a);
          const bScore = this.calculateBalancedScore(b);
          return bScore - aScore;
        })[0];
    }

    // Execute the request
    const response = await multiAIManager.generateResponse({
      ...request,
      provider: selectedProvider.provider
    });

    // Cache the response if enabled
    if (config.enableCaching) {
      const cacheKey = this.generateCacheKey(request);
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  // Calculate bulk processing discounts
  calculateBulkDiscount(tokens: number, provider: string): number {
    const tier = this.bulkPricingTiers.find(t => 
      t.provider === provider && 
      tokens >= t.minTokens && 
      tokens <= t.maxTokens
    );
    
    return tier ? tier.discountPercent : 0;
  }

  // Get resource pooling recommendations
  getResourcePoolingRecommendations(organizationId: string) {
    // Analyze usage patterns across organization
    const orgMetrics = this.usageHistory.filter(m => 
      m.userId.startsWith(organizationId)
    );

    const totalTokens = orgMetrics.reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0);
    const currentCost = orgMetrics.reduce((sum, m) => sum + m.cost, 0);
    
    // Calculate potential savings from bulk pricing
    const providers = [...new Set(orgMetrics.map(m => m.provider))];
    let potentialSavings = 0;
    
    providers.forEach(provider => {
      const providerTokens = orgMetrics
        .filter(m => m.provider === provider)
        .reduce((sum, m) => sum + m.inputTokens + m.outputTokens, 0);
      
      const discount = this.calculateBulkDiscount(providerTokens, provider);
      const providerCost = orgMetrics
        .filter(m => m.provider === provider)
        .reduce((sum, m) => sum + m.cost, 0);
      
      potentialSavings += (providerCost * discount) / 100;
    });

    return {
      currentCost,
      potentialSavings,
      savingsPercent: currentCost > 0 ? (potentialSavings / currentCost) * 100 : 0,
      totalTokens,
      recommendedPooling: potentialSavings > currentCost * 0.1 // 10% savings threshold
    };
  }

  // Private helper methods
  private groupUsageByDay(metrics: UsageMetrics[]) {
    const grouped = metrics.reduce((acc, m) => {
      const day = m.timestamp.toDateString();
      if (!acc[day]) {
        acc[day] = { cost: 0, tokens: 0, requests: 0 };
      }
      acc[day].cost += m.cost;
      acc[day].tokens += m.inputTokens + m.outputTokens;
      acc[day].requests += 1;
      return acc;
    }, {} as Record<string, { cost: number; tokens: number; requests: number }>);

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      ...data
    }));
  }

  private getMonthlySpend(userId: string): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return this.usageHistory
      .filter(m => m.userId === userId && m.timestamp >= monthStart)
      .reduce((sum, m) => sum + m.cost, 0);
  }

  private analyzeProviderEfficiency(metrics: UsageMetrics[]) {
    const providerStats = metrics.reduce((acc, m) => {
      if (!acc[m.provider]) {
        acc[m.provider] = { cost: 0, tokens: 0, responseTime: 0, requests: 0 };
      }
      acc[m.provider].cost += m.cost;
      acc[m.provider].tokens += m.inputTokens + m.outputTokens;
      acc[m.provider].responseTime += m.responseTime;
      acc[m.provider].requests += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate cost per token for each provider
    const efficiency = Object.entries(providerStats).map(([provider, stats]) => ({
      provider,
      costPerToken: stats.tokens > 0 ? stats.cost / stats.tokens : 0,
      avgResponseTime: stats.requests > 0 ? stats.responseTime / stats.requests : 0,
      usage: stats.requests
    }));

    if (efficiency.length < 2) {
      return { recommendedSwitch: false, recommendedProvider: '', potentialSavings: 0, confidence: 0 };
    }

    // Find most cost-effective provider
    const sortedByEfficiency = efficiency.sort((a, b) => a.costPerToken - b.costPerToken);
    const mostEfficient = sortedByEfficiency[0];
    const currentMostUsed = efficiency.sort((a, b) => b.usage - a.usage)[0];

    if (mostEfficient.provider !== currentMostUsed.provider) {
      const potentialSavings = ((currentMostUsed.costPerToken - mostEfficient.costPerToken) / currentMostUsed.costPerToken) * 100;
      
      return {
        recommendedSwitch: potentialSavings > 10, // Only recommend if >10% savings
        recommendedProvider: mostEfficient.provider,
        potentialSavings,
        confidence: Math.min(potentialSavings / 50, 1.0) // Higher confidence for higher savings
      };
    }

    return { recommendedSwitch: false, recommendedProvider: '', potentialSavings: 0, confidence: 0 };
  }

  private identifyBulkProcessingOpportunity(metrics: UsageMetrics[]) {
    // Look for patterns of similar requests
    const requestTypes = metrics.reduce((acc, m) => {
      if (!acc[m.requestType]) {
        acc[m.requestType] = [];
      }
      acc[m.requestType].push(m);
      return acc;
    }, {} as Record<string, UsageMetrics[]>);

    // Check if any request type has frequent, small requests that could be batched
    for (const [type, requests] of Object.entries(requestTypes)) {
      if (requests.length > 10) {
        const avgTokens = requests.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0) / requests.length;
        
        if (avgTokens < 1000) { // Small requests that could be batched
          return {
            applicable: true,
            potentialSavings: 15, // Estimate 15% savings from bulk processing
            requestType: type
          };
        }
      }
    }

    return { applicable: false, potentialSavings: 0, requestType: '' };
  }

  private analyzeCacheEffectiveness(metrics: UsageMetrics[]) {
    // Estimate potential cache hits based on similar requests
    const requestHashes = metrics.map(m => ({
      hash: this.generateRequestHash(m),
      cost: m.cost
    }));

    const duplicates = requestHashes.reduce((acc, r) => {
      acc[r.hash] = (acc[r.hash] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicateRequests = Object.values(duplicates).filter(count => count > 1);
    const totalDuplicateCost = Object.entries(duplicates)
      .filter(([hash, count]) => count > 1)
      .reduce((sum, [hash, count]) => {
        const request = requestHashes.find(r => r.hash === hash);
        return sum + (request ? request.cost * (count - 1) : 0);
      }, 0);

    const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);
    const potentialSavings = totalCost > 0 ? (totalDuplicateCost / totalCost) * 100 : 0;

    return { potentialSavings };
  }

  private calculateBalancedScore(estimate: any): number {
    // Normalize cost (lower is better) and add performance bonus
    const costScore = 1 / (estimate.estimatedCost + 0.001); // Avoid division by zero
    const performanceBonus = this.getPerformanceBonus(estimate.provider);
    
    return costScore + performanceBonus;
  }

  private getPerformanceBonus(provider: string): number {
    const bonuses = {
      'openai': 0.8,
      'anthropic': 0.7,
      'google': 0.6,
      'ollama': 0.3
    };
    return bonuses[provider as keyof typeof bonuses] || 0;
  }

  private generateCacheKey(request: any): string {
    // Create a hash of the request for caching
    const key = {
      messages: request.messages,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens
    };
    return btoa(JSON.stringify(key));
  }

  private generateRequestHash(metric: UsageMetrics): string {
    // Create a simplified hash for duplicate detection
    return btoa(`${metric.requestType}-${metric.inputTokens}-${metric.model}`);
  }
}

export const costOptimizationService = new CostOptimizationService();