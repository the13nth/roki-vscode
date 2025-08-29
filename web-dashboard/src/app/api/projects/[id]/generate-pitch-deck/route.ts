import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { auth } from '@clerk/nextjs/server';
import pptxgen from 'pptxgenjs';

const tokenTrackingService = new TokenTrackingService();

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface PitchDeckRequest {
  audience?: 'investor' | 'customer' | 'partner' | 'technical';
  slideCount?: number;
  tone?: 'professional' | 'casual' | 'technical';
  includeSections?: string[];
  projectData?: {
    metadata?: any;
    analyses?: Record<string, any>;
    contextDocuments?: any[];
  };
}

interface Slide {
  title: string;
  type: 'title' | 'problem' | 'solution' | 'market' | 'business' | 'team' | 'financial' | 'ask' | 'overview' | 'features' | 'progress' | 'roadmap';
  content: {
    bulletPoints: string[];
    speakerNotes: string;
  };
  layout: 'title' | 'content' | 'split';
  order: number;
}

interface PitchDeckResult {
  slides: Slide[];
  metadata: {
    generationTime: number;
    model: string;
    tokenUsage: number;
    cost: number;
  };
  summary: string;
  pptxBuffer?: Buffer;
  pptxFileName?: string;
}

function getGlobalConfigPath(): string {
  return path.join(process.cwd(), '.ai-project', 'global-api-config.json');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generatePowerPointPresentation(
  slides: Slide[], 
  projectName: string, 
  audience: string,
  projectData?: any
): Promise<{ buffer: Buffer; fileName: string }> {
  // Create a new presentation
  const pres = new pptxgen();
  
  // Set presentation properties
  pres.author = 'Roki AI Project Manager';
  pres.company = 'Roki';
  pres.title = `${projectName} - Pitch Deck`;
  pres.subject = `Pitch deck for ${audience} audience`;
  
  // Define slide layouts and themes
  const titleLayout = { name: 'TITLE_SLIDE', width: 13.33, height: 7.5 };
  const contentLayout = { name: 'CONTENT_SLIDE', width: 13.33, height: 7.5 };
  
  // Color scheme
  const colors = {
    primary: '2E86AB',
    secondary: 'A23B72',
    accent: 'F18F01',
    dark: 'C73E1D',
    light: 'F8F9FA',
    text: '212529'
  };

  // Add slides
  slides.forEach((slide, index) => {
    const pptxSlide = pres.addSlide();
    
    // Set slide background
    pptxSlide.background = { color: colors.light };
    
    // Add slide title
    pptxSlide.addText(slide.title, {
      x: 0.5,
      y: 0.3,
      w: 12.33,
      h: 1.2,
      fontSize: 28,
      fontFace: 'Arial',
      bold: true,
      color: colors.primary,
      align: 'left',
      valign: 'top'
    });
    
    // Add slide type badge
    pptxSlide.addText(slide.type.toUpperCase(), {
      x: 11.5,
      y: 0.3,
      w: 1.5,
      h: 0.4,
      fontSize: 10,
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      fill: { color: colors.secondary }
    });
    
    // Add bullet points
    if (slide.content.bulletPoints && slide.content.bulletPoints.length > 0) {
      const bulletPoints = slide.content.bulletPoints.map(point => ({
        text: point,
        options: { breakLine: true }
      }));
      
      pptxSlide.addText(bulletPoints, {
        x: 0.5,
        y: 1.8,
        w: 6,
        h: 4.5,
        fontSize: 16,
        fontFace: 'Arial',
        color: colors.text,
        align: 'left',
        valign: 'top',
        bullet: { type: 'bullet' }
      });
    }
    
    // Add speaker notes
    if (slide.content.speakerNotes) {
      pptxSlide.addNotes(slide.content.speakerNotes);
    }
    
    // Add slide number
    pptxSlide.addText(`${index + 1}`, {
      x: 12.5,
      y: 6.8,
      w: 0.5,
      h: 0.3,
      fontSize: 12,
      fontFace: 'Arial',
      color: colors.primary,
      align: 'center',
      valign: 'middle'
    });
    
    // Add layout indicator
    const layoutIcon = slide.layout === 'title' ? '🎯' : slide.layout === 'content' ? '📝' : '📊';
    pptxSlide.addText(layoutIcon, {
      x: 0.2,
      y: 6.8,
      w: 0.5,
      h: 0.3,
      fontSize: 16,
      align: 'center',
      valign: 'middle'
    });
  });
  
  // Generate the presentation
  const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer;
  const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_PitchDeck_${audience}_${new Date().toISOString().split('T')[0]}.pptx`;
  
  return { buffer, fileName };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body: PitchDeckRequest = await request.json();
    const { 
      audience = 'investor', 
      slideCount = 10, 
      tone = 'professional',
      includeSections = ['overview', 'problem', 'solution', 'market', 'business', 'team', 'financial', 'ask'],
      projectData
    } = body;

    console.log(`🎯 Generating pitch deck for project ${projectId}`);
    console.log(`👥 Audience: ${audience}, 📊 Slides: ${slideCount}, 🎭 Tone: ${tone}`);

    // Load project documents and analysis results
    const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
    
    let requirements = '';
    let design = '';
    let tasks = '';
    let progress = null;
    let config = null;
    let analysisResults: Record<string, any> = {};
    let contextDocuments: any[] = [];
    let projectMetadata: any = {};

    try {
      // Load project documents
      const [reqContent, designContent, tasksContent] = await Promise.allSettled([
        fs.readFile(path.join(projectPath, 'requirements.md'), 'utf-8'),
        fs.readFile(path.join(projectPath, 'design.md'), 'utf-8'),
        fs.readFile(path.join(projectPath, 'tasks.md'), 'utf-8')
      ]);

      requirements = reqContent.status === 'fulfilled' ? reqContent.value : '';
      design = designContent.status === 'fulfilled' ? designContent.value : '';
      tasks = tasksContent.status === 'fulfilled' ? tasksContent.value : '';

      // Load progress and config
      try {
        const progressContent = await fs.readFile(path.join(projectPath, 'progress.json'), 'utf-8');
        progress = JSON.parse(progressContent);
      } catch (error) {
        console.log('No progress file found');
      }

      try {
        const configContent = await fs.readFile(path.join(projectPath, 'config.json'), 'utf-8');
        config = JSON.parse(configContent);
      } catch (error) {
        console.log('No config file found');
      }

      // Use project data provided by frontend (already fetched)
      if (projectData) {
        console.log('📊 Using project data provided by frontend...');
        
        // Use provided metadata
        if (projectData.metadata) {
          projectMetadata = {
            name: projectData.metadata.name || config?.name || 'Unnamed Project',
            description: projectData.metadata.description || config?.description || 'No description available',
            template: projectData.metadata.template || config?.template || 'Unknown',
            technologyStack: projectData.metadata.technologyStack || [],
            market: projectData.metadata.market || '',
            targetAudience: projectData.metadata.targetAudience || '',
            businessModel: projectData.metadata.businessModel || '',
            revenueStreams: projectData.metadata.revenueStreams || [],
            competitiveAdvantage: projectData.metadata.competitiveAdvantage || '',
            keyFeatures: projectData.metadata.keyFeatures || [],
            challenges: projectData.metadata.challenges || [],
            opportunities: projectData.metadata.opportunities || [],
            risks: projectData.metadata.risks || [],
            timeline: projectData.metadata.timeline || '',
            budget: projectData.metadata.budget || '',
            team: projectData.metadata.team || [],
            stakeholders: projectData.metadata.stakeholders || [],
            successMetrics: projectData.metadata.successMetrics || [],
            ...projectData.metadata
          };
          
          // Override config with actual project data
          config = {
            name: projectMetadata.name,
            description: projectMetadata.description,
            template: projectMetadata.template,
            ...config
          };
        }
        
        // Use provided analysis results
        if (projectData.analyses) {
          analysisResults = projectData.analyses;
          console.log(`✅ Using ${Object.keys(analysisResults).length} analysis results from frontend: ${Object.keys(analysisResults).join(', ')}`);
        }
        
        // Use provided context documents
        if (projectData.contextDocuments) {
          contextDocuments = projectData.contextDocuments;
          console.log(`✅ Using ${contextDocuments.length} context documents from frontend`);
        }
      } else {
        // Fallback: try to load from Pinecone if no data provided
        console.log('⚠️ No project data provided by frontend, attempting Pinecone fallback...');
        try {
          const { PineconeSyncServiceInstance } = await import('@/lib/pineconeSyncService');
          const pineconeResult = await PineconeSyncServiceInstance.downloadProject(projectId);
          
          if (pineconeResult.success && pineconeResult.data?.project) {
            const pineconeProjectData = pineconeResult.data.project;
            console.log('✅ Loaded project data from Pinecone fallback:', pineconeProjectData.name);
            
            projectMetadata = {
              name: pineconeProjectData.name || config?.name || 'Unnamed Project',
              description: pineconeProjectData.description || config?.description || 'No description available',
              template: pineconeProjectData.template || config?.template || 'Unknown',
              technologyStack: pineconeProjectData.technologyStack || [],
              market: pineconeProjectData.market || '',
              targetAudience: pineconeProjectData.targetAudience || '',
              businessModel: pineconeProjectData.businessModel || '',
              revenueStreams: pineconeProjectData.revenueStreams || [],
              competitiveAdvantage: pineconeProjectData.competitiveAdvantage || '',
              keyFeatures: pineconeProjectData.keyFeatures || [],
              challenges: pineconeProjectData.challenges || [],
              opportunities: pineconeProjectData.opportunities || [],
              risks: pineconeProjectData.risks || [],
              timeline: pineconeProjectData.timeline || '',
              budget: pineconeProjectData.budget || '',
              team: pineconeProjectData.team || [],
              stakeholders: pineconeProjectData.stakeholders || [],
              successMetrics: pineconeProjectData.successMetrics || [],
              ...pineconeProjectData
            };
            
            config = {
              name: projectMetadata.name,
              description: projectMetadata.description,
              template: projectMetadata.template,
              ...config
            };
            
            if (pineconeProjectData.analyses) {
              analysisResults = pineconeProjectData.analyses;
              console.log(`✅ Loaded ${Object.keys(analysisResults).length} analysis results from Pinecone fallback`);
            }
            
            if (pineconeProjectData.contextDocuments) {
              contextDocuments = pineconeProjectData.contextDocuments;
              console.log(`✅ Loaded ${contextDocuments.length} context documents from Pinecone fallback`);
            }
          }
        } catch (error) {
          console.warn('⚠️ Pinecone fallback also failed:', error);
          console.log('🔄 Using minimal project data...');
          
          if (config) {
            projectMetadata = {
              name: config.name || 'Unnamed Project',
              description: config.description || 'No description available',
              template: config.template || 'Unknown',
              technologyStack: [],
              market: '',
              targetAudience: '',
              businessModel: '',
              revenueStreams: [],
              competitiveAdvantage: '',
              keyFeatures: [],
              challenges: [],
              opportunities: [],
              risks: [],
              timeline: '',
              budget: '',
              team: [],
              stakeholders: [],
              successMetrics: []
            };
          }
        }
      }

    } catch (error) {
      console.error('Error loading project documents:', error);
      return NextResponse.json(
        { error: 'Failed to load project documents' },
        { status: 500 }
      );
    }

    // Validate secure configuration
    const configValidation = validateSecureConfig();
    if (!configValidation.isValid) {
      console.error('❌ Secure configuration validation failed:', configValidation.errors);
      return NextResponse.json(
        { error: `Configuration error: ${configValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Try to get Google AI configuration from environment
    let apiConfig: ApiConfiguration;
    try {
      apiConfig = getGoogleAIConfig();
      console.log('✅ Using secure Google AI configuration from environment');
    } catch (error) {
      console.warn('⚠️ Failed to get Google AI config from environment, falling back to global config file');
      
      // Fallback to global configuration file
      const globalConfigPath = getGlobalConfigPath();
      if (!await fileExists(globalConfigPath)) {
        return NextResponse.json(
          { error: 'No AI configuration found. Please set GOOGLE_AI_API_KEY environment variable or configure an AI provider in the global settings.' },
          { status: 400 }
        );
      }

      const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
      apiConfig = JSON.parse(globalConfigData);
    }

    console.log(`🤖 Using AI provider: ${apiConfig.provider} with model: ${apiConfig.model}`);
    
    // Log comprehensive data summary
    console.log('📊 Data Sources Summary:');
    console.log(`  - Project Metadata: ${Object.keys(projectMetadata).length} fields`);
    console.log(`  - Requirements: ${requirements.length} characters`);
    console.log(`  - Design: ${design.length} characters`);
    console.log(`  - Tasks: ${tasks.length} characters`);
    console.log(`  - Progress: ${progress ? 'Available' : 'Not available'}`);
    console.log(`  - Context Documents: ${contextDocuments.length} documents`);
    console.log(`  - Analysis Results: ${Object.keys(analysisResults).length} analyses`);
    
    if (contextDocuments.length > 0) {
      console.log('  - Context Document Categories:', contextDocuments.map(doc => doc.category).filter(Boolean));
    }
    
    if (Object.keys(analysisResults).length > 0) {
      console.log('  - Analysis Types:', Object.keys(analysisResults));
    }

    // Ensure we have at least basic project information
    if (!config?.name && !projectMetadata.name) {
      console.log('⚠️ No project name found, using default...');
      config = { ...config, name: 'Unnamed Project' };
    }
    
    if (!config?.description && !projectMetadata.description) {
      console.log('⚠️ No project description found, using default...');
      config = { ...config, description: 'A project managed with Roki AI Project Manager' };
    }

    // Generate pitch deck using AI
    const prompt = `
You are a professional pitch deck creator and business strategist with expertise in creating compelling, data-driven presentations. Create a comprehensive and detailed pitch deck that demonstrates deep understanding of the project and leverages ALL available information.

PROJECT INFORMATION:
${config ? `Project Name: ${config.name || 'Unnamed Project'}` : ''}
${config ? `Description: ${config.description || 'No description available'}` : ''}
${config ? `Template: ${config.template || 'Unknown'}` : ''}

PROJECT METADATA:
${Object.keys(projectMetadata).length > 0 ? Object.entries(projectMetadata).map(([key, value]) => {
  if (key === 'name' || key === 'description' || key === 'template') return '';
  if (Array.isArray(value)) {
    return `${key}: ${value.join(', ')}`;
  }
  return `${key}: ${value}`;
}).filter(Boolean).join('\n') : 'No additional metadata available'}

REQUIREMENTS:
${requirements || 'No requirements document available'}

DESIGN:
${design || 'No design document available'}

TASKS:
${tasks || 'No tasks document available'}

PROGRESS:
${progress ? `
- Total Tasks: ${progress.totalTasks || 0}
- Completed Tasks: ${progress.completedTasks || 0}
- Progress: ${progress.percentage || 0}%
- Last Updated: ${progress.lastUpdated || 'Unknown'}
` : 'No progress data available'}

CONTEXT DOCUMENTS:
${contextDocuments.length > 0 ? contextDocuments.map((doc, index) => `
DOCUMENT ${index + 1} - ${doc.title || 'Untitled'} (${doc.category || 'Unknown Category'}):
${doc.content ? doc.content.substring(0, 1200) + (doc.content.length > 1200 ? '...' : '') : 'No content'}
${doc.tags && doc.tags.length > 0 ? `Tags: ${doc.tags.join(', ')}` : ''}
${doc.url ? `Source: ${doc.url}` : ''}
`).join('\n') : 'No context documents available'}

CONTEXT DOCUMENT INSIGHTS:
${contextDocuments.length > 0 ? `
Use these context documents to enhance your pitch deck with:
- Market research and industry insights
- Technical specifications and requirements
- Competitive analysis and positioning
- User research and feedback
- Regulatory and compliance information
- Financial data and projections
- Strategic partnerships and opportunities
- Risk assessments and mitigation strategies
- Industry trends and market dynamics
- Customer pain points and solutions
- Technology stack and architecture details
- Business model validation
` : ''}

ANALYSIS RESULTS:
${Object.keys(analysisResults).length > 0 ? Object.entries(analysisResults).map(([type, data]) => `
${type.toUpperCase()} ANALYSIS:
${data.summary ? `Summary: ${data.summary}` : ''}
${data.strengths ? `Strengths: ${Array.isArray(data.strengths) ? data.strengths.join(', ') : data.strengths}` : ''}
${data.weaknesses ? `Weaknesses: ${Array.isArray(data.weaknesses) ? data.weaknesses.join(', ') : data.weaknesses}` : ''}
${data.opportunities ? `Opportunities: ${Array.isArray(data.opportunities) ? data.opportunities.join(', ') : data.opportunities}` : ''}
${data.threats ? `Threats: ${Array.isArray(data.threats) ? data.threats.join(', ') : data.threats}` : ''}
${data.marketSize ? `Market Size: ${data.marketSize}` : ''}
${data.targetAudience ? `Target Audience: ${data.targetAudience}` : ''}
${data.competitiveAdvantage ? `Competitive Advantage: ${data.competitiveAdvantage}` : ''}
${data.revenueStreams ? `Revenue Streams: ${Array.isArray(data.revenueStreams) ? data.revenueStreams.join(', ') : data.revenueStreams}` : ''}
${data.keyTechnologies ? `Key Technologies: ${Array.isArray(data.keyTechnologies) ? data.keyTechnologies.join(', ') : data.keyTechnologies}` : ''}
${data.scalabilityConsiderations ? `Scalability: ${data.scalabilityConsiderations}` : ''}
${data.riskAssessment ? `Risk Assessment: ${data.riskAssessment}` : ''}
${data.recommendations ? `Recommendations: ${Array.isArray(data.recommendations) ? data.recommendations.join(', ') : data.recommendations}` : ''}
${data.nextSteps ? `Next Steps: ${Array.isArray(data.nextSteps) ? data.nextSteps.join(', ') : data.nextSteps}` : ''}
${data.financialProjections ? `Financial Projections: ${data.financialProjections}` : ''}
${data.marketTrends ? `Market Trends: ${data.marketTrends}` : ''}
${data.competitiveLandscape ? `Competitive Landscape: ${data.competitiveLandscape}` : ''}
${data.technicalArchitecture ? `Technical Architecture: ${data.technicalArchitecture}` : ''}
${data.userExperience ? `User Experience: ${data.userExperience}` : ''}
${data.regulatoryCompliance ? `Regulatory Compliance: ${data.regulatoryCompliance}` : ''}
${data.sustainability ? `Sustainability: ${data.sustainability}` : ''}
${data.innovationMetrics ? `Innovation Metrics: ${data.innovationMetrics}` : ''}
${data.businessModel ? `Business Model: ${data.businessModel}` : ''}
${data.customerSegments ? `Customer Segments: ${data.customerSegments}` : ''}
${data.valueProposition ? `Value Proposition: ${data.valueProposition}` : ''}
${data.keyPartners ? `Key Partners: ${data.keyPartners}` : ''}
${data.keyActivities ? `Key Activities: ${data.keyActivities}` : ''}
${data.keyResources ? `Key Resources: ${data.keyResources}` : ''}
${data.channels ? `Channels: ${data.channels}` : ''}
${data.customerRelationships ? `Customer Relationships: ${data.customerRelationships}` : ''}
${data.costStructure ? `Cost Structure: ${data.costStructure}` : ''}
${data.revenueModel ? `Revenue Model: ${data.revenueModel}` : ''}
${data.metrics ? `Key Metrics: ${data.metrics}` : ''}
${data.unfairAdvantage ? `Unfair Advantage: ${data.unfairAdvantage}` : ''}
${data.problem ? `Problem Statement: ${data.problem}` : ''}
${data.solution ? `Solution: ${data.solution}` : ''}
${data.marketValidation ? `Market Validation: ${data.marketValidation}` : ''}
${data.traction ? `Traction: ${data.traction}` : ''}
${data.team ? `Team: ${data.team}` : ''}
${data.funding ? `Funding: ${data.funding}` : ''}
${data.milestones ? `Milestones: ${data.milestones}` : ''}
${data.roadmap ? `Roadmap: ${data.roadmap}` : ''}
`).join('\n') : 'No analysis results available'}

CRITICAL REQUIREMENTS FOR PITCH DECK GENERATION:

1. **COMPREHENSIVE CONTENT**: Create detailed, informative slides that demonstrate deep understanding of the project. Each slide should be rich with specific details, data points, and insights.

2. **DATA-DRIVEN APPROACH**: Use ALL available information from:
   - Project metadata and configuration
   - Requirements, design, and task documents
   - Progress tracking data
   - Context documents (research, articles, specifications)
   - All analysis results (technical, market, business, financial, etc.)
   - Any specific insights, recommendations, or findings

3. **DETAILED SLIDE CONTENT**: Each slide should include:
   - Specific bullet points with concrete details
   - Data-driven insights and metrics
   - Technical specifications when relevant
   - Market analysis and competitive positioning
   - Financial projections and business model details
   - Team capabilities and achievements
   - Clear value propositions and unique selling points

4. **AUDIENCE-SPECIFIC FOCUS**: Tailor content for ${audience} audience:
   - Investors: Focus on market opportunity, financial projections, team, competitive advantage
   - Customers: Focus on problem-solving, benefits, features, user experience
   - Partners: Focus on collaboration opportunities, mutual benefits, market reach
   - Technical: Focus on technology stack, architecture, scalability, innovation

5. **PROFESSIONAL TONE**: Maintain ${tone} tone throughout while being engaging and compelling.

6. **STRUCTURED APPROACH**: Create a logical flow that tells a complete story:
   - Problem/Opportunity
   - Solution/Product
   - Market and Competition
   - Business Model and Revenue
   - Team and Execution
   - Financial Projections
   - Ask/Next Steps

7. **SPECIFIC DETAILS**: Include:
   - Exact market sizes and growth rates
   - Specific technology choices and rationale
   - Detailed competitive analysis
   - Concrete financial projections
   - Specific team qualifications
   - Clear milestones and timelines
   - Quantified value propositions

8. **COMPREHENSIVE COVERAGE**: Ensure the pitch deck covers:
   - Executive Summary
   - Problem Statement
   - Solution Overview
   - Market Analysis
   - Competitive Landscape
   - Business Model
   - Technology & Architecture
   - Team & Advisors
   - Financial Projections
   - Funding Requirements
   - Risk Assessment
   - Go-to-Market Strategy
   - Milestones & Timeline

PITCH DECK REQUIREMENTS:
- Target Audience: ${audience}
- Number of Slides: ${slideCount}
- Tone: ${tone}
- Include Sections: ${includeSections.join(', ')}

INSTRUCTIONS:
Create a structured pitch deck with ${slideCount} slides. For each slide, provide:

1. SLIDE TITLE: Clear, compelling title
2. SLIDE TYPE: One of [title, problem, solution, market, business, team, financial, ask, overview, features, progress, roadmap]
3. BULLET POINTS: 4-6 detailed points with specific information (max 8 words each)
4. SPEAKER NOTES: 3-4 sentences with comprehensive explanation and specific details

IMPORTANT: This pitch deck should demonstrate that you have thoroughly analyzed and understood every aspect of the project. Use specific details, data points, and insights from all available sources. Make each slide comprehensive and informative, not generic or superficial.

If extensive data is available, leverage it to create a data-driven, compelling pitch that shows deep project understanding. If data is limited, be honest about current status while focusing on potential and vision.
5. LAYOUT: One of [title, content, split]

SLIDE STRUCTURE:
${includeSections.includes('overview') ? '- SLIDE 1: Title slide with project name and tagline' : ''}
${includeSections.includes('problem') ? '- SLIDE 2: Problem statement - what problem does this solve?' : ''}
${includeSections.includes('solution') ? '- SLIDE 3: Solution overview - how does this solve the problem?' : ''}
${includeSections.includes('market') ? '- SLIDE 4: Market opportunity - size, growth, target audience' : ''}
${includeSections.includes('business') ? '- SLIDE 5: Business model - how will this make money?' : ''}
${includeSections.includes('team') ? '- SLIDE 6: Team & execution - who will build this?' : ''}
${includeSections.includes('financial') ? '- SLIDE 7: Financial projections - revenue, costs, growth' : ''}
${includeSections.includes('ask') ? '- SLIDE 8: Ask/Investment - what do you need and why?' : ''}

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "slides": [
    {
      "title": "Slide Title",
      "type": "slide_type",
      "content": {
        "bulletPoints": ["Point 1", "Point 2", "Point 3"],
        "speakerNotes": "Speaker notes for this slide"
      },
      "layout": "layout_type",
      "order": 1
    }
  ],
  "summary": "Brief summary of the pitch deck"
}

Make the pitch deck:
- Compelling and engaging for ${audience} audience
- Professional and credible with ${tone} tone
- Focused on value proposition
- Backed by concrete details from ALL available project data
- Incorporate insights from context documents and analysis results
- Use specific data points, metrics, and examples from the project
- Address the unique aspects and competitive advantages identified
- Include relevant market insights and technical details
- Concise but comprehensive
- Ready for presentation

IMPORTANT: Use ALL available information from:
- Project metadata and configuration
- Requirements, design, and task documents
- Progress tracking data
- Context documents (research, articles, specifications)
- All analysis results (technical, market, business, financial, etc.)
- Any specific insights, recommendations, or findings

If project data is limited, focus on potential and vision while being honest about current status. If extensive data is available, leverage it to create a data-driven, compelling pitch.
`;

    // Call AI service
    let pitchDeckContent: string;
    let inputTokens: number;
    let outputTokens: number;

    try {
      if (apiConfig.provider === 'google') {
        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 6000,
            temperature: 0.4,
          }
        };

        console.log('🤖 Sending pitch deck generation request to Gemini API...');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model}:generateContent?key=${apiConfig.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini API error ${response.status}:`, errorText);
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        pitchDeckContent = result.candidates[0].content.parts[0].text;

        // Calculate token usage (approximate)
        inputTokens = Math.ceil(prompt.length / 4);
        outputTokens = Math.ceil(pitchDeckContent.length / 4);

      } else {
        throw new Error(`Unsupported AI provider: ${apiConfig.provider}`);
      }
    } catch (error) {
      console.error('❌ AI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate pitch deck using AI service' },
        { status: 500 }
      );
    }

    const totalTokens = inputTokens + outputTokens;
    const cost = (inputTokens / 1000) * 0.000125 + (outputTokens / 1000) * 0.000375; // Gemini pricing

    // Parse the JSON response
    let pitchDeckResult: any;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = pitchDeckContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        pitchDeckResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.log('Raw response:', pitchDeckContent);
      
      // Fallback: create a basic pitch deck structure
      pitchDeckResult = {
        slides: [
          {
            title: config?.name || 'Project Pitch',
            type: 'title',
            content: {
              bulletPoints: ['Project Overview', 'Key Features', 'Market Opportunity'],
              speakerNotes: 'Introduction to the project and its key value propositions.'
            },
            layout: 'title',
            order: 1
          }
        ],
        summary: 'Pitch deck generated with fallback structure due to parsing error.'
      };
    }

    // Validate and clean the slides
    const validatedSlides: Slide[] = (pitchDeckResult.slides || []).map((slide: any, index: number) => ({
      title: slide.title || `Slide ${index + 1}`,
      type: slide.type || 'content',
      content: {
        bulletPoints: Array.isArray(slide.content?.bulletPoints) ? slide.content.bulletPoints : ['Content not available'],
        speakerNotes: slide.content?.speakerNotes || 'Speaker notes not available'
      },
      layout: slide.layout || 'content',
      order: slide.order || index + 1
    }));

    // Generate PowerPoint presentation
    let pptxBuffer: Buffer | undefined;
    let pptxFileName: string | undefined;
    
    try {
      console.log('📊 Generating PowerPoint presentation...');
      const pptxResult = await generatePowerPointPresentation(
        validatedSlides, 
        config?.name || 'Project', 
        audience,
        { metadata: projectMetadata, analyses: analysisResults, contextDocuments }
      );
      pptxBuffer = pptxResult.buffer;
      pptxFileName = pptxResult.fileName;
      console.log('✅ PowerPoint presentation generated successfully');
    } catch (error) {
      console.warn('⚠️ Failed to generate PowerPoint presentation:', error);
    }

    const result: PitchDeckResult = {
      slides: validatedSlides,
      metadata: {
        generationTime: Date.now() - startTime,
        model: apiConfig.model,
        tokenUsage: totalTokens,
        cost
      },
      summary: pitchDeckResult.summary || 'Pitch deck generated successfully',
      pptxBuffer,
      pptxFileName
    };

    // Track token usage
    try {
      await tokenTrackingService.trackTokenUsage(projectId, inputTokens, outputTokens, 'pitch-deck-generation', userId);
    } catch (error) {
      console.warn('⚠️ Failed to track token usage (Pinecone may be unavailable):', error);
      console.log('🔄 Continuing without token tracking...');
    }

    console.log('✅ Pitch deck generated successfully');
    console.log(`📊 Token usage: ${totalTokens} tokens, $${cost.toFixed(4)} cost`);
    console.log(`📈 Generated ${validatedSlides.length} slides`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Pitch deck generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate pitch deck' },
      { status: 500 }
    );
  }
}
