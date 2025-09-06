'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileOutput, Mail, Users, Download } from 'lucide-react';

export function OutputNode({ data, selected, isConnectable }: NodeProps) {
  const getIcon = () => {
    if (data.type === 'email-output') return <Mail className="w-4 h-4" />;
    if (data.type === 'user-notification') return <Users className="w-4 h-4" />;
    if (data.type === 'file-output') return <Download className="w-4 h-4" />;
    return <FileOutput className="w-4 h-4" />;
  };

  const getColor = () => {
    if (data.type === 'email-output') return 'bg-red-100 border-red-300 text-red-800';
    if (data.type === 'user-notification') return 'bg-orange-100 border-orange-300 text-orange-800';
    if (data.type === 'file-output') return 'bg-purple-100 border-purple-300 text-purple-800';
    return 'bg-red-100 border-red-300 text-red-800';
  };

  return (
    <div
      className={`
        px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px]
        ${getColor()}
        ${selected ? 'ring-2 ring-red-500' : ''}
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

      {/* Output-specific info */}
      {(data.emailTo as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1 mb-1">
          📧 {data.emailTo as string}
        </div>
      )}
      
      {(data.filePath as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1 mb-1">
          📁 {(data.filePath as string).split('/').pop()}
        </div>
      )}

      {(data.outputFormat as string) && (
        <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1">
          📄 {(data.outputFormat as string).toUpperCase()}
        </div>
      )}

      {/* Top handles */}
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-red-500" id="top-center" />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-red-400" style={{ left: '25%' }} id="top-left" />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-red-400" style={{ left: '75%' }} id="top-right" />
      
      {/* Bottom handles */}
      <Handle type="target" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-red-500" id="bottom-center" />
      <Handle type="target" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-red-400" style={{ left: '25%' }} id="bottom-left" />
      <Handle type="target" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-red-400" style={{ left: '75%' }} id="bottom-right" />
      
      {/* Side handles */}
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-2 h-2 bg-red-400" id="left-center" />
      <Handle type="target" position={Position.Right} isConnectable={isConnectable} className="w-2 h-2 bg-red-400" id="right-center" />
    </div>
  );
}
