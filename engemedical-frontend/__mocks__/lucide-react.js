// Mock lucide-react
import React from 'react';

const createIcon = (name: string) => {
  return function Icon({ className, size, ...props }: any) {
    return React.createElement('svg', {
      className,
      width: size || 24,
      height: size || 24,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ...props,
    });
  };
};

// Export all icons used in SFTP pages
export const Server = createIcon('Server');
export const ArrowLeft = createIcon('ArrowLeft');
export const RefreshCw = createIcon('RefreshCw');
export const Download = createIcon('Download');
export const Clock = createIcon('Clock');
export const Calendar = createIcon('Calendar');
export const FileText = createIcon('FileText');
export const Activity = createIcon('Activity');
export const BarChart3 = createIcon('BarChart3');
export const Settings = createIcon('Settings');
export const ChevronLeft = createIcon('ChevronLeft');
export const ChevronRight = createIcon('ChevronRight');
export const Timer = createIcon('Timer');
export const PlayCircle = createIcon('PlayCircle');
export const PauseCircle = createIcon('PauseCircle');
export const MapPin = createIcon('MapPin');
export const CheckCircle = createIcon('CheckCircle');
export const AlertCircle = createIcon('AlertCircle');
export const Loader2 = createIcon('Loader2');
export const FileDown = createIcon('FileDown');
export const FileUp = createIcon('FileUp');
export const Zap = createIcon('Zap');