import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface TasksPageProps {
  params: Promise<{ id: string }>;
}

export default async function TasksPage({ params }: TasksPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} activeTab="tasks" />;
}