import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface DesignPageProps {
  params: Promise<{ id: string }>;
}

export default async function DesignPage({ params }: DesignPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} activeTab="design" />;
}