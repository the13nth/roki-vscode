import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from '@/lib/pinecone';

// Helper function to parse tasks from markdown content (same as in project detail endpoint)
function parseTasksFromMarkdown(content: string): { totalTasks: number; completedTasks: number; percentage: number } {
  if (!content || !content.trim()) {
    return { totalTasks: 0, completedTasks: 0, percentage: 0 };
  }

  const lines = content.split('\n');
  let totalTasks = 0;
  let completedTasks = 0;

  for (const line of lines) {
    // Match task checkboxes: - [ ] or - [x]
    const taskMatch = line.match(/^[\s]*-[\s]*\[([x\s])\]/);
    if (taskMatch) {
      totalTasks++;
      if (taskMatch[1].toLowerCase() === 'x') {
        completedTasks++;
      }
    }
  }

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  return { totalTasks, completedTasks, percentage };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 400 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get user's owned projects from Pinecone
    const ownedProjectsResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
      vector: new Array(1024).fill(0.1),
      filter: {
        userId: { $eq: userId },
        type: { $eq: 'user-project' }
      },
      topK: 100,
      includeMetadata: true
    });

    const ownedProjects = ownedProjectsResponse.matches?.map(match => {
      // Parse project data to get tasks for progress calculation
      let progress = 0;
      let projectData = null;
      
      try {
        if (match.metadata?.projectData) {
          projectData = JSON.parse(match.metadata.projectData as string);
          if (projectData?.tasks) {
            const taskStats = parseTasksFromMarkdown(projectData.tasks);
            progress = taskStats.percentage;
          }
        }
      } catch (error) {
        console.error('Failed to parse project data for progress calculation:', error);
      }
      
      return {
        id: match.metadata?.projectId || match.id,
        name: match.metadata?.name || 'Untitled Project',
        description: match.metadata?.description || '',
        createdAt: match.metadata?.createdAt || '',
        lastModified: match.metadata?.lastModified || '',
        progress: progress,
        isOwned: true,
        teamId: match.metadata?.teamId || null
      };
    }) || [];

    // Get team projects where user is a member
    const teamMembershipsResponse = await index.namespace('team_members').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        userId: { $eq: userId }
      },
      topK: 100,
      includeMetadata: true
    });

    const teamProjects: any[] = [];
    
    for (const membership of teamMembershipsResponse.matches || []) {
      if (!membership.metadata) continue;
      
      const teamId = membership.metadata.teamId;
      
      // Get team projects
      const teamProjectsResponse = await index.namespace('team_projects').query({
        vector: new Array(1024).fill(0.1),
        filter: {
          teamId: { $eq: teamId }
        },
        topK: 100,
        includeMetadata: true
      });

      for (const teamProject of teamProjectsResponse.matches || []) {
        if (!teamProject.metadata) continue;
        
        const projectId = teamProject.metadata.projectId;
        
        // Get project details
        const projectResponse = await index.namespace('projects').query({
          vector: new Array(1024).fill(0.1),
          filter: {
            projectId: { $eq: projectId }
          },
          topK: 1,
          includeMetadata: true
        });

        if (projectResponse.matches?.[0]?.metadata) {
          const project = projectResponse.matches[0].metadata;
          
          // Parse project data to get tasks for progress calculation
          let progress = 0;
          let projectData = null;
          
          try {
            if (project.projectData) {
              projectData = JSON.parse(project.projectData as string);
              if (projectData?.tasks) {
                const taskStats = parseTasksFromMarkdown(projectData.tasks);
                progress = taskStats.percentage;
              }
            }
          } catch (error) {
            console.error('Failed to parse team project data for progress calculation:', error);
          }
          
          teamProjects.push({
            id: project.projectId,
            name: project.name || 'Untitled Project',
            description: project.description || '',
            createdAt: project.createdAt || '',
            lastModified: project.lastModified || '',
            progress: progress,
            isOwned: false,
            teamId: teamId,
            teamRole: teamProject.metadata.projectRole,
            addedAt: teamProject.metadata.addedAt
          });
        }
      }
    }

    // Get shared projects where user has been invited and accepted
    const sharedProjects: any[] = [];
    
    if (userEmail) {
      // Get all projects that are shared with this user
      const sharedProjectsResponse = await index.namespace('projects').query({
        vector: new Array(1024).fill(0.1),
        filter: {
          sharedWith: { $in: [userEmail] }
        },
        topK: 100,
        includeMetadata: true
      });

      for (const projectMatch of sharedProjectsResponse.matches || []) {
        if (!projectMatch.metadata) continue;
        
        const project = projectMatch.metadata;
        
        // Check if user has accepted the invitation
        const sharingResponse = await index.namespace('project_sharing').query({
          vector: new Array(1024).fill(0.1),
          filter: {
            projectId: { $eq: project.projectId },
            sharedWithEmail: { $eq: userEmail },
            status: { $eq: 'accepted' }
          },
          topK: 1,
          includeMetadata: true
        });

        if (sharingResponse.matches && sharingResponse.matches.length > 0) {
          const sharing = sharingResponse.matches[0].metadata;
          
          if (sharing) {
            // Parse project data to get tasks for progress calculation
            let progress = 0;
            let projectData = null;
            
            try {
              if (project.projectData) {
                projectData = JSON.parse(project.projectData as string);
                if (projectData?.tasks) {
                  const taskStats = parseTasksFromMarkdown(projectData.tasks);
                  progress = taskStats.percentage;
                }
              }
            } catch (error) {
              console.error('Failed to parse shared project data for progress calculation:', error);
            }
            
            sharedProjects.push({
              id: project.projectId,
              name: project.name || 'Untitled Project',
              description: project.description || '',
              createdAt: project.createdAt || '',
              lastModified: project.lastModified || '',
              progress: progress,
              isOwned: false,
              isShared: true,
              sharedRole: sharing.role,
              sharedAt: sharing.sharedAt
            });
          }
        }
      }
    }

    // Combine and deduplicate projects
    const allProjects = [...ownedProjects, ...teamProjects, ...sharedProjects];
    const uniqueProjects = allProjects.filter((project, index, self) => 
      index === self.findIndex(p => p.id === project.id)
    );

    // Sort by last modified date (newest first)
    uniqueProjects.sort((a, b) => new Date(String(b.lastModified)).getTime() - new Date(String(a.lastModified)).getTime());

    return NextResponse.json({
      success: true,
      projects: uniqueProjects
    });

  } catch (error) {
    console.error('Error fetching user projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
