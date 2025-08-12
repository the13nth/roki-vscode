import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';
import { EmbeddingsVisualization } from '@/components/EmbeddingsVisualization';

interface VisualizationPageProps {
  params: Promise<{ id: string }>;
}

export default async function VisualizationPage({ params }: VisualizationPageProps) {
  const { id: projectId } = await params;
  
  console.log('=== VISUALIZATION PAGE RENDERING ===');
  console.log('Project ID:', projectId);
  
  return (
    <ProjectDashboardLayout projectId={projectId} activeTab="visualization" />
  );
}
