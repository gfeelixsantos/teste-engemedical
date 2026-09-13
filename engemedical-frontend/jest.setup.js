// Simple mock for testing
require('@testing-library/jest-dom');
const React = require('react');

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sftp-integracao',
  useSelectedLayoutSegment: () => null,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: () => ({ children, ...props }) => 
      React.createElement('div', props, children)
  }),
  AnimatePresence: ({ children }) => children,
}));

// Mock lucide-react
jest.mock('lucide-react', () => {
  const icons = ['Server', 'ArrowLeft', 'RefreshCw', 'Download', 'Clock', 'Calendar', 
                 'FileText', 'Activity', 'BarChart3', 'Settings', 'ChevronLeft', 
                 'ChevronRight', 'Timer', 'PlayCircle', 'PauseCircle', 'MapPin', 
                 'CheckCircle', 'AlertCircle', 'Loader2', 'FileDown', 'FileUp', 'Zap'];
  
  const createIcon = (name) => ({ className, size, ...props }) =>
    React.createElement('svg', { className, width: size || 24, height: size || 24, ...props });
  
  const obj = {};
  icons.forEach(name => obj[name] = createIcon(name));
  return obj;
});

// Mock @heroui/react
jest.mock('@heroui/react', () => {
  const components = ['Button', 'Chip', 'Skeleton', 'Tooltip', 'Card', 'Input', 'Table'];
  const obj = {};
  components.forEach(name => {
    obj[name] = ({ children, ...props }) => React.createElement('div', props, children);
  });
  return obj;
});

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  })),
}));
