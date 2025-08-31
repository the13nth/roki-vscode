import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface ApplicationsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationsPage({ params }: ApplicationsPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} activeTab="applications" />;
}
