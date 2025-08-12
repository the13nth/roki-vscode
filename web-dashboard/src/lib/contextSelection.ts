import { ContextDocument } from '@/types';

export interface ContextSelectionOptions {
  currentFile?: string;
  workContext?: string;
  maxTokens?: number;
  maxDocuments?: number;
  recentUsageWeight?: number;
  categoryPreferences?: Record<string, number>;
}

export interface ScoredContextDocument extends ContextDocument {
  relevanceScore: number;
  scoreBreakdown: {
    fileRelevance: number;
    contextRelevance: number;
    recentUsage: number;
    categoryBonus: number;
    tagRelevance: number;
  };
}

export class ContextSelectionEngine {
  private static readonly DEFAULT_OPTIONS: Required<ContextSelectionOptions> = {
    currentFile: '',
    workContext: '',
    maxTokens: 8000,
    maxDocuments: 5,
    recentUsageWeight: 0.2,
    categoryPreferences: {
      'requirements': 1.0,
      'api': 0.9,
      'design': 0.8,
      'research': 0.6,
      'other': 0.5
    }
  };

  /**
   * Select the most relevant context documents based on current work context
   */
  static selectRelevantContext(
    documents: ContextDocument[],
    options: ContextSelectionOptions = {}
  ): ScoredContextDocument[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Score all documents
    const scoredDocs = documents.map(doc => 
      this.scoreDocument(doc, opts)
    );

    // Sort by relevance score (highest first)
    scoredDocs.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply document and token limits
    const selected = this.applyLimits(scoredDocs, opts);

    return selected;
  }

  /**
   * Score a single document based on relevance factors
   */
  private static scoreDocument(
    doc: ContextDocument, 
    options: Required<ContextSelectionOptions>
  ): ScoredContextDocument {
    const fileRelevance = this.calculateFileRelevance(doc, options.currentFile);
    const contextRelevance = this.calculateContextRelevance(doc, options.workContext);
    const recentUsage = this.calculateRecentUsageScore(doc);
    const categoryBonus = options.categoryPreferences[doc.category] || 0.5;
    const tagRelevance = this.calculateTagRelevance(doc, options.currentFile, options.workContext);

    // Weighted final score
    const relevanceScore = 
      (fileRelevance * 0.3) +
      (contextRelevance * 0.3) +
      (recentUsage * options.recentUsageWeight) +
      (categoryBonus * 0.1) +
      (tagRelevance * 0.1);

    return {
      ...doc,
      relevanceScore,
      scoreBreakdown: {
        fileRelevance,
        contextRelevance,
        recentUsage,
        categoryBonus,
        tagRelevance
      }
    };
  }

  /**
   * Calculate relevance based on current file being worked on
   */
  private static calculateFileRelevance(doc: ContextDocument, currentFile: string): number {
    if (!currentFile) return 0;

    const fileName = currentFile.toLowerCase();
    const docTitle = doc.title.toLowerCase();
    const docContent = doc.content.toLowerCase();

    let score = 0;

    // File name mentioned in title
    if (docTitle.includes(fileName.replace(/\.[^.]+$/, ''))) {
      score += 0.8;
    }

    // File extension relevance
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
      if (doc.category === 'api' && docContent.includes('endpoint')) score += 0.6;
      if (docContent.includes('component') || docContent.includes('function')) score += 0.4;
    } else if (fileName.endsWith('.css') || fileName.endsWith('.scss')) {
      if (doc.category === 'design') score += 0.7;
      if (docContent.includes('style') || docContent.includes('theme')) score += 0.5;
    } else if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
      if (doc.category === 'requirements' || doc.category === 'research') score += 0.6;
    }

    // Direct file name mentions in content
    const fileBaseName = fileName.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    if (fileBaseName && docContent.includes(fileBaseName.toLowerCase())) {
      score += 0.5;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate relevance based on work context (e.g., feature being worked on)
   */
  private static calculateContextRelevance(doc: ContextDocument, workContext: string): number {
    if (!workContext) return 0;

    const context = workContext.toLowerCase();
    const docTitle = doc.title.toLowerCase();
    const docContent = doc.content.toLowerCase();
    const docTags = doc.tags.map(tag => tag.toLowerCase());

    let score = 0;

    // Context keywords in title (highest weight)
    const contextWords = context.split(/\s+/).filter(word => word.length > 2);
    for (const word of contextWords) {
      if (docTitle.includes(word)) score += 0.4;
      if (docContent.includes(word)) score += 0.2;
      if (docTags.some(tag => tag.includes(word))) score += 0.3;
    }

    // Semantic keyword matching
    const semanticMatches = this.getSemanticMatches(context);
    for (const match of semanticMatches) {
      if (docTitle.includes(match) || docContent.includes(match)) {
        score += 0.3;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate score based on recent usage patterns
   */
  private static calculateRecentUsageScore(doc: ContextDocument): number {
    const now = new Date().getTime();
    const lastModified = doc.lastModified.getTime();
    const daysSinceModified = (now - lastModified) / (1000 * 60 * 60 * 24);

    // Recent modifications get higher scores
    if (daysSinceModified < 1) return 1.0;
    if (daysSinceModified < 7) return 0.8;
    if (daysSinceModified < 30) return 0.5;
    return 0.2;
  }

  /**
   * Calculate relevance based on document tags
   */
  private static calculateTagRelevance(
    doc: ContextDocument, 
    currentFile: string, 
    workContext: string
  ): number {
    if (!doc.tags.length) return 0;

    let score = 0;
    const allContext = `${currentFile} ${workContext}`.toLowerCase();

    for (const tag of doc.tags) {
      if (allContext.includes(tag.toLowerCase())) {
        score += 0.3;
      }
    }

    // Bonus for specific tech stack tags
    const techTags = ['react', 'typescript', 'api', 'database', 'auth', 'testing'];
    const matchingTechTags = doc.tags.filter(tag => 
      techTags.includes(tag.toLowerCase())
    );
    score += matchingTechTags.length * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Get semantic matches for better context understanding
   */
  private static getSemanticMatches(context: string): string[] {
    const semanticMap: Record<string, string[]> = {
      'auth': ['authentication', 'login', 'user', 'permission', 'security'],
      'payment': ['billing', 'stripe', 'checkout', 'transaction', 'invoice'],
      'user': ['profile', 'account', 'settings', 'preferences', 'data'],
      'api': ['endpoint', 'request', 'response', 'rest', 'graphql'],
      'ui': ['component', 'interface', 'design', 'layout', 'style'],
      'database': ['model', 'schema', 'query', 'data', 'storage'],
      'test': ['testing', 'spec', 'unit', 'integration', 'e2e']
    };

    const matches: string[] = [];
    const contextLower = context.toLowerCase();

    for (const [key, values] of Object.entries(semanticMap)) {
      if (contextLower.includes(key)) {
        matches.push(...values);
      }
    }

    return matches;
  }

  /**
   * Apply token and document limits to selected context
   */
  private static applyLimits(
    scoredDocs: ScoredContextDocument[],
    options: Required<ContextSelectionOptions>
  ): ScoredContextDocument[] {
    const selected: ScoredContextDocument[] = [];
    let totalTokens = 0;

    for (const doc of scoredDocs) {
      if (selected.length >= options.maxDocuments) break;

      // Rough token estimation (4 chars per token average)
      const docTokens = Math.ceil(doc.content.length / 4);
      
      if (totalTokens + docTokens <= options.maxTokens) {
        selected.push(doc);
        totalTokens += docTokens;
      }
    }

    return selected;
  }

  /**
   * Format selected context for AI injection
   */
  static formatContextForAI(
    selectedDocs: ScoredContextDocument[],
    projectInfo?: { name: string; description?: string }
  ): string {
    if (!selectedDocs.length) {
      return '';
    }

    const sections = [];

    if (projectInfo) {
      sections.push(`# Project: ${projectInfo.name}`);
      if (projectInfo.description) {
        sections.push(projectInfo.description);
      }
      sections.push('');
    }

    sections.push('# Relevant Context Documents\n');

    for (const doc of selectedDocs) {
      sections.push(`## ${doc.title} (${doc.category})`);
      if (doc.tags.length > 0) {
        sections.push(`Tags: ${doc.tags.join(', ')}`);
      }
      sections.push(`Relevance Score: ${doc.relevanceScore.toFixed(2)}\n`);
      sections.push(doc.content);
      sections.push('\n---\n');
    }

    return sections.join('\n');
  }

  /**
   * Update usage tracking for documents (for future relevance scoring)
   */
  static async updateUsageTracking(
    projectPath: string,
    documentIds: string[]
  ): Promise<void> {
    // This would update a usage tracking file or database
    // For now, we'll just log the usage
    console.log(`Context documents used for project ${projectPath}:`, documentIds);
    
    // TODO: Implement persistent usage tracking
    // Could store in .ai-project/usage.json with timestamps
  }
}


