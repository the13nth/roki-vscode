import { ProjectDashboardLayout } from '@/components/ProjectDashboardLayout';

interface SocialPageProps {
  params: Promise<{ id: string }>;
}

export default async function SocialPage({ params }: SocialPageProps) {
  const { id } = await params;
  
  return <ProjectDashboardLayout projectId={id} activeTab="social" />;
}
