import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface ProgressPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgressPage({ params }: ProgressPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} activeTab="progress" />;
}