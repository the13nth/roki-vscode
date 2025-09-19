import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for client-side operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client for server-side operations (bypasses RLS)
// Fallback to anon key if service key is not available
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  template: string;
  custom_template?: string;
  industry: string;
  custom_industry?: string;
  business_model: string[];
  ai_model: string;
  technology_stack?: any;
  regulatory_compliance?: any;
  is_public: boolean;
  requirements?: string;
  design?: string;
  tasks?: string;
  progress?: any;
  context_preferences?: any;
  token_tracking?: any;
  analysis_data?: any; // Store AI analysis results
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  type: 'requirements' | 'design' | 'tasks' | 'analysis';
  content: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface ProjectRequirement {
  id: string;
  project_id: string;
  title: string;
  user_story: string;
  acceptance_criteria: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  opportunity_name: string;
  description: string;
  type: 'Competition' | 'Program' | 'Accelerator' | 'Incubator' | 'Grant' | 'Fellowship' | 'Challenge' | 'Award' | 'Hackathon';
  close_date: string; // Date string in YYYY-MM-DD format
  status: 'Open' | 'Closed' | 'Coming Soon';
  link?: string;
  eligible_countries: string[];
  for_female_founders: boolean;
  sectors_of_interest: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Supabase service class
export class SupabaseService {
  private static instance: SupabaseService;

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // Project operations
  async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const { data, error } = await supabaseService
      .from('projects')
      .insert([{
        ...projectData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return data;
  }

  async getProject(projectId: string, userId?: string): Promise<Project | null> {
    let query = supabaseService
      .from('projects')
      .select('*')
      .eq('id', projectId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching project:', error);
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return data;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const { data, error } = await supabaseService
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user projects:', error);
      throw new Error(`Failed to fetch user projects: ${error.message}`);
    }

    return data || [];
  }

  async getPublicProjects(excludeUserId?: string): Promise<Project[]> {
    let query = supabaseService
      .from('projects')
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching public projects:', error);
      throw new Error(`Failed to fetch public projects: ${error.message}`);
    }

    return data || [];
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await supabaseService
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return data;
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const { error } = await supabaseService
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting project:', error);
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  async checkProjectSharing(_projectId: string, _userEmail: string): Promise<boolean> {
    // For now, we'll implement a simple check
    // In a full implementation, you'd check a project_sharing table
    // For this demo, we'll return false (no sharing implemented yet)
    return false;
  }

  // Document operations
  async createDocument(documentData: Omit<ProjectDocument, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectDocument> {
    const { data, error } = await supabaseService
      .from('project_documents')
      .insert([{
        ...documentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      throw new Error(`Failed to create document: ${error.message}`);
    }

    return data;
  }

  async getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
    const { data, error } = await supabaseService
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching project documents:', error);
      throw new Error(`Failed to fetch project documents: ${error.message}`);
    }

    return data || [];
  }

  async updateDocument(documentId: string, updates: Partial<ProjectDocument>): Promise<ProjectDocument> {
    const { data, error } = await supabaseService
      .from('project_documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      throw new Error(`Failed to update document: ${error.message}`);
    }

    return data;
  }

  // Requirement operations
  async createRequirement(requirementData: Omit<ProjectRequirement, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectRequirement> {
    const { data, error } = await supabaseService
      .from('project_requirements')
      .insert([{
        ...requirementData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating requirement:', error);
      throw new Error(`Failed to create requirement: ${error.message}`);
    }

    return data;
  }

  async getProjectRequirements(projectId: string): Promise<ProjectRequirement[]> {
    const { data, error } = await supabaseService
      .from('project_requirements')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching project requirements:', error);
      throw new Error(`Failed to fetch project requirements: ${error.message}`);
    }

    return data || [];
  }

  async updateRequirement(requirementId: string, updates: Partial<ProjectRequirement>): Promise<ProjectRequirement> {
    const { data, error } = await supabaseService
      .from('project_requirements')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', requirementId)
      .select()
      .single();

    if (error) {
      console.error('Error updating requirement:', error);
      throw new Error(`Failed to update requirement: ${error.message}`);
    }

    return data;
  }

  async deleteRequirement(requirementId: string): Promise<void> {
    const { error } = await supabaseService
      .from('project_requirements')
      .delete()
      .eq('id', requirementId);

    if (error) {
      console.error('Error deleting requirement:', error);
      throw new Error(`Failed to delete requirement: ${error.message}`);
    }
  }

  // Opportunity operations
  async createOpportunity(opportunityData: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>): Promise<Opportunity> {
    const { data, error } = await supabaseService
      .from('opportunities')
      .insert([{
        ...opportunityData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating opportunity:', error);
      throw new Error(`Failed to create opportunity: ${error.message}`);
    }

    return data;
  }

  async getOpportunities(): Promise<Opportunity[]> {
    const { data, error } = await supabaseService
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching opportunities:', error);
      throw new Error(`Failed to fetch opportunities: ${error.message}`);
    }

    return data || [];
  }

  async getOpportunity(opportunityId: string): Promise<Opportunity | null> {
    const { data, error } = await supabaseService
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching opportunity:', error);
      throw new Error(`Failed to fetch opportunity: ${error.message}`);
    }

    return data;
  }

  async updateOpportunity(opportunityId: string, updates: Partial<Opportunity>): Promise<Opportunity> {
    const { data, error } = await supabaseService
      .from('opportunities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) {
      console.error('Error updating opportunity:', error);
      throw new Error(`Failed to update opportunity: ${error.message}`);
    }

    return data;
  }

  async deleteOpportunity(opportunityId: string): Promise<void> {
    const { error } = await supabaseService
      .from('opportunities')
      .delete()
      .eq('id', opportunityId);

    if (error) {
      console.error('Error deleting opportunity:', error);
      throw new Error(`Failed to delete opportunity: ${error.message}`);
    }
  }

  // Utility method to migrate existing JSON data to Supabase
  async migrateOpportunitiesFromJson(opportunities: any[]): Promise<void> {
    const transformedOpportunities = opportunities.map(opp => ({
      opportunity_name: opp.Opportunity,
      description: opp.Description,
      type: opp.Type as Opportunity['type'],
      close_date: opp['Close Date'],
      status: opp.Status as Opportunity['status'],
      link: opp.Link || null,
      eligible_countries: opp['Eligible Countries'] ? opp['Eligible Countries'].split(',').map((c: string) => c.trim()) : [],
      for_female_founders: Boolean(opp['For Female Founders']),
      sectors_of_interest: opp['Sectors of Interest'] ? opp['Sectors of Interest'].split(',').map((s: string) => s.trim()) : [],
      created_by: null // No creator info in JSON data
    }));

    const { error } = await supabaseService
      .from('opportunities')
      .insert(transformedOpportunities);

    if (error) {
      console.error('Error migrating opportunities:', error);
      throw new Error(`Failed to migrate opportunities: ${error.message}`);
    }

    console.log(`Successfully migrated ${transformedOpportunities.length} opportunities to Supabase`);
  }
}

