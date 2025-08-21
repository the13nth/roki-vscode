'use client';

import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Eye, EyeOff, Upload } from 'lucide-react';

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
  isLoading,
  showLabels,
  onHover 
}: { 
  points: EmbeddingPoint[];
  isLoading: boolean;
  showLabels: boolean;
  onHover: (point: EmbeddingPoint | null) => void;
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
    
    // Increase spacing by using larger multipliers
    const x = (vector[0] || 0) * 15; // Increased from 8 to 15
    const y = (vector[1] || 0) * 15; // Increased from 8 to 15
    const z = (vector[2] || 0) * 15; // Increased from 8 to 15
    
    // Add more variation for better distribution
    const variation = vector.length > 3 ? (vector[3] || 0) * 6 : 0; // Increased from 3 to 6
    
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
            
                         // Create much better label spacing using a circular pattern around each sphere
             const labelRadius = 1.2; // Distance from sphere center
             const angleOffset = (index * 137.5) % 360; // Golden angle for better distribution
             const heightVariation = Math.sin(index * 0.5) * 0.8; // Vertical variation
             
             const labelOffset = {
               x: Math.cos(angleOffset * Math.PI / 180) * labelRadius,
               y: 1.5 + heightVariation + (index % 4) * 0.4, // Much more vertical spacing
               z: Math.sin(angleOffset * Math.PI / 180) * labelRadius
             };

            return (
              <group key={point.id} position={[x, y, z]}>
                <Sphere 
                  args={[0.3, 16, 16]}
                  onPointerOver={() => onHover(point)}
                  onPointerOut={() => onHover(null)}
                >
                  <meshStandardMaterial 
                    color={color} 
                    emissive={color}
                    emissiveIntensity={0.2}
                    metalness={0.1}
                    roughness={0.3}
                  />
                </Sphere>
                                 {showLabels && (
                   <Html
                     position={[labelOffset.x, labelOffset.y, labelOffset.z]}
                     center
                     distanceFactor={15}
                     occlude={false}
                     transform={false}
                     sprite={true}
                   >
                     <div 
                       className="px-3 py-2 bg-black bg-opacity-90 text-white text-sm rounded-lg whitespace-nowrap pointer-events-none border border-gray-400 shadow-lg"
                       style={{
                         fontSize: '12px',
                         maxWidth: '180px',
                         textAlign: 'center',
                         textShadow: '0 0 3px black',
                         backdropFilter: 'blur(3px)',
                         minWidth: '80px'
                       }}
                     >
                       {point.metadata.title.length > 20 
                         ? `${point.metadata.title.substring(0, 17)}...` 
                         : point.metadata.title}
                     </div>
                   </Html>
                 )}
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<EmbeddingPoint | null>(null);
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

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      
      console.log('Triggering sync for project:', projectId);
      
      // Fetch the current project data to sync
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      if (!projectResponse.ok) {
        throw new Error('Failed to fetch project data');
      }
      const projectData = await projectResponse.json();
      
      // Fetch context documents
      const contextResponse = await fetch(`/api/projects/${projectId}/context`);
      const contextData = contextResponse.ok ? await contextResponse.json() : [];
      
      // Prepare data for sync
      const syncData = {
        ...projectData,
        requirements: projectData.documents?.requirements || '',
        design: projectData.documents?.design || '',
        tasks: projectData.documents?.tasks || '',
        progress: projectData.progress || {},
        contextDocuments: contextData
      };
      
      console.log('Syncing data:', {
        projectId,
        hasRequirements: !!syncData.requirements,
        hasDesign: !!syncData.design,
        hasTasks: !!syncData.tasks,
        contextCount: syncData.contextDocuments?.length || 0
      });
      
      const result = await fetch(`/api/projects/${projectId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceResync: true }),
      });

      if (!result.ok) {
        throw new Error('Failed to sync project');
      }

      const syncResult = await result.json();
      
      if (syncResult.success) {
        console.log('Sync successful, refreshing embeddings...');
        await fetchEmbeddings();
      } else {
        throw new Error(syncResult.message || 'Sync failed');
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync project');
    } finally {
      setIsSyncing(false);
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
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Sync Project
          </Button>
          
          <Button
            onClick={() => setShowLabels(!showLabels)}
            variant="outline"
            size="sm"
          >
            {showLabels ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showLabels ? 'Hide' : 'Show'} Labels
          </Button>
        </div>
        
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <Badge variant="outline">Total: {stats.total}</Badge>
          <Badge variant="outline">Requirements: {stats.requirements}</Badge>
          <Badge variant="outline">Design: {stats.design}</Badge>
          <Badge variant="outline">Tasks: {stats.tasks}</Badge>
          <Badge variant="outline">Progress: {stats.progress}</Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Context: {stats.context}</Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {/* 3D Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>3D Vector Space Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading embeddings...</span>
              </div>
            ) : points.length === 0 ? (
              <div className="text-center">
                <div className="text-gray-500 mb-4">
                  <div className="text-lg font-medium">No embeddings found</div>
                  <div className="text-sm">This project hasn't been synced to create embeddings yet.</div>
                </div>
                <Button onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Sync Project to Create Embeddings
                </Button>
              </div>
            ) : (
                             <Canvas camera={{ position: [0, 0, 25], fov: 75 }}>
                 <VisualizationScene 
                   points={points} 
                   isLoading={isLoading} 
                   showLabels={showLabels} 
                   onHover={setHoveredPoint}
                 />
               </Canvas>
            )}
          </div>
          
          {/* Hover Information Panel */}
          {hoveredPoint && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="capitalize">
                  {hoveredPoint.metadata.type}
                </Badge>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {hoveredPoint.metadata.title}
                  </h4>
                  {hoveredPoint.metadata.content && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {hoveredPoint.metadata.content}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Vector dimensions: {hoveredPoint.vector.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
