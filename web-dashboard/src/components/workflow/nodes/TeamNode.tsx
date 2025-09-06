"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { UserCheck } from "lucide-react"

export const TeamNode = memo(({ data, isConnectable }: NodeProps) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-indigo-500 min-w-[150px]">
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-500">
          <UserCheck className="h-4 w-4" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{(data.label as string) || "Team Member"}</div>
          <div className="text-xs text-gray-500">{(data.description as string) || "Team member or executive"}</div>
        </div>
      </div>

      {(data.role as string) && <div className="mt-2 text-xs bg-indigo-100 p-1 rounded">Role: {data.role as string}</div>}
      {(data.department as string) && <div className="mt-1 text-xs bg-indigo-100 p-1 rounded">Dept: {data.department as string}</div>}
      {(data.experience as string) && <div className="mt-1 text-xs bg-indigo-100 p-1 rounded">Exp: {data.experience as string}</div>}

      {/* Top handles */}
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-indigo-500" id="top-center" />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-indigo-400" style={{ left: '25%' }} id="top-left" />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-indigo-400" style={{ left: '75%' }} id="top-right" />
      
      {/* Bottom handles */}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-indigo-500" id="bottom-center" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-indigo-400" style={{ left: '25%' }} id="bottom-left" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-indigo-400" style={{ left: '75%' }} id="bottom-right" />
      
      {/* Side handles */}
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-2 h-2 bg-indigo-400" id="left-center" />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-2 h-2 bg-indigo-400" id="right-center" />
    </div>
  )
})

TeamNode.displayName = "TeamNode"
