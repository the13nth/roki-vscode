'use client';

import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface EmbeddingPoint {
  id: string;
  vector: number[];
  metadata: {
    type: 'requirements' | 'design' | 'tasks' | 'progress' | 'sync_log' | 'token_usage' | 'document' | 'context' | 'project' | 'unknown';
    title: string;
    content?: string;
    projectId: string;
  };
}

interface EmbeddingsVisualizationProps {
  projectId: string;
}

// 3D Scene Component
function VisualizationScene({ 
  points, 
  isLoading 
}: { 
  points: EmbeddingPoint[];
  isLoading: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  if (isLoading || points.length === 0) {
    return null;
  }

  // Convert high-dimensional vectors to 3D using PCA-like approach
  const convertTo3D = (vector: number[]): [number, number, number] => {
    if (!vector || vector.length === 0) {
      return [0, 0, 0];
    }
    
    // Use more components for better distribution
    const x = (vector[0] || 0) * 8;
    const y = (vector[1] || 0) * 8;
    const z = (vector[2] || 0) * 8;
    
    // Add variation based on other vector components
    const variation = vector.length > 3 ? (vector[3] || 0) * 3 : 0;
    
    return [x + variation, y + variation, z + variation];
  };

  const getColorByType = (type: string) => {
    switch (type) {
      // Actual types from Pinecone
      case 'requirements': return '#3b82f6'; // blue
      case 'design': return '#8b5cf6'; // purple
      case 'tasks': return '#06b6d4'; // cyan
      case 'progress': return '#f59e0b'; // amber
      case 'sync_log': return '#6b7280'; // gray
      case 'token_usage': return '#ef4444'; // red
      
      // Legacy fallback types
      case 'document': return '#3b82f6'; // blue
      case 'context': return '#10b981'; // green
      case 'project': return '#f59e0b'; // amber
      
      default: return '#6b7280'; // gray
    }
  };

  return (
    <>
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      <group ref={groupRef}>
        {points
          .filter(point => point.metadata.type !== 'sync_log' && point.metadata.type !== 'token_usage') // Exclude sync logs and token usage from visualization
          .map((point, index) => {
            const [x, y, z] = convertTo3D(point.vector);
            const color = getColorByType(point.metadata.type);
            
            console.log(`Point ${index}:`, {
              id: point.id,
              type: point.metadata.type,
              title: point.metadata.title,
              position: [x, y, z],
              color: color,
              vectorLength: point.vector.length,
              vectorSample: point.vector.slice(0, 5)
            });
            
            return (
              <group key={point.id} position={[x, y, z]}>
                <Sphere args={[0.3, 16, 16]}>
                  <meshStandardMaterial 
                    color={color} 
                    emissive={color}
                    emissiveIntensity={0.2}
                    metalness={0.1}
                    roughness={0.3}
                  />
                </Sphere>
              </group>
            );
          })}
      </group>
    </>
  );
}

export function EmbeddingsVisualization({ projectId }: EmbeddingsVisualizationProps) {
  const [points, setPoints] = useState<EmbeddingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    requirements: 0,
    design: 0,
    tasks: 0,
    progress: 0,
    sync_log: 0,
    token_usage: 0,
    documents: 0,
    context: 0,
    projects: 0
  });

  const fetchEmbeddings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching embeddings for project:', projectId);
      
      const response = await fetch(`/api/projects/${projectId}/embeddings`);
      if (!response.ok) {
        throw new Error(`Failed to fetch embeddings: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Embeddings data received:', data);
      
      // Log the actual types being received
      const types = data.points?.map((p: any) => p.metadata?.type) || [];
      console.log('Types received from Pinecone:', types);
      console.log('Unique types:', [...new Set(types)]);
      
      setPoints(data.points || []);
      
      // Calculate stats based on actual types from Pinecone (excluding sync logs and token usage)
      const filteredPoints = data.points?.filter((p: EmbeddingPoint) => 
        p.metadata.type !== 'sync_log' && p.metadata.type !== 'token_usage'
      ) || [];
      
      const stats = {
        total: filteredPoints.length,
        requirements: filteredPoints.filter((p: EmbeddingPoint) => p.metadata.type === 'requirements').length,
        design: filteredPoints.filter((p: EmbeddingPoint) => p.metadata.type === 'design').length,
        tasks: filteredPoints.filter((p: EmbeddingPoint) => p.metadata.type === 'tasks').length,
        progress: filteredPoints.filter((p: EmbeddingPoint) => p.metadata.type === 'progress').length,
        sync_log: 0, // Always 0 since we're filtering them out
        token_usage: 0, // Always 0 since we're filtering them out
        documents: filteredPoints.filter((p: EmbeddingPoint) => p.metadata.type === 'document').length,
        context: filteredPoints.filter((p: EmbeddingPoint) => p.metadata.type === 'context').length,
        projects: filteredPoints.filter((p: EmbeddingPoint) => p.metadata.type === 'project').length
      };
      setStats(stats);
      
    } catch (err) {
      console.error('Error fetching embeddings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch embeddings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmbeddings();
  }, [projectId]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={fetchEmbeddings} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={() => setShowLabels(!showLabels)}
            variant="outline"
            size="sm"
          >
            {showLabels ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showLabels ? 'Hide Labels' : 'Show Labels'}
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">Total: {stats.total}</Badge>
          <Badge variant="outline" className="text-blue-600">Requirements: {stats.requirements}</Badge>
          <Badge variant="outline" className="text-purple-600">Design: {stats.design}</Badge>
          <Badge variant="outline" className="text-cyan-600">Tasks: {stats.tasks}</Badge>
          <Badge variant="outline" className="text-amber-600">Progress: {stats.progress}</Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="font-medium">Error loading embeddings</p>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 3D Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>3D Vector Space Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full relative">
            {isLoading ? (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading embeddings...</p>
                </div>
              </div>
            ) : points.length === 0 ? (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500">No embeddings found for this project</p>
                  <p className="text-sm text-gray-400">Try syncing your project first</p>
                </div>
              </div>
            ) : (
              <Canvas
                camera={{ position: [0, 0, 15], fov: 75 }}
              >
                <VisualizationScene 
                  points={points}
                  isLoading={isLoading}
                />
              </Canvas>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Requirements</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <span>Design</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-cyan-500 rounded-full"></div>
              <span>Tasks</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
              <span>Progress</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
