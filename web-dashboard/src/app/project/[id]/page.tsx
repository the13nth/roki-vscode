import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} />;
}