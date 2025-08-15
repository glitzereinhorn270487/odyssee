import React from 'react';
import AgentWiring from '@/components/AgentWiring';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentWiring />
    </>
  );
}
