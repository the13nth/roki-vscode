'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database, FileInput, Globe } from 'lucide-react';

export function InputNode({ data, selected, isConnectable }: NodeProps) {
  const getIcon = () => {
    if (data.type === 'api-input') return <Globe className="w-4 h-4" />;
    if (data.type === 'file-input') return <FileInput className="w-4 h-4" />;
    return <Database className="w-4 h-4" />;
  };

  const getColor = () => {
    if (data.type === 'api-input') return 'bg-blue-100 border-blue-300 text-blue-800';
    if (data.type === 'file-input') return 'bg-green-100 border-green-300 text-green-800';
    return 'bg-blue-100 border-blue-300 text-blue-800';
  };

  return (
    <div
      className={`
        px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px]
        ${getColor()}
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      <div className="flex items-center space-x-2 mb-2">
        {getIcon()}
        <div className="font-bold text-sm">{data.label as string}</div>
      </div>
      
      {(data.description as string) && (
        <div className="text-xs opacity-75 mb-2">
          {data.description as string}
        </div>
      )}

      {/* Input-specific info */}
      {(data.filePath as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1 mb-1">
          📁 {(data.filePath as string).split('/').pop()}
        </div>
      )}
      
      {(data.apiUrl as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1 mb-1">
          🌐 {(data.apiUrl as string).split('/').pop()}
        </div>
      )}

      {(data.outputFormat as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1">
          📄 {(data.outputFormat as string).toUpperCase()}
        </div>
      )}

      {/* Top handles */}
      <Handle type="source" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-blue-500" id="top-center" />
      <Handle type="source" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" style={{ left: '25%' }} id="top-left" />
      <Handle type="source" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" style={{ left: '75%' }} id="top-right" />
      
      {/* Bottom handles */}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-blue-500" id="bottom-center" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" style={{ left: '25%' }} id="bottom-left" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" style={{ left: '75%' }} id="bottom-right" />
      
      {/* Side handles */}
      <Handle type="source" position={Position.Left} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" id="left-center" />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" id="right-center" />
    </div>
  );
}
