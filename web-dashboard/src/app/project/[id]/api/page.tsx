import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface ApiPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApiPage({ params }: ApiPageProps) {
  const { id } = await params;
  
  return (
    <ProjectDashboardLayout 
      projectId={id} 
      activeTab="api"
    />
  );
}
