import { Suspense } from 'react';
import AppShell from '@/components/AppShell';
import CopilotPage from '@/components/CopilotPage';

export default function Copilot() {
  return (
    <AppShell>
      <Suspense>
        <CopilotPage />
      </Suspense>
    </AppShell>
  );
}
