// Mock @heroui/react
import React from 'react';

export const Button = ({ children, ...props }) => {
  return React.createElement('button', props, children);
};

export const Chip = ({ children, ...props }) => {
  return React.createElement('span', props, children);
};

export const Skeleton = ({ className, ...props }) => {
  return React.createElement('div', { className, ...props });
};

export const Tooltip = ({ children, content, ...props }) => {
  return React.createElement('div', props, children);
};

export const Card = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

export const CardBody = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

export const Input = ({ label, ...props }) => {
  return React.createElement('input', props);
};

export const Table = ({ children, ...props }) => {
  return React.createElement('table', props, children);
};

export const TableHeader = ({ children, ...props }) => {
  return React.createElement('thead', props, children);
};

export const TableBody = ({ children, ...props }) => {
  return React.createElement('tbody', props, children);
};

export const TableRow = ({ children, ...props }) => {
  return React.createElement('tr', props, children);
};

export const TableCell = ({ children, ...props }) => {
  return React.createElement('td', props, children);
};

export const Modal = ({ isOpen, onClose, children, ...props }) => {
  if (!isOpen) return null;
  return React.createElement('div', props, children);
};

export const Popover = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

export const Dropdown = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

export const Disclosure = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

export const Accordion = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

export const Tabs = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

export const Tab = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

export const Avatar = ({ src, name, ...props }) => {
  return React.createElement('img', { src, alt: name, ...props });
};

export const Badge = ({ children, ...props }) => {
  return React.createElement('span', props, children);
};

export const Progress = ({ value, ...props }) => {
  return React.createElement('progress', { value, ...props });
};

export const Divider = ({ ...props }) => {
  return React.createElement('hr', props);
};

export const Pagination = ({ ...props }) => {
  return React.createElement('nav', props);
};