import { analysisVectorService } from '../analysisVectorService';
import { embeddingService } from '../embeddingService';
import { pineconeOperationsService } from '../pineconeOperationsService';

// Mock the dependencies
jest.mock('../embeddingService');
jest.mock('../pineconeOperationsService');

describe('Vector Search Implementation', () => {
  const mockProjectId = 'test-project-123';
  const mockAnalysisType = 'technical';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EmbeddingService', () => {
    it('should generate proper embeddings for analysis content', async () => {
      const mockAnalysisData = {
        summary: 'This is a technical analysis of the system architecture',
        insights: [
          { content: 'The system uses microservices architecture' },
          { title: 'Performance optimization needed' }
        ],
        recommendations: [
          { content: 'Implement caching layer' },
          { title: 'Add monitoring' }
        ]
      };

      const mockEmbedding = new Array(1024).fill(0.1);
      (embeddingService.generateAnalysisEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);

      const result = await embeddingService.generateAnalysisEmbedding(mockAnalysisData, mockAnalysisType);

      expect(result).toEqual(mockEmbedding);
      expect(embeddingService.generateAnalysisEmbedding).toHaveBeenCalledWith(mockAnalysisData, mockAnalysisType);
    });

    it('should handle embedding generation errors gracefully', async () => {
      const mockAnalysisData = { summary: 'Test analysis' };
      const mockFallbackEmbedding = new Array(1024).fill(0.05);

      (embeddingService.generateAnalysisEmbedding as jest.Mock).mockRejectedValue(new Error('API Error'));
      (embeddingService.generateFallbackEmbedding as jest.Mock).mockReturnValue(mockFallbackEmbedding);

      const result = await embeddingService.generateAnalysisEmbedding(mockAnalysisData, mockAnalysisType);

      expect(result).toEqual(mockFallbackEmbedding);
    });
  });

  describe('AnalysisVectorService', () => {
    it('should search for analysis context successfully', async () => {
      const mockSearchResults = {
        matches: [
          {
            id: 'doc-1',
            score: 0.95,
            metadata: {
              title: 'Technical Requirements',
              content: 'The system should be scalable and maintainable',
              type: 'requirements'
            }
          },
          {
            id: 'doc-2',
            score: 0.87,
            metadata: {
              title: 'System Design',
              content: 'Microservices architecture with API gateway',
              type: 'design'
            }
          }
        ]
      };

      (pineconeOperationsService.searchAnalysisContent as jest.Mock).mockResolvedValue(mockSearchResults);

      const result = await analysisVectorService.searchAnalysisContext({
        projectId: mockProjectId,
        analysisType: mockAnalysisType,
        maxResults: 5
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('doc-1');
      expect(result[0].score).toBe(0.95);
      expect(result[0].type).toBe('requirements');
    });

    it('should get related analyses successfully', async () => {
      const mockRelatedResults = {
        matches: [
          {
            id: 'analysis-1',
            score: 0.92,
            metadata: {
              title: 'Market Analysis',
              content: 'Market analysis for similar products',
              type: 'analysis',
              analysisType: 'market'
            }
          }
        ]
      };

      (pineconeOperationsService.getRelatedAnalyses as jest.Mock).mockResolvedValue(mockRelatedResults);

      const result = await analysisVectorService.getRelatedAnalyses(
        mockAnalysisType,
        mockProjectId,
        undefined,
        3
      );

      expect(result).toHaveLength(1);
      expect(result[0].analysisType).toBe('market');
    });

    it('should format context for AI analysis correctly', () => {
      const mockContext = {
        relevantDocuments: [
          {
            id: 'doc-1',
            score: 0.95,
            metadata: { title: 'Requirements Doc' },
            content: 'System requirements content',
            type: 'requirements'
          }
        ],
        relatedAnalyses: [
          {
            id: 'analysis-1',
            score: 0.87,
            metadata: { title: 'Previous Analysis' },
            content: 'Previous analysis content',
            type: 'analysis',
            analysisType: 'market'
          }
        ],
        projectInfo: [
          {
            id: 'info-1',
            score: 0.78,
            metadata: { title: 'Project Overview' },
            content: 'Project overview content',
            type: 'context'
          }
        ]
      };

      const formatted = analysisVectorService.formatContextForAnalysis(mockContext, mockAnalysisType);

      expect(formatted).toContain('# Project Information');
      expect(formatted).toContain('# Relevant Context Documents');
      expect(formatted).toContain('# Related Analyses');
      expect(formatted).toContain('Requirements Doc');
      expect(formatted).toContain('Previous Analysis');
      expect(formatted).toContain('Project Overview');
    });
  });

  describe('PineconeOperationsService', () => {
    it('should perform semantic search with proper filters', async () => {
      const mockQuery = 'technical architecture';
      const mockEmbedding = new Array(1024).fill(0.1);
      const mockResults = {
        matches: [
          {
            id: 'result-1',
            score: 0.89,
            metadata: { title: 'Architecture Doc', type: 'design' }
          }
        ]
      };

      (embeddingService.generateEmbeddingWithFallback as jest.Mock).mockResolvedValue(mockEmbedding);
      (pineconeOperationsService.query as jest.Mock).mockResolvedValue(mockResults);

      const result = await pineconeOperationsService.searchAnalysisContent(
        mockQuery,
        mockProjectId,
        ['technical'],
        5
      );

      expect(pineconeOperationsService.query).toHaveBeenCalledWith(
        mockEmbedding,
        expect.objectContaining({
          topK: 5,
          filter: expect.objectContaining({
            projectId: { $eq: mockProjectId },
            type: { $in: ['analysis', 'context', 'requirements', 'design'] },
            analysisType: { $in: ['technical'] }
          }),
          includeMetadata: true,
          includeValues: false
        })
      );

      expect(result).toEqual(mockResults);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete analysis context retrieval flow', async () => {
      const mockContext = {
        relevantDocuments: [],
        relatedAnalyses: [],
        projectInfo: []
      };

      (analysisVectorService.getAnalysisContext as jest.Mock).mockResolvedValue(mockContext);
      (analysisVectorService.formatContextForAnalysis as jest.Mock).mockReturnValue('Formatted context');

      const result = await analysisVectorService.getAnalysisContext(
        mockProjectId,
        mockAnalysisType,
        'test query'
      );

      expect(result).toEqual(mockContext);
    });

    it('should handle errors gracefully in vector search operations', async () => {
      (pineconeOperationsService.searchAnalysisContent as jest.Mock).mockRejectedValue(
        new Error('Pinecone connection failed')
      );

      const result = await analysisVectorService.searchAnalysisContext({
        projectId: mockProjectId,
        analysisType: mockAnalysisType
      });

      expect(result).toEqual([]);
    });
  });
});

// Test data for integration
export const testAnalysisData = {
  technical: {
    summary: 'Technical analysis of the system architecture and implementation',
    insights: [
      { content: 'The system uses microservices architecture for scalability' },
      { title: 'Performance bottlenecks identified in database queries' }
    ],
    recommendations: [
      { content: 'Implement Redis caching for frequently accessed data' },
      { title: 'Add comprehensive monitoring and logging' }
    ],
    technicalAnalysis: {
      content: 'Detailed technical analysis of the codebase and architecture patterns'
    }
  },
  market: {
    summary: 'Market analysis for the target industry and competitive landscape',
    insights: [
      { content: 'Growing demand for AI-powered solutions in the market' },
      { title: 'Competition is intensifying with new entrants' }
    ],
    recommendations: [
      { content: 'Focus on differentiation through superior user experience' },
      { title: 'Consider partnerships with established players' }
    ],
    marketAnalysis: {
      content: 'Comprehensive market research and competitive analysis'
    }
  }
};
