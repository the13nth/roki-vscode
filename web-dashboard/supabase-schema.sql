-- Enable Row Level Security
-- Note: JWT secret should be configured in your Supabase dashboard, not via SQL

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  template TEXT NOT NULL,
  custom_template TEXT,
  industry TEXT NOT NULL,
  custom_industry TEXT,
  business_model TEXT[] NOT NULL DEFAULT '{}',
  ai_model TEXT NOT NULL DEFAULT 'gpt-4',
  technology_stack JSONB,
  regulatory_compliance JSONB,
  is_public BOOLEAN NOT NULL DEFAULT false,
  requirements TEXT,
  design TEXT,
  tasks TEXT,
  progress JSONB,
  context_preferences JSONB,
  token_tracking JSONB,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create project_documents table
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('requirements', 'design', 'tasks', 'analysis')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create project_requirements table
CREATE TABLE IF NOT EXISTS project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  user_story TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents(type);
CREATE INDEX IF NOT EXISTS idx_project_requirements_project_id ON project_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_requirements_status ON project_requirements(status);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view public projects" ON projects;
CREATE POLICY "Users can view public projects" ON projects
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for project_documents
DROP POLICY IF EXISTS "Users can view documents of their projects" ON project_documents;
CREATE POLICY "Users can view documents of their projects" ON project_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_documents.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can view documents of public projects" ON project_documents;
CREATE POLICY "Users can view documents of public projects" ON project_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_documents.project_id 
      AND projects.is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can insert documents to their projects" ON project_documents;
CREATE POLICY "Users can insert documents to their projects" ON project_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_documents.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can update documents of their projects" ON project_documents;
CREATE POLICY "Users can update documents of their projects" ON project_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_documents.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can delete documents of their projects" ON project_documents;
CREATE POLICY "Users can delete documents of their projects" ON project_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_documents.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

-- Create RLS policies for project_requirements
DROP POLICY IF EXISTS "Users can view requirements of their projects" ON project_requirements;
CREATE POLICY "Users can view requirements of their projects" ON project_requirements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_requirements.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can view requirements of public projects" ON project_requirements;
CREATE POLICY "Users can view requirements of public projects" ON project_requirements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_requirements.project_id 
      AND projects.is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can insert requirements to their projects" ON project_requirements;
CREATE POLICY "Users can insert requirements to their projects" ON project_requirements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_requirements.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can update requirements of their projects" ON project_requirements;
CREATE POLICY "Users can update requirements of their projects" ON project_requirements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_requirements.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can delete requirements of their projects" ON project_requirements;
CREATE POLICY "Users can delete requirements of their projects" ON project_requirements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_requirements.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Competition', 'Program', 'Accelerator', 'Incubator', 'Grant', 'Fellowship', 'Challenge')),
  close_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Coming Soon')),
  link TEXT,
  eligible_countries TEXT[] NOT NULL DEFAULT '{}',
  for_female_founders BOOLEAN NOT NULL DEFAULT false,
  sectors_of_interest TEXT[] NOT NULL DEFAULT '{}',
  created_by TEXT, -- User ID of admin who created it
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_close_date ON opportunities(close_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_for_female_founders ON opportunities(for_female_founders);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);

-- Enable Row Level Security for opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for opportunities (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view opportunities" ON opportunities;
CREATE POLICY "Anyone can view opportunities" ON opportunities
  FOR SELECT USING (true);

-- Note: Admin write policies would need to be implemented based on your admin system
-- For now, we'll allow authenticated users to insert (you can restrict this further)
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON opportunities;
CREATE POLICY "Authenticated users can insert opportunities" ON opportunities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update opportunities they created" ON opportunities;
CREATE POLICY "Users can update opportunities they created" ON opportunities
  FOR UPDATE USING (auth.uid()::text = created_by);

DROP POLICY IF EXISTS "Users can delete opportunities they created" ON opportunities;
CREATE POLICY "Users can delete opportunities they created" ON opportunities
  FOR DELETE USING (auth.uid()::text = created_by);

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_documents_updated_at ON project_documents;
CREATE TRIGGER update_project_documents_updated_at BEFORE UPDATE ON project_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_requirements_updated_at ON project_requirements;
CREATE TRIGGER update_project_requirements_updated_at BEFORE UPDATE ON project_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_opportunities_updated_at ON opportunities;
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
