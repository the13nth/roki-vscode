import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface PromptsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptsPage({ params }: PromptsPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} activeTab="prompts" />;
}
