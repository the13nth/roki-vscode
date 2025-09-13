import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAIConfig } from '@/lib/secureConfig';

interface EnhanceRequest {
  stage: 'comprehensive' | 'optimized' | 'basic' | 'detailed' | 'validation';
  description: string;
  projectProfile: {
    name: string;
    industry: string;
    customIndustry?: string;
    businessModel: string[];
  };
  template: string;
  customTemplate?: string;
  previousResults?: any; // For sequential stages
}

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
}

async function callGoogleAI(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    tokenUsage: data.usageMetadata || {}
  };
}

function getExpertRole(industry: string): string {
  const roles: Record<string, string> = {
    'fintech': 'senior fintech product strategist and financial services architect with expertise in payment systems, regulatory compliance, and digital banking',
    'healthtech': 'healthcare technology consultant and digital health strategist with experience in telemedicine, health records, and medical device integration',
    'edtech': 'educational technology specialist and learning platform architect with expertise in online learning, student engagement, and educational assessment',
    'ecommerce': 'e-commerce platform architect and digital commerce strategist with experience in online retail, marketplace dynamics, and customer acquisition',
    'saas': 'SaaS product manager and cloud architecture specialist with expertise in subscription models, user onboarding, and scalable software design',
    'marketplace': 'marketplace platform strategist with expertise in two-sided markets, network effects, and platform economics',
    'social': 'social platform architect with experience in community building, user engagement, and social network dynamics',
    'iot': 'IoT solutions architect with expertise in connected devices, edge computing, and industrial automation',
    'ai-ml': 'AI/ML product strategist with expertise in machine learning applications, data pipelines, and intelligent automation',
    'blockchain': 'blockchain architect and Web3 strategist with expertise in decentralized systems, smart contracts, and cryptocurrency',
    'gaming': 'game development strategist with expertise in game mechanics, player engagement, and gaming platforms',
    'productivity': 'productivity software specialist with expertise in workflow optimization, team collaboration, and business process automation',
    'logistics': 'logistics and supply chain expert with expertise in transportation management, warehouse optimization, and supply chain digitization',
    'ev': 'electric vehicle industry specialist with expertise in EV infrastructure, battery technology, and sustainable transportation solutions',
    'mobility': 'mobility and transportation strategist with expertise in ride-sharing, smart transportation, and urban mobility solutions'
  };
  return roles[industry] || 'startup advisor and technical architect';
}

function getIndustryContext(industry: string): any {
  const contexts: Record<string, any> = {
    'fintech': {
      regulations: 'PCI DSS, KYC/AML, SOX compliance, banking regulations, payment processing standards',
      keyMetrics: 'transaction volume, processing fees, fraud rates, regulatory compliance scores, customer acquisition cost',
      challenges: 'regulatory compliance, security threats, customer trust, integration complexity, scalability',
      opportunities: 'digital transformation, financial inclusion, automated processes, real-time payments, data analytics'
    },
    'healthtech': {
      regulations: 'HIPAA, FDA regulations, clinical trial standards, patient data privacy, medical device regulations',
      keyMetrics: 'patient outcomes, clinical efficiency, data accuracy, compliance scores, user adoption rates',
      challenges: 'regulatory approval, data privacy, clinical validation, integration with existing systems, user training',
      opportunities: 'telemedicine growth, AI diagnostics, personalized medicine, remote monitoring, healthcare accessibility'
    },
    'edtech': {
      regulations: 'FERPA, COPPA, accessibility standards (WCAG), data privacy laws, educational standards',
      keyMetrics: 'student engagement, learning outcomes, completion rates, teacher satisfaction, content effectiveness',
      challenges: 'student engagement, content quality, technology adoption, assessment validity, digital divide',
      opportunities: 'personalized learning, remote education, skill-based learning, AI tutoring, global accessibility'
    },
    'logistics': {
      regulations: 'DOT regulations, customs compliance, hazardous materials handling, international shipping standards',
      keyMetrics: 'delivery times, cost per shipment, fuel efficiency, customer satisfaction, on-time delivery rates',
      challenges: 'fuel costs, driver shortages, regulatory compliance, last-mile delivery, supply chain disruptions',
      opportunities: 'automation, real-time tracking, sustainability, AI optimization, global expansion'
    },
    'ev': {
      regulations: 'vehicle safety standards, charging infrastructure regulations, environmental compliance, grid integration',
      keyMetrics: 'charging efficiency, battery life, user adoption, charging station utilization, energy consumption',
      challenges: 'charging infrastructure, battery technology, range anxiety, grid capacity, cost competitiveness',
      opportunities: 'sustainability, government incentives, technology advancement, smart grid integration, fleet electrification'
    },
    'mobility': {
      regulations: 'transportation safety standards, accessibility compliance, data privacy, local transportation laws',
      keyMetrics: 'ride completion rates, driver earnings, passenger satisfaction, safety scores, operational efficiency',
      challenges: 'regulatory compliance, driver retention, safety concerns, competition, operational costs',
      opportunities: 'autonomous vehicles, shared mobility, sustainability, smart city integration, multimodal transportation'
    }
  };
  
  return contexts[industry] || {
    regulations: 'Industry-standard compliance requirements',
    keyMetrics: 'user engagement, revenue growth, market penetration, customer satisfaction',
    challenges: 'market competition, technology adoption, scalability, user acquisition',
    opportunities: 'digital transformation, automation, data-driven insights, global reach'
  };
}

function generateEnhancementPrompt(request: EnhanceRequest): string {
  const { stage, description, projectProfile, template, customTemplate } = request;
  const expertRole = getExpertRole(projectProfile.industry);
  const industryContext = getIndustryContext(projectProfile.industry);
  
  const businessModelText = Array.isArray(projectProfile.businessModel) 
    ? projectProfile.businessModel.join(', ') 
    : projectProfile.businessModel;
  
  const needsBusinessModelInference = projectProfile.businessModel.includes('unknown');
  
  // Debug logging
  console.log('API - Business Model:', projectProfile.businessModel);
  console.log('API - Needs Business Model Inference:', needsBusinessModelInference);

  const templateInfo = template === 'other' && customTemplate 
    ? `Custom Template: ${customTemplate}`
    : `Template: ${template}`;

  const industryText = projectProfile.industry === 'other' && projectProfile.customIndustry 
    ? `${projectProfile.industry} (${projectProfile.customIndustry})`
    : projectProfile.industry;

  const baseContext = `
STARTUP PROFILE:
- Name: ${projectProfile.name}
- Industry: ${industryText}
- Business Model(s): ${businessModelText}
- ${templateInfo}

INDUSTRY CONTEXT:
- Key Regulations: ${industryContext.regulations}
- Success Metrics: ${industryContext.keyMetrics}
- Common Challenges: ${industryContext.challenges}
- Market Opportunities: ${industryContext.opportunities}

CURRENT DESCRIPTION:
${description}

${needsBusinessModelInference ? 'CRITICAL REQUIREMENT: The business model is set to "unknown" - you MUST analyze the startup description and provide specific business model recommendations in your response. This is a required field that cannot be omitted.' : ''}
`;

  const prompts = {
    basic: `You are a ${expertRole} conducting Phase 1: Basic Enhancement of a startup analysis.

${baseContext}

TASK: Enhance this startup description with industry expertise and market insights.

Analyze the description to infer and enhance:
1. **Problem Statement**: Identify and articulate the core problem being solved
2. **Target Market**: Define specific customer segments and market positioning
3. **Clear Value Proposition**: Articulate the unique value and competitive advantage
4. **Market Positioning**: Position within the ${projectProfile.industry} landscape
5. **Solution Architecture**: High-level approach to solving the identified problem
${needsBusinessModelInference ? '6. **Business Model Analysis**: CRITICAL - Analyze the description and explicitly recommend the most suitable business models based on the solution, target market, and industry context. Consider models like: b2b-saas, marketplace, transaction, subscription, freemium, consulting, etc.' : '6. **Business Model Validation**: Validate the ' + businessModelText + ' approach'}
7. **Success Metrics**: Define measurable outcomes and KPIs

${needsBusinessModelInference ? 'IMPORTANT: You MUST provide business model recommendations in your response. Analyze the startup description and recommend 2-3 specific business models that would work best for this solution.' : ''}

**SCORING GUIDANCE**: Rate 60-90 based on clarity, feasibility, and market potential. Higher scores for well-defined problems, clear value props, and realistic solutions.

IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure all strings are properly escaped and no control characters are used.

${needsBusinessModelInference ? 'CRITICAL: You MUST include the "businessModelSuggestions" field in your JSON response. This field is required and cannot be omitted.' : ''}

Return a JSON response with:
{
  "enhancedDescription": "4-6 paragraph enhanced description",
  "suggestions": ["3-5 specific improvement suggestions"],
  "viabilityScore": 75,
  "keyInsights": ["3-4 key strategic insights"],
  "nextSteps": ["3-4 immediate actionable steps"]
}`,

    detailed: `You are a ${expertRole} conducting Phase 2: Detailed Analysis of a startup.

${baseContext}

TASK: Provide detailed market and technical analysis with specific recommendations.

Conduct deep analysis covering:
1. **Problem & Market Analysis**: Infer and validate problem statement, define target segments, TAM/SAM estimation, competitive landscape
2. **Technical Architecture Assessment**: Scalability, technology stack, integration complexity, security
3. **Business Model Deep Dive**: ${needsBusinessModelInference ? 'CRITICAL - Analyze and recommend specific business models based on the solution. Consider revenue streams, unit economics, customer acquisition, pricing strategy for recommended models' : 'Revenue streams, unit economics, customer acquisition, pricing strategy for ' + businessModelText}
4. **Risk Assessment & Mitigation**: Technical risks, market risks, regulatory compliance, operational risk

${needsBusinessModelInference ? 'IMPORTANT: You MUST provide detailed business model recommendations in your response. Analyze the startup and recommend specific business models with reasoning.' : ''}

**SCORING GUIDANCE**: Rate 50-80 based on market size, competitive advantage, technical feasibility, and business model strength. Lower scores for high risks or unrealistic assumptions.

IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure all strings are properly escaped and no control characters are used.

Return a JSON response with:
{
  "enhancedDescription": "comprehensive 6-8 paragraph description",
  "marketAnalysis": {
    "marketSize": "TAM/SAM estimation with rationale",
    "competitiveAdvantage": "specific differentiation factors",
    "targetCustomers": "detailed customer segments"
  },
  "technicalRecommendations": {
    "architecture": "recommended technical approach",
    "scalability": "scalability strategy",
    "security": "security requirements"
  },
  "businessModel": {
    "revenueStreams": "detailed revenue analysis",
    "unitEconomics": "cost structure and pricing",
    "growthStrategy": "customer acquisition and retention"
  },
  "riskAssessment": {
    "technicalRisks": ["specific technical challenges"],
    "marketRisks": ["market and competitive risks"],
    "mitigationStrategies": ["specific mitigation approaches"]
  },
  "viabilityScore": 70,
  "suggestions": ["5-7 detailed recommendations"]
}`,

    validation: `You are a ${expertRole} conducting Phase 3: Validation of a startup idea.

${baseContext}

TASK: Validate the startup idea against market realities and provide honest assessment.

Validation Framework:
1. **Problem-Solution Fit Analysis**: Validate problem statement, assess solution effectiveness, identify gaps
2. **Market Validation**: Validate target market, analyze demand and timing, assess competitive threats
3. **Business Model Validation**: ${needsBusinessModelInference ? 'CRITICAL - Validate and recommend specific business models. Assess revenue assumptions, willingness to pay, scalability for recommended models' : 'Validate revenue assumptions, assess willingness to pay, analyze scalability for ' + businessModelText}
4. **Execution Feasibility**: Assess technical complexity, team requirements, funding needs
5. **Honest Critique**: Identify failure points, highlight unrealistic assumptions, provide honest feedback

${needsBusinessModelInference ? 'IMPORTANT: You MUST provide business model recommendations in your validation response. Analyze the startup and recommend specific business models with validation reasoning.' : ''}

**SCORING GUIDANCE**: Rate 40-75 based on realistic market validation, honest assessment of challenges, and execution feasibility. Be critical - most startups fail, so scores should reflect real-world challenges.

IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure all strings are properly escaped and no control characters are used.

Return a JSON response with:
{
  "enhancedDescription": "validated and refined description",
  "validationResults": {
    "problemSolutionFit": "assessment with score 1-10",
    "marketDemand": "market validation analysis",
    "businessModelViability": "business model assessment",
    "executionFeasibility": "implementation feasibility"
  },
  "criticalIssues": ["major concerns or red flags"],
  "strengthsAndWeaknesses": {
    "strengths": ["key advantages and opportunities"],
    "weaknesses": ["areas needing improvement"]
  },
  "validationFeedback": {
    "insights": ["key validation insights"],
    "recommendations": ["specific validation steps to take"]
  },
  "viabilityScore": 65,
  "honestAssessment": "brutally honest evaluation of success probability"
}`,

    comprehensive: `You are a ${expertRole} conducting a comprehensive startup analysis in three sequential phases.

${baseContext}

TASK: Conduct a complete startup analysis in three phases and provide all results in a single response.

## PHASE 1: BASIC ENHANCEMENT
Enhance this startup description with industry expertise and market insights.

Analyze the description to infer and enhance:
1. **Problem Statement**: Identify and articulate the core problem being solved
2. **Target Market**: Define specific customer segments and market positioning
3. **Clear Value Proposition**: Articulate the unique value and competitive advantage
4. **Market Positioning**: Position within the ${projectProfile.industry} landscape
5. **Solution Architecture**: High-level approach to solving the identified problem
${needsBusinessModelInference ? '6. **Business Model Analysis**: Analyze the description and recommend the most suitable business models based on the solution, target market, and industry context' : '6. **Business Model Validation**: Validate the ' + businessModelText + ' approach'}
7. **Success Metrics**: Define measurable outcomes and KPIs

**SCORING GUIDANCE**: Rate 60-90 based on clarity, feasibility, and market potential. Higher scores for well-defined problems, clear value props, and realistic solutions.

## PHASE 2: DETAILED ANALYSIS
Provide detailed market and technical analysis with specific recommendations.

Conduct deep analysis covering:
1. **Problem & Market Analysis**: Infer and validate problem statement, define target segments, TAM/SAM estimation, competitive landscape
2. **Technical Architecture Assessment**: Scalability, technology stack, integration complexity, security
3. **Business Model Deep Dive**: Revenue streams, unit economics, customer acquisition, pricing strategy
4. **Risk Assessment & Mitigation**: Technical risks, market risks, regulatory compliance, operational risk

**SCORING GUIDANCE**: Rate 50-80 based on market size, competitive advantage, technical feasibility, and business model strength. Lower scores for high risks or unrealistic assumptions.

## PHASE 3: VALIDATION
Validate the startup idea against market realities and provide honest assessment.

Validation Framework:
1. **Problem-Solution Fit Analysis**: Validate problem statement, assess solution effectiveness, identify gaps
2. **Market Validation**: Validate target market, analyze demand and timing, assess competitive threats
3. **Business Model Validation**: Validate revenue assumptions, assess willingness to pay, analyze scalability
4. **Execution Feasibility**: Assess technical complexity, team requirements, funding needs
5. **Honest Critique**: Identify failure points, highlight unrealistic assumptions, provide honest feedback

**SCORING GUIDANCE**: Rate 40-75 based on realistic market validation, honest assessment of challenges, and execution feasibility. Be critical - most startups fail, so scores should reflect real-world challenges.

IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure all strings are properly escaped and no control characters are used.

Return a JSON response with:
{
  "basicEnhancement": {
    "enhancedDescription": "4-6 paragraph enhanced description",
    "suggestions": ["3-5 specific improvement suggestions"],
    "viabilityScore": 75,
    "keyInsights": ["3-4 key strategic insights"],
    "nextSteps": ["3-4 immediate actionable steps"]
  },
  "detailedAnalysis": {
    "enhancedDescription": "comprehensive 6-8 paragraph description",
    "marketAnalysis": {
      "marketSize": "TAM/SAM estimation with rationale",
      "competitiveAdvantage": "specific differentiation factors",
      "targetCustomers": "detailed customer segments"
    },
    "technicalRecommendations": {
      "architecture": "recommended technical approach",
      "scalability": "scalability strategy",
      "security": "security requirements"
    },
    "businessModel": {
      "revenueStreams": "detailed revenue analysis",
      "unitEconomics": "cost structure and pricing",
      "growthStrategy": "customer acquisition and retention"
    },
    "riskAssessment": {
      "technicalRisks": ["specific technical challenges"],
      "marketRisks": ["market and competitive risks"],
      "mitigationStrategies": ["specific mitigation approaches"]
    },
    "viabilityScore": 70,
    "suggestions": ["5-7 detailed recommendations"]
  },
  "validation": {
    "enhancedDescription": "validated and refined description",
    "validationResults": {
      "problemSolutionFit": "assessment with score 1-10",
      "marketDemand": "market validation analysis",
      "businessModelViability": "business model assessment",
      "executionFeasibility": "implementation feasibility"
    },
    "criticalIssues": ["major concerns or red flags"],
    "strengthsAndWeaknesses": {
      "strengths": ["key advantages and opportunities"],
      "weaknesses": ["areas needing improvement"]
    },
    "validationFeedback": {
      "insights": ["key validation insights"],
      "recommendations": ["specific validation steps to take"]
    },
    "viabilityScore": 65,
    "honestAssessment": "brutally honest evaluation of success probability"
  },
  "targetSegments": {
    "primary": "Primary target customer segment with specific characteristics",
    "secondary": ["Secondary segment 1", "Secondary segment 2"],
    "demographics": "Age, income, location, education, job title characteristics",
    "psychographics": "Values, interests, lifestyle, behavior patterns",
    "painPoints": ["Primary pain point 1", "Primary pain point 2", "Primary pain point 3"]
  }${needsBusinessModelInference ? `,
  "businessModelSuggestions": {
    "recommended": ["specific business model 1", "specific business model 2"],
    "alternatives": ["alternative model 1", "alternative model 2"],
    "reasoning": "Detailed explanation of why these business models are most suitable for this startup based on the solution, target market, and industry context",
    "revenueProjections": "Expected revenue streams, pricing strategy, and growth potential for recommended models"
  }` : ''}
}`,

    optimized: `You are a ${expertRole} and startup optimization specialist.

${baseContext}

TASK: Optimize the startup concept for maximum market impact and success probability.

Optimization Areas:

1. **Value Proposition Optimization**
   - Refine messaging for maximum impact
   - Optimize positioning against competitors
   - Enhance unique selling propositions

2. **Market Strategy Optimization**
   - Optimize target market segmentation
   - Refine go-to-market strategy
   - Optimize pricing and positioning

3. **Product Strategy Optimization**
   - Optimize feature prioritization
   - Refine MVP definition
   - Optimize user experience strategy

4. **Business Model Optimization**
   ${needsBusinessModelInference ? 
     '- Optimize and refine recommended business models\n   - Optimize revenue streams for recommended models\n   - Refine cost structure\n   - Optimize growth strategy' :
     '- Optimize revenue streams\n   - Refine cost structure\n   - Optimize growth strategy'}

5. **Execution Strategy Optimization**
   - Optimize development roadmap
   - Refine resource allocation
   - Optimize risk mitigation

IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure all strings are properly escaped and no control characters are used.

Return a JSON response with:
{
  "enhancedDescription": "fully optimized startup description",
  "optimizations": {
    "valueProposition": "optimized value proposition",
    "marketStrategy": "optimized market approach",
    "productStrategy": "optimized product roadmap",
    "businessModel": "optimized business model"
  },
  "competitiveStrategy": {
    "differentiation": "key differentiators",
    "positioning": "market positioning strategy",
    "defensibility": "competitive moats and barriers"
  },
  "executionPlan": {
    "mvpDefinition": "optimized MVP scope",
    "roadmap": "strategic development roadmap",
    "milestones": "key success milestones"
  },
  "targetSegments": {
    "primary": "Optimized primary target customer segment for maximum market impact",
    "secondary": ["Optimized secondary segment 1", "Optimized secondary segment 2", "Optimized secondary segment 3"],
    "demographics": "Optimized demographic targeting for maximum conversion and retention",
    "psychographics": "Optimized psychographic profile for maximum engagement and loyalty",
    "painPoints": ["Optimized pain point 1", "Optimized pain point 2", "Optimized pain point 3", "Optimized pain point 4"]
  }${needsBusinessModelInference ? `,
  "businessModelSuggestions": {
    "recommended": ["optimized business model 1", "optimized business model 2"],
    "alternatives": ["alternative optimized model 1", "alternative optimized model 2"],
    "reasoning": "Optimized business model recommendations for maximum revenue potential and market fit based on detailed analysis",
    "revenueProjections": "Optimized revenue projections with growth strategies and scaling potential for recommended models"
  }` : ''},
  "successFactors": ["critical success factors"],
  "viabilityScore": 88,
  "optimizationSummary": "summary of key optimizations made"
}`
  };

  return prompts[stage];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestData: EnhanceRequest = await request.json();

    if (!requestData.description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    
    // Debug logging for request data
    console.log('API - Request Data Business Model:', requestData.projectProfile?.businessModel);
    console.log('API - Request Data Industry:', requestData.projectProfile?.industry);
    console.log('API - Request Data Stage:', requestData.stage);

    // Define business model inference need at top level
    const needsBusinessModelInference = requestData.projectProfile?.businessModel?.includes('unknown') || false;

    // Get API configuration
    const apiConfig = getGoogleAIConfig();
    
    // Generate enhancement prompt
    const prompt = generateEnhancementPrompt(requestData);
    
    // Debug logging for prompt
    console.log('API - Generated Prompt Length:', prompt.length);
    console.log('API - Prompt contains business model requirement:', prompt.includes('CRITICAL REQUIREMENT'));
    console.log('API - Prompt contains business model suggestions:', prompt.includes('businessModelSuggestions'));
    
    // Log a sample of the prompt to see if it's correct
    if (needsBusinessModelInference) {
      console.log('API - Prompt sample (business model section):', prompt.substring(prompt.indexOf('CRITICAL REQUIREMENT') - 100, prompt.indexOf('CRITICAL REQUIREMENT') + 500));
    }
    
    // Call AI
    const aiResponse = await callGoogleAI(apiConfig, prompt);
    
    // Debug logging
    console.log('API - AI Response Length:', aiResponse.content.length);
    console.log('API - AI Response (first 500 chars):', aiResponse.content.substring(0, 500));
    console.log('API - AI Response (last 500 chars):', aiResponse.content.substring(Math.max(0, aiResponse.content.length - 500)));
    console.log('API - Request Data:', requestData);
    console.log('API - Needs Business Model Inference:', needsBusinessModelInference);
    
    // Parse JSON response
    let result;
    try {
      // Extract JSON from response
      let jsonContent = aiResponse.content.trim();
      
      // First, try to extract JSON from markdown code blocks
      const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      } else {
        // If no code blocks, try to find JSON object directly
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        jsonContent = jsonMatch[0];
      }
      
      // Clean the JSON string by removing only problematic control characters
      let jsonString = jsonContent
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove only problematic control characters, keep \n, \r, \t
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\r/g, '\n') // Convert remaining \r to \n
        .trim();
      
      // Try to parse the cleaned JSON
      result = JSON.parse(jsonString);
      
      // Debug logging for parsed result
      console.log('API - Parsed Result Keys:', Object.keys(result));
      console.log('API - Parsed Result Business Model Suggestions:', result.businessModelSuggestions);
      
      // Check if business model suggestions are in a different location or format
      if (needsBusinessModelInference && !result.businessModelSuggestions) {
        console.log('API - Checking for business model suggestions in other locations...');
        console.log('API - Result has businessModel key:', 'businessModel' in result);
        console.log('API - Result has business_model key:', 'business_model' in result);
        console.log('API - Result has businessModelRecommendations key:', 'businessModelRecommendations' in result);
        
        // Try to find business model suggestions in different possible locations
        if (result.businessModel && result.businessModel.suggestions) {
          console.log('API - Found business model suggestions in businessModel.suggestions');
          result.businessModelSuggestions = result.businessModel.suggestions;
        }
      }
      
      // Handle case where business model suggestions are returned as an array instead of object
      if (needsBusinessModelInference && result.businessModelSuggestions && Array.isArray(result.businessModelSuggestions)) {
        console.log('API - Converting array format business model suggestions to object format');
        const suggestions = result.businessModelSuggestions;
        
        // Extract business model names from the descriptions
        const extractModelName = (desc: string) => {
          const match = desc.match(/^([^:]+):/);
          return match ? match[1].toLowerCase().trim() : desc.toLowerCase().trim();
        };
        
        result.businessModelSuggestions = {
          recommended: suggestions.slice(0, 2).map(extractModelName),
          alternatives: suggestions.slice(2).map(extractModelName),
          reasoning: `Based on the startup analysis, these business models are most suitable: ${suggestions.join('; ')}`,
          revenueProjections: 'Revenue streams from transaction fees, subscription services, and marketplace commissions'
        };
      }
      
      // Ensure business model suggestions are included if business model is unknown
      if (needsBusinessModelInference && !result.businessModelSuggestions) {
        console.log('Business model is unknown but suggestions not found in AI response, adding fallback');
        result.businessModelSuggestions = {
          recommended: ['b2b-saas'],
          alternatives: ['consulting'],
          reasoning: 'Business model inference not available in AI response',
          revenueProjections: 'Unable to generate revenue projections'
        };
      }
      
      // Log business model suggestions for debugging
      if (needsBusinessModelInference) {
        console.log('Business model suggestions in result:', result.businessModelSuggestions);
        console.log('Business model suggestions type:', typeof result.businessModelSuggestions);
        console.log('Business model suggestions is null/undefined:', result.businessModelSuggestions === null || result.businessModelSuggestions === undefined);
        
        // Check if business model suggestions exist but are empty
        if (result.businessModelSuggestions && typeof result.businessModelSuggestions === 'object') {
          console.log('Business model suggestions keys:', Object.keys(result.businessModelSuggestions));
          console.log('Business model suggestions recommended:', result.businessModelSuggestions.recommended);
        }
        
        // Ensure business model suggestions are always present
        if (!result.businessModelSuggestions) {
          console.log('Business model suggestions missing, adding explicit fallback');
          result.businessModelSuggestions = {
            recommended: ['b2b-saas', 'marketplace'],
            alternatives: ['consulting', 'transaction'],
            reasoning: 'Based on the mobility industry and transportation focus, these business models are most suitable for sustainable revenue generation.',
            revenueProjections: 'Expected revenue streams from subscription fees, transaction commissions, and service partnerships'
          };
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI response:', aiResponse.content);
      
      // Fallback: try to extract key information manually
      try {
        const fallbackResult: any = {
          basicEnhancement: {
            enhancedDescription: aiResponse.content.substring(0, 1000) + '...',
            suggestions: ['AI response parsing failed - please try again'],
            viabilityScore: 60,
            keyInsights: ['JSON parsing error occurred'],
            nextSteps: ['Please try the enhancement again']
          },
          detailedAnalysis: {
            enhancedDescription: aiResponse.content.substring(0, 1000) + '...',
            marketAnalysis: {
              marketSize: 'Unable to parse AI response',
              competitiveAdvantage: 'Please try again',
              targetCustomers: 'AI response parsing failed'
            },
            technicalRecommendations: {
              architecture: 'Unable to parse AI response',
              scalability: 'Please try again',
              security: 'AI response parsing failed'
            },
            businessModel: {
              revenueStreams: 'Unable to parse AI response',
              unitEconomics: 'Please try again',
              growthStrategy: 'AI response parsing failed'
            },
            riskAssessment: {
              technicalRisks: ['JSON parsing error'],
              marketRisks: ['AI response parsing failed'],
              mitigationStrategies: ['Please try again']
            },
            viabilityScore: 55,
            suggestions: ['AI response parsing failed - please try again']
          },
          validation: {
            enhancedDescription: aiResponse.content.substring(0, 1000) + '...',
            validationResults: {
              problemSolutionFit: 'Unable to parse AI response',
              marketDemand: 'Please try again',
              businessModelViability: 'AI response parsing failed',
              executionFeasibility: 'JSON parsing error'
            },
            criticalIssues: ['AI response parsing failed'],
            strengthsAndWeaknesses: {
              strengths: ['Please try again'],
              weaknesses: ['JSON parsing error']
            },
            validationFeedback: {
              insights: ['AI response parsing failed'],
              recommendations: ['Please try again']
            },
            viabilityScore: 50,
            honestAssessment: 'Unable to parse AI response - please try again'
          },
          targetSegments: {
            primary: 'Unable to parse AI response',
            secondary: [],
            demographics: 'Please try the enhancement again',
            psychographics: 'AI response contained invalid characters',
            painPoints: ['JSON parsing error']
          }
        };
        
        if (needsBusinessModelInference) {
          fallbackResult.businessModelSuggestions = {
            recommended: ['b2b-saas'],
            alternatives: ['consulting'],
            reasoning: 'Unable to parse AI response - please try again',
            revenueProjections: 'AI response parsing failed'
          };
        }
        
        result = fallbackResult;
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }

    // Track token usage
    try {
      const { TokenTrackingService } = await import('@/lib/tokenTrackingService');
      const tokenTrackingService = TokenTrackingService.getInstance();
      
      const inputTokens = aiResponse.tokenUsage?.promptTokenCount || 0;
      const outputTokens = aiResponse.tokenUsage?.candidatesTokenCount || 0;
      
      await tokenTrackingService.trackTokenUsage(
        'project-creation', 
        inputTokens, 
        outputTokens, 
        `description-enhancement-${requestData.stage}`,
        userId
      );
    } catch (error) {
      console.warn('Failed to track token usage:', error);
    }

    // Ensure business model suggestions are always included when needed
    if (needsBusinessModelInference && !result.businessModelSuggestions) {
      console.log('Final check: Adding business model suggestions to response');
      result.businessModelSuggestions = {
        recommended: ['b2b-saas', 'marketplace'],
        alternatives: ['consulting', 'transaction'],
        reasoning: 'Based on the project analysis, these business models are most suitable for sustainable revenue generation.',
        revenueProjections: 'Expected revenue streams from subscription fees, transaction commissions, and service partnerships'
      };
    }

    console.log('API - Final result with business model suggestions:', result.businessModelSuggestions);
    return NextResponse.json({
      success: true,
      ...result,
      stage: requestData.stage,
      tokenUsage: aiResponse.tokenUsage
    });

  } catch (error) {
    console.error('Failed to enhance description:', error);
    return NextResponse.json(
      { error: 'Failed to enhance description with AI' },
      { status: 500 }
    );
  }
}