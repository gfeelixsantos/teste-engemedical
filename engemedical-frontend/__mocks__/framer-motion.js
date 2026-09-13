// Mock framer-motion
import React from 'react';

export const motion = new Proxy(
  {},
  {
    get: (_, property: string) => {
      // Return a function that renders elements with motion props
      return function MotionComponent({ children, ...props }: any) {
        return React.createElement('div', props, children);
      };
    },
  }
);

export const AnimatePresence = ({ children }: any) => children;

export const Reorder = {
  Group: ({ children }: any) => children,
  Element: ({ children }: any) => children,
};

export const motionValue = {
  useMotionValue: () => 0,
  useSpring: () => ({}),
  useTransform: () => ({}),
};

export const useAnimation = () => ({
  start: () => {},
  stop: () => {},
  controls: {},
});