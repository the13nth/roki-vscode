/**
 * Context validation utilities for AI model limits
 */

export interface ContextValidationResult {
  isValid: boolean;
  originalLength: number;
  truncatedContent?: string;
  truncatedLength?: number;
  warning?: string;
}

export interface ContextLimits {
  maxLength: number;
  provider: string;
}

/**
 * Get context limits based on AI provider
 */
export function getContextLimits(provider: string = 'google'): ContextLimits {
  switch (provider.toLowerCase()) {
    case 'google':
    case 'gemini':
      return {
        maxLength: 25000, // Conservative limit for Gemini API
        provider: 'google'
      };
    case 'openai':
    case 'gpt':
      return {
        maxLength: 120000, // GPT-4 has higher limits
        provider: 'openai'
      };
    default:
      return {
        maxLength: 25000, // Default to conservative limit
        provider: 'default'
      };
  }
}

/**
 * Validate and truncate context if necessary
 */
export function validateAndTruncateContext(
  content: string,
  provider: string = 'google',
  customLimit?: number
): ContextValidationResult {
  const limits = getContextLimits(provider);
  const maxLength = customLimit || limits.maxLength;
  const originalLength = content.length;

  if (originalLength <= maxLength) {
    return {
      isValid: true,
      originalLength
    };
  }

  // Truncate content and add warning message
  const truncatedContent = content.substring(0, maxLength - 100) + 
    '\n\n[Content truncated due to length limits]';
  
  const warning = `⚠️ Context too long (${originalLength} chars), truncated to ${truncatedContent.length} chars for ${provider} API`;

  console.warn(warning);

  return {
    isValid: false,
    originalLength,
    truncatedContent,
    truncatedLength: truncatedContent.length,
    warning
  };
}

/**
 * Validate project data for context length limits
 */
export function validateProjectContext(projectData: {
  name: string;
  description: string;
  template?: string;
  requirements?: string;
  design?: string;
  tasks?: string;
}, provider: string = 'google'): ContextValidationResult {
  
  // Combine all project content that might be sent to AI
  const combinedContent = [
    `Project: ${projectData.name}`,
    `Description: ${projectData.description}`,
    projectData.template ? `Template: ${projectData.template}` : '',
    projectData.requirements ? `Requirements:\n${projectData.requirements}` : '',
    projectData.design ? `Design:\n${projectData.design}` : '',
    projectData.tasks ? `Tasks:\n${projectData.tasks}` : ''
  ].filter(Boolean).join('\n\n');

  return validateAndTruncateContext(combinedContent, provider);
}

/**
 * Truncate individual project fields to prevent context overflow
 */
export function truncateProjectFields(projectData: {
  name?: string;
  description?: string;
  requirements?: string;
  design?: string;
  tasks?: string;
}): typeof projectData {
  const FIELD_LIMITS = {
    name: 200,
    description: 2000,
    requirements: 8000,
    design: 8000,
    tasks: 6000
  };

  const truncated = { ...projectData };

  Object.entries(FIELD_LIMITS).forEach(([field, limit]) => {
    const value = truncated[field as keyof typeof truncated];
    if (typeof value === 'string' && value.length > limit) {
      truncated[field as keyof typeof truncated] = 
        value.substring(0, limit - 50) + '\n\n[Content truncated]';
      console.warn(`⚠️ Truncated ${field} from ${value.length} to ${limit} characters`);
    }
  });

  return truncated;
}