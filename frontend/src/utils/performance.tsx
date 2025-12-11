// Performance monitoring and optimization utilities
import React from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  initialize() {
    if (typeof window === 'undefined') return;

    // Monitor navigation timing
    this.observeNavigationTiming();
    
    // Monitor resource loading
    this.observeResourceTiming();
    
    // Monitor largest contentful paint
    this.observeLCP();
    
    // Monitor first input delay
    this.observeFID();
    
    // Monitor cumulative layout shift
    this.observeCLS();
  }

  private observeNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      
      if (navigationEntries.length > 0) {
        const entry = navigationEntries[0];
        const loadTime = entry.loadEventEnd - entry.fetchStart;
        const renderTime = entry.domContentLoadedEventEnd - entry.fetchStart;
        
        this.recordMetric('navigation', {
          loadTime,
          renderTime,
          apiResponseTime: 0
        });
      }
    }
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('/api/')) {
            this.recordMetric(`api-${entry.name}`, {
              loadTime: entry.duration,
              renderTime: 0,
              apiResponseTime: entry.duration
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    }
  }

  private observeLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric('lcp', {
          loadTime: lastEntry.startTime,
          renderTime: 0,
          apiResponseTime: 0
        });
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    }
  }

  private observeFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric('fid', {
            loadTime: (entry as any).processingStart - entry.startTime,
            renderTime: 0,
            apiResponseTime: 0
          });
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    }
  }

  private observeCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        
        this.recordMetric('cls', {
          loadTime: clsValue,
          renderTime: 0,
          apiResponseTime: 0
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    }
  }

  recordMetric(key: string, metrics: PerformanceMetrics) {
    this.metrics.set(key, {
      ...metrics,
      memoryUsage: this.getMemoryUsage()
    });
    
    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendMetricsToService(key, metrics);
    }
  }

  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  private async sendMetricsToService(key: string, metrics: PerformanceMetrics) {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          metrics,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
    }
  }

  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  clearMetrics() {
    this.metrics.clear();
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clearMetrics();
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  React.useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.initialize();
    
    return () => {
      monitor.destroy();
    };
  }, []);
  
  return PerformanceMonitor.getInstance();
};

// HOC for component performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  const WithPerformanceMonitoring = (props: P) => {
    const startTime = React.useMemo(() => performance.now(), []);
    const monitor = PerformanceMonitor.getInstance();
    
    React.useEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      monitor.recordMetric(`component-${componentName}`, {
        loadTime: 0,
        renderTime,
        apiResponseTime: 0
      });
    }, [monitor, startTime]);
    
    return <WrappedComponent {...props} />;
  };
  
  WithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${componentName})`;
  
  return WithPerformanceMonitoring;
};

// Utility for measuring async operations
export const measureAsyncOperation = async <T,>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now();
  const monitor = PerformanceMonitor.getInstance();
  
  try {
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    monitor.recordMetric(`async-${operationName}`, {
      loadTime: 0,
      renderTime: 0,
      apiResponseTime: duration
    });
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    monitor.recordMetric(`async-${operationName}-error`, {
      loadTime: 0,
      renderTime: 0,
      apiResponseTime: duration
    });
    
    throw error;
  }
};

// Lazy loading utility
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  return React.lazy(() => 
    measureAsyncOperation(
      importFunction,
      'lazy-component-import'
    )
  );
};

// Image optimization component
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, width, height, className, priority = false }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  
  React.useEffect(() => {
    if (priority) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [src, priority]);
  
  return (
    <div className={`relative ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading={priority ? 'eager' : 'lazy'}
      />
      
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400">
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;