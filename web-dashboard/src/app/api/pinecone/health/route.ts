import { NextRequest, NextResponse } from 'next/server';
import { pineconeOperationsService } from '@/lib/pineconeOperationsService';
import { PineconeUtils } from '@/lib/pineconeUtils';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Performing Pinecone health check...');
    
    // Perform health check
    const healthResult = await pineconeOperationsService.healthCheck();
    
    // Get performance metrics
    const metrics = pineconeOperationsService.getMetrics();
    
    // Get circuit breaker state
    const circuitBreakerState = PineconeUtils.getMetrics().circuitBreakerState;
    
    const response = {
      healthy: healthResult.healthy,
      latency: healthResult.latency,
      error: healthResult.error,
      metrics: {
        pinecone: metrics.pinecone,
        embedding: metrics.embedding
      },
      circuitBreaker: circuitBreakerState,
      timestamp: new Date().toISOString()
    };
    
    if (healthResult.healthy) {
      console.log('✅ Pinecone health check passed');
      return NextResponse.json(response);
    } else {
      console.log('❌ Pinecone health check failed:', healthResult.error);
      return NextResponse.json(response, { status: 503 });
    }
  } catch (error) {
    console.error('❌ Health check error:', error);
    return NextResponse.json(
      { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'reset-metrics':
        pineconeOperationsService.reset();
        return NextResponse.json({ 
          success: true, 
          message: 'Pinecone service reset successfully',
          timestamp: new Date().toISOString()
        });
        
      case 'reset-circuit-breaker':
        PineconeUtils.resetCircuitBreaker();
        return NextResponse.json({ 
          success: true, 
          message: 'Circuit breaker reset successfully',
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ Health check action error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
