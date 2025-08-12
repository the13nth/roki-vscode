import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface RequirementsPageProps {
  params: Promise<{ id: string }>;
}

export default async function RequirementsPage({ params }: RequirementsPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} activeTab="requirements" />;
}