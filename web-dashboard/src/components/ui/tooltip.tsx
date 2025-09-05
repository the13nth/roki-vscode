"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

const Tooltip = ({ children, content, className }: TooltipProps) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={cn(
          "absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none",
          "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
          "before:content-[''] before:absolute before:top-full before:left-1/2 before:transform before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900",
          className
        )}
      >
        {content}
      </div>
    </div>
  )
}

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const TooltipTrigger = ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: any }) => {
  return <>{children}</>
}

const TooltipContent = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => {
  return <>{children}</>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
