import AppShell from '@/components/AppShell';
import ProjectDetailPage from '@/components/ProjectDetailPage';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><ProjectDetailPage projectId={id} /></AppShell>;
}
