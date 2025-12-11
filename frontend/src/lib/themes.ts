// Theme Configuration for Multi-AI Platform
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    hero: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: {
      primary: '#1E293B',
      secondary: '#475569',
      muted: '#94A3B8'
    },
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  },
  gradients: {
    primary: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    secondary: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#60A5FA',
    secondary: '#A78BFA',
    accent: '#22D3EE',
    background: '#0F172A',
    surface: '#1E293B',
    text: {
      primary: '#F1F5F9',
      secondary: '#CBD5E1',
      muted: '#64748B'
    },
    border: '#334155',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA'
  },
  gradients: {
    primary: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)',
    secondary: 'linear-gradient(135deg, #22D3EE 0%, #60A5FA 100%)',
    hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
};

export const blueTheme: Theme = {
  name: 'blue',
  colors: {
    primary: '#1D4ED8',
    secondary: '#3730A3',
    accent: '#0284C7',
    background: '#F8FAFC',
    surface: '#EFF6FF',
    text: {
      primary: '#1E3A8A',
      secondary: '#3730A3',
      muted: '#6B7280'
    },
    border: '#DBEAFE',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#1D4ED8'
  },
  gradients: {
    primary: 'linear-gradient(135deg, #1D4ED8 0%, #3730A3 100%)',
    secondary: 'linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)',
    hero: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(29 78 216 / 0.1)',
    md: '0 4px 6px -1px rgb(29 78 216 / 0.15), 0 2px 4px -2px rgb(29 78 216 / 0.15)',
    lg: '0 10px 15px -3px rgb(29 78 216 / 0.15), 0 4px 6px -4px rgb(29 78 216 / 0.15)',
    xl: '0 20px 25px -5px rgb(29 78 216 / 0.15), 0 8px 10px -6px rgb(29 78 216 / 0.15)'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  blue: blueTheme
};

export type ThemeName = keyof typeof themes;