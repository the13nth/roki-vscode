import { pineconeOperationsService } from './pineconeOperationsService';
import { embeddingService } from './embeddingService';
import { ContextDocument } from '@/types';

export interface AnalysisSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content: string;
  type: string;
  analysisType?: string;
}

export interface AnalysisContext {
  projectId: string;
  analysisType: string;
  query?: string;
  maxResults?: number;
  includeRelated?: boolean;
}

export class AnalysisVectorService {
  private static instance: AnalysisVectorService;

  private constructor() {}

  static getInstance(): AnalysisVectorService {
    if (!AnalysisVectorService.instance) {
      AnalysisVectorService.instance = new AnalysisVectorService();
    }
    return AnalysisVectorService.instance;
  }

  /**
   * Search for relevant context documents for analysis
   */
  async searchAnalysisContext(context: AnalysisContext): Promise<AnalysisSearchResult[]> {
    try {
      const { projectId, analysisType, query, maxResults = 10, includeRelated = true } = context;
      
      console.log(`🔍 Searching analysis context for ${analysisType} analysis in project ${projectId}`);
      
      // Create search query based on analysis type and optional user query
      const searchQuery = query || this.generateAnalysisQuery(analysisType);
      
      // Search for relevant documents
      const searchResponse = await pineconeOperationsService.searchAnalysisContent(
        searchQuery,
        projectId,
        includeRelated ? undefined : [analysisType],
        maxResults
      );

      // Transform results to our format
      const results: AnalysisSearchResult[] = (searchResponse.matches || []).map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
        content: match.metadata?.content || '',
        type: match.metadata?.type || 'unknown',
        analysisType: match.metadata?.analysisType
      }));

      console.log(`📊 Found ${results.length} relevant documents for ${analysisType} analysis`);
      return results;
    } catch (error) {
      console.error('Failed to search analysis context:', error);
      return [];
    }
  }

  /**
   * Get related analyses for cross-referencing
   */
  async getRelatedAnalyses(
    analysisType: string,
    projectId: string,
    excludeId?: string,
    maxResults: number = 5
  ): Promise<AnalysisSearchResult[]> {
    try {
      console.log(`🔍 Finding related analyses for ${analysisType} in project ${projectId}`);
      
      const searchResponse = await pineconeOperationsService.getRelatedAnalyses(
        analysisType,
        projectId,
        excludeId,
        maxResults
      );

      const results: AnalysisSearchResult[] = (searchResponse.matches || []).map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
        content: match.metadata?.content || '',
        type: match.metadata?.type || 'analysis',
        analysisType: match.metadata?.analysisType
      }));

      console.log(`📊 Found ${results.length} related analyses`);
      return results;
    } catch (error) {
      console.error('Failed to get related analyses:', error);
      return [];
    }
  }

  /**
   * Search for specific information within project documents
   */
  async searchProjectInformation(
    query: string,
    projectId: string,
    documentTypes: string[] = ['requirements', 'design', 'context'],
    maxResults: number = 5
  ): Promise<AnalysisSearchResult[]> {
    try {
      console.log(`🔍 Searching project information: "${query}" in project ${projectId}`);
      
      const searchResponse = await pineconeOperationsService.query(
        await embeddingService.generateEmbeddingWithFallback(query),
        {
          topK: maxResults,
          filter: {
            projectId: { $eq: projectId },
            type: { $in: documentTypes }
          },
          includeMetadata: true,
          includeValues: false
        }
      );

      const results: AnalysisSearchResult[] = (searchResponse.matches || []).map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
        content: match.metadata?.content || '',
        type: match.metadata?.type || 'unknown'
      }));

      console.log(`📊 Found ${results.length} relevant project documents`);
      return results;
    } catch (error) {
      console.error('Failed to search project information:', error);
      return [];
    }
  }

  /**
   * Get comprehensive context for analysis generation
   */
  async getAnalysisContext(
    projectId: string,
    analysisType: string,
    specificQuery?: string
  ): Promise<{
    relevantDocuments: AnalysisSearchResult[];
    relatedAnalyses: AnalysisSearchResult[];
    projectInfo: AnalysisSearchResult[];
  }> {
    try {
      console.log(`🔍 Gathering comprehensive context for ${analysisType} analysis in project ${projectId}`);
      
      // Get relevant documents for the analysis type
      const relevantDocuments = await this.searchAnalysisContext({
        projectId,
        analysisType,
        query: specificQuery,
        maxResults: 8,
        includeRelated: true
      });

      // Get related analyses for cross-referencing
      const relatedAnalyses = await this.getRelatedAnalyses(analysisType, projectId, undefined, 3);

      // Get general project information
      const projectInfo = await this.searchProjectInformation(
        specificQuery || this.generateAnalysisQuery(analysisType),
        projectId,
        ['requirements', 'design', 'context'],
        5
      );

      console.log(`📊 Context gathered: ${relevantDocuments.length} docs, ${relatedAnalyses.length} analyses, ${projectInfo.length} project info`);
      
      return {
        relevantDocuments,
        relatedAnalyses,
        projectInfo
      };
    } catch (error) {
      console.error('Failed to get analysis context:', error);
      return {
        relevantDocuments: [],
        relatedAnalyses: [],
        projectInfo: []
      };
    }
  }

  /**
   * Format context for AI analysis
   */
  formatContextForAnalysis(
    context: {
      relevantDocuments: AnalysisSearchResult[];
      relatedAnalyses: AnalysisSearchResult[];
      projectInfo: AnalysisSearchResult[];
    },
    analysisType: string
  ): string {
    const sections: string[] = [];

    // Add project information
    if (context.projectInfo.length > 0) {
      sections.push('# Project Information\n');
      context.projectInfo.forEach((doc, index) => {
        sections.push(`## ${doc.metadata?.title || `Document ${index + 1}`} (${doc.type})`);
        sections.push(`Relevance Score: ${doc.score.toFixed(3)}\n`);
        sections.push(doc.content.substring(0, 1000) + (doc.content.length > 1000 ? '...' : ''));
        sections.push('\n---\n');
      });
    }

    // Add relevant documents
    if (context.relevantDocuments.length > 0) {
      sections.push('# Relevant Context Documents\n');
      context.relevantDocuments.forEach((doc, index) => {
        sections.push(`## ${doc.metadata?.title || `Document ${index + 1}`} (${doc.type})`);
        sections.push(`Relevance Score: ${doc.score.toFixed(3)}\n`);
        sections.push(doc.content.substring(0, 1500) + (doc.content.length > 1500 ? '...' : ''));
        sections.push('\n---\n');
      });
    }

    // Add related analyses
    if (context.relatedAnalyses.length > 0) {
      sections.push('# Related Analyses\n');
      context.relatedAnalyses.forEach((analysis, index) => {
        sections.push(`## ${analysis.metadata?.title || `${analysis.analysisType} Analysis ${index + 1}`}`);
        sections.push(`Similarity Score: ${analysis.score.toFixed(3)}\n`);
        sections.push(analysis.content.substring(0, 800) + (analysis.content.length > 800 ? '...' : ''));
        sections.push('\n---\n');
      });
    }

    return sections.join('\n');
  }

  /**
   * Generate analysis-specific search queries
   */
  private generateAnalysisQuery(analysisType: string): string {
    const queryMap: Record<string, string> = {
      'technical': 'technical architecture implementation code development programming',
      'market': 'market analysis competition target audience customer demand trends',
      'financial': 'financial projections revenue costs budget investment funding',
      'differentiation': 'competitive advantage unique value proposition differentiation positioning',
      'bmc': 'business model canvas value proposition customer segments revenue streams',
      'roast': 'criticism feedback problems issues weaknesses improvements',
      'risk': 'risks challenges threats mitigation strategies contingency plans',
      'competitive': 'competitors market position competitive analysis benchmarking'
    };

    return queryMap[analysisType] || `${analysisType} analysis insights recommendations`;
  }

  /**
   * Search for similar content across all projects (for benchmarking)
   */
  async searchSimilarContentAcrossProjects(
    query: string,
    excludeProjectId?: string,
    maxResults: number = 10
  ): Promise<AnalysisSearchResult[]> {
    try {
      console.log(`🔍 Searching similar content across projects: "${query}"`);
      
      const filter: Record<string, any> = {
        type: { $in: ['analysis', 'context', 'requirements'] }
      };

      if (excludeProjectId) {
        filter.projectId = { $ne: excludeProjectId };
      }

      const searchResponse = await pineconeOperationsService.query(
        await embeddingService.generateEmbeddingWithFallback(query),
        {
          topK: maxResults,
          filter,
          includeMetadata: true,
          includeValues: false
        }
      );

      const results: AnalysisSearchResult[] = (searchResponse.matches || []).map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
        content: match.metadata?.content || '',
        type: match.metadata?.type || 'unknown',
        analysisType: match.metadata?.analysisType
      }));

      console.log(`📊 Found ${results.length} similar content items across projects`);
      return results;
    } catch (error) {
      console.error('Failed to search similar content across projects:', error);
      return [];
    }
  }
}

// Export singleton instance
export const analysisVectorService = AnalysisVectorService.getInstance();
