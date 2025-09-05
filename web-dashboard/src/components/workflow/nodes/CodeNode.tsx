'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code, FileCode, Terminal } from 'lucide-react';

export function CodeNode({ data, selected }: NodeProps) {
  const getIcon = () => {
    if (data.type === 'script') return <Terminal className="w-4 h-4" />;
    if (data.type === 'function') return <FileCode className="w-4 h-4" />;
    return <Code className="w-4 h-4" />;
  };

  const getColor = () => {
    if (data.type === 'script') return 'bg-purple-100 border-purple-300 text-purple-800';
    if (data.type === 'function') return 'bg-indigo-100 border-indigo-300 text-indigo-800';
    return 'bg-purple-100 border-purple-300 text-purple-800';
  };

  return (
    <div
      className={`
        px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px]
        ${getColor()}
        ${selected ? 'ring-2 ring-purple-500' : ''}
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

      {/* Code info */}
      {(data.code as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1 mb-1">
          📝 {(data.code as string).split('\n').length} lines
        </div>
      )}

      {(data.language as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1 mb-1">
          💻 {data.language as string}
        </div>
      )}

      {(data.functionName as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1">
          🔧 {data.functionName as string}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
}
