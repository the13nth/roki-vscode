import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { getGoogleAIConfig } from '@/lib/secureConfig';

interface EnhancedSpecsRequest {
  enhancementData: {
    stage: string;
    content: string;
    marketAnalysis?: any;
    riskAssessment?: any;
    technicalRecommendations?: any;
    businessModel?: any;
  };
  projectProfile: {
    name: string;
    industry: string;
    businessModel: string;
    targetMarket: string;
    problemStatement: string;
  };
}

async function callGoogleAI(config: any, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  // Create an AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8000,
        },
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Google AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      tokenUsage: data.usageMetadata || {}
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 120 seconds. The AI response is taking longer than expected. Please try again.');
      }
      
      if (error.message.includes('fetch failed')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      }
    }
    
    throw error;
  }
}

function generateEnhancedSpecsPrompt(projectData: any, enhancementData: any, projectProfile: any): string {
  // Validate required parameters
  if (!projectProfile || !projectProfile.industry) {
    throw new Error('projectProfile.industry is required');
  }

  const industrySpecificSections = {
    'fintech': {
      requirements: `
### Financial Services Requirements
- **Regulatory Compliance**: PCI DSS Level 1, KYC/AML procedures, SOX compliance
- **Security Requirements**: End-to-end encryption, fraud detection, secure API endpoints
- **Integration Requirements**: Banking APIs, payment processors, credit bureaus
- **Audit Requirements**: Transaction logging, compliance reporting, audit trails`,
      
      design: `
### Financial Architecture Components
- **Payment Processing Engine**: Multi-currency, real-time processing, fraud detection
- **Compliance Module**: KYC verification, AML monitoring, regulatory reporting
- **Security Layer**: Multi-factor authentication, encryption, secure communications
- **Integration Layer**: Banking APIs, payment gateways, financial data providers`,
      
      tasks: `
### Financial Services Implementation
- [ ] 1.1 Implement PCI DSS compliance framework
- [ ] 1.2 Set up secure payment processing infrastructure
- [ ] 1.3 Integrate KYC/AML verification systems
- [ ] 1.4 Implement fraud detection algorithms
- [ ] 1.5 Set up regulatory reporting mechanisms`
    },
    
    'healthtech': {
      requirements: `
### Healthcare Requirements
- **HIPAA Compliance**: Patient data encryption, access controls, audit logging
- **Clinical Requirements**: EHR integration, clinical workflows, patient safety
- **Regulatory Requirements**: FDA compliance, clinical validation, quality assurance
- **Interoperability**: HL7 FHIR standards, healthcare system integration`,
      
      design: `
### Healthcare System Architecture
- **Patient Data Management**: Secure PHI storage, access controls, data encryption
- **Clinical Workflow Engine**: Provider workflows, patient care coordination
- **Integration Layer**: EHR systems, medical devices, healthcare APIs
- **Compliance Framework**: HIPAA controls, audit logging, security monitoring`,
      
      tasks: `
### Healthcare Implementation
- [ ] 1.1 Implement HIPAA compliance framework
- [ ] 1.2 Set up secure patient data management
- [ ] 1.3 Integrate with EHR systems using HL7 FHIR
- [ ] 1.4 Implement clinical workflow management
- [ ] 1.5 Set up healthcare provider credentialing`
    },
    
    'edtech': {
      requirements: `
### Educational Technology Requirements
- **FERPA Compliance**: Student data privacy, parental consent, data access controls
- **Accessibility**: WCAG 2.1 AA compliance, screen reader support, keyboard navigation
- **Learning Standards**: SCORM compliance, xAPI integration, learning analytics
- **Scalability**: Multi-tenant architecture, global content delivery`,
      
      design: `
### Educational Platform Architecture
- **Learning Management System**: Course delivery, progress tracking, assessment tools
- **Content Management**: Multimedia content, adaptive learning, personalization
- **Analytics Engine**: Learning analytics, performance tracking, insights dashboard
- **Integration Layer**: LMS integration, third-party tools, assessment platforms`,
      
      tasks: `
### Educational Platform Implementation
- [ ] 1.1 Implement FERPA compliance framework
- [ ] 1.2 Set up accessible learning interface (WCAG 2.1 AA)
- [ ] 1.3 Integrate learning analytics and progress tracking
- [ ] 1.4 Implement adaptive learning algorithms
- [ ] 1.5 Set up multi-tenant content management`
    }
  };

  const industrySection = industrySpecificSections[projectProfile.industry as keyof typeof industrySpecificSections] || {
    requirements: '### Industry-Specific Requirements\n- Industry compliance and standards\n- Integration requirements\n- Security and privacy requirements',
    design: '### Industry Architecture\n- Core system components\n- Integration architecture\n- Security and compliance layer',
    tasks: '### Industry Implementation\n- [ ] 1.1 Implement industry compliance\n- [ ] 1.2 Set up core system architecture\n- [ ] 1.3 Integrate with industry standards'
  };

  return `You are a senior technical architect and product manager specializing in ${projectProfile.industry} solutions.

PROJECT CONTEXT:
- Industry: ${projectProfile.industry}
- Business Model: ${projectProfile.businessModel}
- Target Market: ${projectProfile.targetMarket}
- Problem Statement: ${projectProfile.problemStatement}

ENHANCED PROJECT DATA:
${JSON.stringify(enhancementData, null, 2)}

TASK: Generate production-ready specifications that incorporate industry best practices, regulatory requirements, and scalable architecture patterns.

Generate three comprehensive documents:

## 1. REQUIREMENTS.md

Structure:
\`\`\`markdown
# ${projectData.name} - Requirements Document

## 1. Introduction
[Comprehensive project overview with business context]

## 2. Stakeholder Analysis
### 2.1 Primary Stakeholders
### 2.2 Secondary Stakeholders
### 2.3 Stakeholder Requirements Matrix

## 3. Functional Requirements
### 3.1 Core Features
**Requirement 3.1.1: [Feature Name]**
- **User Story:** As a [role], I want to [action], so that [benefit]
- **Acceptance Criteria:**
  1. GIVEN [context] WHEN [action] THEN [expected result]
  2. GIVEN [context] WHEN [action] THEN [expected result]
- **Priority:** High/Medium/Low
- **Complexity:** High/Medium/Low

### 3.2 Advanced Features
[Continue with numbered requirements]

${industrySection.requirements}

## 4. Non-Functional Requirements
### 4.1 Performance Requirements
### 4.2 Security Requirements
### 4.3 Scalability Requirements
### 4.4 Reliability Requirements
### 4.5 Usability Requirements

## 5. Integration Requirements
### 5.1 External System Integrations
### 5.2 API Requirements
### 5.3 Data Exchange Requirements

## 6. Compliance Requirements
### 6.1 Regulatory Compliance
### 6.2 Industry Standards
### 6.3 Data Privacy Requirements

## 7. Success Metrics
### 7.1 Business Metrics
### 7.2 Technical Metrics
### 7.3 User Experience Metrics
\`\`\`

## 2. DESIGN.md

Structure:
\`\`\`markdown
# ${projectData.name} - System Design Document

## 1. Overview
[System overview with architecture philosophy]

## 2. System Architecture
### 2.1 High-Level Architecture
\`\`\`mermaid
graph TB
    A[Client Applications] --> B[API Gateway]
    B --> C[Application Services]
    C --> D[Business Logic Layer]
    D --> E[Data Access Layer]
    E --> F[Database Layer]
\`\`\`

### 2.2 Microservices Architecture
### 2.3 Data Flow Architecture

${industrySection.design}

## 3. Component Design
### 3.1 Frontend Components
\`\`\`typescript
interface UserDashboard {
  userId: string;
  preferences: UserPreferences;
  analytics: AnalyticsData;
}
\`\`\`

### 3.2 Backend Services
### 3.3 Database Design

## 4. API Design
### 4.1 RESTful API Endpoints
### 4.2 GraphQL Schema (if applicable)
### 4.3 Authentication & Authorization

## 5. Security Architecture
### 5.1 Authentication Strategy
### 5.2 Authorization Model
### 5.3 Data Encryption
### 5.4 Security Monitoring

## 6. Data Models
\`\`\`typescript
interface User {
  id: string;
  email: string;
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

## 7. Infrastructure Design
### 7.1 Cloud Architecture
### 7.2 Deployment Strategy
### 7.3 Monitoring & Observability
### 7.4 Disaster Recovery

## 8. Performance Optimization
### 8.1 Caching Strategy
### 8.2 Database Optimization
### 8.3 CDN Strategy

## 9. Testing Strategy
### 9.1 Unit Testing
### 9.2 Integration Testing
### 9.3 End-to-End Testing
### 9.4 Performance Testing
\`\`\`

## 3. TASKS.md

Structure:
\`\`\`markdown
# ${projectData.name} - Implementation Plan

## Phase 1: Foundation & MVP (Weeks 1-8)

### 1. Project Setup & Infrastructure
- [x] 1.1 Set up development environment
- [ ] 1.2 Configure CI/CD pipeline
- [ ] 1.3 Set up cloud infrastructure
- [ ] 1.4 Implement monitoring and logging
  - _Requirements: 4.2, 4.4_
  - _Estimated: 2 weeks_
  - _Dependencies: None_

### 2. Core Authentication & Security
- [ ] 2.1 Implement user authentication system
  - [ ] 2.1.1 Set up OAuth 2.0 integration
  - [ ] 2.1.2 Implement JWT token management
  - [ ] 2.1.3 Set up multi-factor authentication
- [ ] 2.2 Implement authorization framework
- [ ] 2.3 Set up data encryption
  - _Requirements: 4.2, 6.1_
  - _Estimated: 3 weeks_
  - _Dependencies: 1.2, 1.3_

${industrySection.tasks}

### 3. Core Business Logic
- [ ] 3.1 Implement core domain models
- [ ] 3.2 Set up business logic layer
- [ ] 3.3 Implement core workflows
  - _Requirements: 3.1.1, 3.1.2, 3.1.3_
  - _Estimated: 4 weeks_
  - _Dependencies: 2.1, 2.2_

## Phase 2: Feature Development (Weeks 9-16)

### 4. Advanced Features
- [ ] 4.1 Implement advanced user features
- [ ] 4.2 Set up analytics and reporting
- [ ] 4.3 Implement integration APIs
  - _Requirements: 3.2.1, 3.2.2, 5.1_
  - _Estimated: 6 weeks_
  - _Dependencies: 3.1, 3.2, 3.3_

### 5. Performance Optimization
- [ ] 5.1 Implement caching layer
- [ ] 5.2 Optimize database queries
- [ ] 5.3 Set up CDN and asset optimization
  - _Requirements: 4.1, 4.3_
  - _Estimated: 2 weeks_
  - _Dependencies: 4.1, 4.2_

## Phase 3: Testing & Launch (Weeks 17-20)

### 6. Comprehensive Testing
- [ ] 6.1 Complete unit test coverage (>90%)
- [ ] 6.2 Integration testing suite
- [ ] 6.3 End-to-end testing automation
- [ ] 6.4 Performance and load testing
- [ ] 6.5 Security penetration testing
  - _Requirements: All_
  - _Estimated: 3 weeks_
  - _Dependencies: All previous phases_

### 7. Production Deployment
- [ ] 7.1 Production environment setup
- [ ] 7.2 Data migration and seeding
- [ ] 7.3 Go-live deployment
- [ ] 7.4 Post-launch monitoring and support
  - _Requirements: All_
  - _Estimated: 1 week_
  - _Dependencies: 6.1, 6.2, 6.3, 6.4, 6.5_

## Risk Mitigation Tasks
- [ ] R.1 Implement backup and disaster recovery
- [ ] R.2 Set up security monitoring and alerting
- [ ] R.3 Create comprehensive documentation
- [ ] R.4 Establish support and maintenance procedures

## Success Criteria
- [ ] All functional requirements implemented and tested
- [ ] Performance benchmarks met (response time < 200ms)
- [ ] Security audit passed with no critical issues
- [ ] 99.9% uptime achieved in first month
- [ ] User acceptance testing completed successfully
\`\`\`

CRITICAL REQUIREMENTS:
1. Include specific industry compliance requirements for ${projectProfile.industry}
2. Incorporate scalability patterns for ${projectProfile.businessModel} business model
3. Include detailed acceptance criteria with GIVEN/WHEN/THEN format
4. Provide realistic time estimates and dependencies
5. Include comprehensive security and performance requirements
6. Use proper markdown formatting with code blocks and mermaid diagrams
7. Reference requirements by number in tasks (e.g., _Requirements: 3.1, 4.2_)

Return the specifications in the following Markdown format with clear section separators:

## REQUIREMENTS
[Complete requirements.md content here]

## DESIGN
[Complete design.md content here]

## TASKS
[Complete tasks.md content here]

IMPORTANT: 
- Use the exact section headers above (## REQUIREMENTS, ## DESIGN, ## TASKS)
- Keep content comprehensive but well-formatted
- Use proper markdown formatting
- No JSON formatting needed`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const requestData: EnhancedSpecsRequest = await request.json();

    // Validate request data
    if (!requestData.enhancementData || !requestData.projectProfile) {
      return NextResponse.json({ error: 'Missing required data: enhancementData and projectProfile are required' }, { status: 400 });
    }

    if (!requestData.projectProfile.industry) {
      return NextResponse.json({ error: 'Missing required field: projectProfile.industry is required' }, { status: 400 });
    }

    // Get project from service
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, projectId);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get API configuration
    const apiConfig = getGoogleAIConfig();
    
    // Generate enhanced specs prompt
    const prompt = generateEnhancedSpecsPrompt(project, requestData.enhancementData, requestData.projectProfile);
    
    // Call AI with retry logic
    let aiResponse: { content: string; tokenUsage: any } | undefined;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        aiResponse = await callGoogleAI(apiConfig, prompt);
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.log(`AI call attempt ${retryCount} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        if (retryCount > maxRetries) {
          // All retries exhausted, throw the error
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Ensure aiResponse is defined
    if (!aiResponse) {
      throw new Error('Failed to get AI response after all retry attempts');
    }
    
    // Parse Markdown response
    let specsData;
    try {
      const markdownContent = aiResponse.content.trim();
      
      // Extract sections using the clear headers
      const requirementsMatch = markdownContent.match(/## REQUIREMENTS\s*\n([\s\S]*?)(?=## DESIGN|$)/);
      const designMatch = markdownContent.match(/## DESIGN\s*\n([\s\S]*?)(?=## TASKS|$)/);
      const tasksMatch = markdownContent.match(/## TASKS\s*\n([\s\S]*?)$/);
      
      if (!requirementsMatch || !designMatch || !tasksMatch) {
        throw new Error('Could not find all required sections (REQUIREMENTS, DESIGN, TASKS) in AI response');
      }
      
      specsData = {
        requirements: requirementsMatch[1].trim(),
        design: designMatch[1].trim(),
        tasks: tasksMatch[1].trim()
      };
      
      // Validate that we have the required fields
      if (!specsData.requirements || !specsData.design || !specsData.tasks) {
        throw new Error('AI response missing required fields: requirements, design, or tasks');
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI response:', aiResponse.content);
      
      // Return a more helpful error message
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      return NextResponse.json({ 
        error: `Failed to parse AI-generated specifications: ${errorMessage}. The AI response may be malformed or missing required sections.` 
      }, { status: 500 });
    }

    // Update project with enhanced specs
    const updatedProject = {
      ...project,
      requirements: specsData.requirements,
      design: specsData.design,
      tasks: specsData.tasks,
      enhancementData: requestData.enhancementData,
      lastModified: new Date().toISOString()
    };

    const success = await projectService.updateProject(userId, projectId, updatedProject);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to save enhanced specifications' }, { status: 500 });
    }

    // Generate embeddings after specs are saved to Supabase
    try {
      console.log('🔄 Generating embeddings for project with complete specs...');
      await projectService.generateProjectEmbeddings(projectId);
      console.log('✅ Embeddings generated successfully');
    } catch (embeddingError) {
      console.warn('⚠️ Failed to generate embeddings, but specs were saved:', embeddingError);
      // Don't fail the entire request if embedding generation fails
    }

    // Track token usage
    try {
      const { TokenTrackingService } = await import('@/lib/tokenTrackingService');
      const tokenTrackingService = TokenTrackingService.getInstance();
      
      const inputTokens = aiResponse.tokenUsage?.promptTokenCount || 0;
      const outputTokens = aiResponse.tokenUsage?.candidatesTokenCount || 0;
      
      await tokenTrackingService.trackTokenUsage(
        projectId, 
        inputTokens, 
        outputTokens, 
        'enhanced-specs-generation',
        userId
      );
    } catch (error) {
      console.warn('Failed to track token usage:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Enhanced specifications generated successfully',
      specs: specsData,
      tokenUsage: aiResponse.tokenUsage
    });

  } catch (error) {
    console.error('Failed to generate enhanced specifications:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate enhanced specifications';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        errorMessage = 'Request timed out. The AI service is taking too long to respond. Please try again.';
        statusCode = 408;
      } else if (error.message.includes('Network connection failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        statusCode = 503;
      } else if (error.message.includes('Google AI API error')) {
        errorMessage = `AI service error: ${error.message}`;
        statusCode = 502;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}