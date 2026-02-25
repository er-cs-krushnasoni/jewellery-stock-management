// src/components/SecurityProvider.jsx
import React from 'react';
import { useSecurityProtection } from '../hooks/useSecurityProtection';

export const SecurityProvider = ({ children }) => {
  useSecurityProtection();
  
  return <>{children}</>;
};