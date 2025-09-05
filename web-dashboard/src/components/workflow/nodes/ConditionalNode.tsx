'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, CheckCircle, XCircle } from 'lucide-react';

export function ConditionalNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px]
        bg-yellow-100 border-yellow-300 text-yellow-800
        ${selected ? 'ring-2 ring-yellow-500' : ''}
      `}
    >
      <div className="flex items-center space-x-2 mb-2">
        <GitBranch className="w-4 h-4" />
        <div className="font-bold text-sm">{data.label as string}</div>
      </div>
      
      {(data.description as string) && (
        <div className="text-xs opacity-75 mb-2">
          {data.description as string}
        </div>
      )}

      {/* Condition info */}
      {(data.condition as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1 mb-2">
          🔍 {(data.condition as string).length > 30 ? (data.condition as string).substring(0, 30) + '...' : (data.condition as string)}
        </div>
      )}

      {/* Branch indicators */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          <CheckCircle className="w-3 h-3 text-green-600" />
          <span>True</span>
        </div>
        <div className="flex items-center space-x-1">
          <XCircle className="w-3 h-3 text-red-600" />
          <span>False</span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '30%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '70%' }}
        className="w-3 h-3 bg-red-500"
      />
    </div>
  );
}
