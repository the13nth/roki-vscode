"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { User } from "lucide-react"

export const ClientNode = memo(({ data, isConnectable }: NodeProps) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500 min-w-[150px]">
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-500">
          <User className="h-4 w-4" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{(data.label as string) || "Client"}</div>
          <div className="text-xs text-gray-500">{(data.description as string) || "End customer or client"}</div>
        </div>
      </div>

      {(data.clientType as string) && <div className="mt-2 text-xs bg-blue-100 p-1 rounded">Type: {data.clientType as string}</div>}
      {(data.segment as string) && <div className="mt-1 text-xs bg-blue-100 p-1 rounded">Segment: {data.segment as string}</div>}
      {(data.valueProposition as string) && <div className="mt-1 text-xs bg-blue-100 p-1 rounded">Value: {data.valueProposition as string}</div>}

      {/* Top handles */}
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-blue-500" id="top-center" />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" style={{ left: '25%' }} id="top-left" />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" style={{ left: '75%' }} id="top-right" />
      
      {/* Bottom handles */}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-blue-500" id="bottom-center" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" style={{ left: '25%' }} id="bottom-left" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" style={{ left: '75%' }} id="bottom-right" />
      
      {/* Side handles */}
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" id="left-center" />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-2 h-2 bg-blue-400" id="right-center" />
    </div>
  )
})

ClientNode.displayName = "ClientNode"
