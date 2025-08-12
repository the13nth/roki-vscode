import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface ContextPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContextPage({ params }: ContextPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} activeTab="context" />;
}