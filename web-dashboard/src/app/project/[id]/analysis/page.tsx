import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  
  return (
    <ProjectDashboardLayout 
      projectId={id} 
      activeTab="analysis"
    />
  );
}
