'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { EditorProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Edit3, AlertCircle, CheckCircle, Loader2, Zap } from 'lucide-react';

interface MarkdownEditorProps extends EditorProps {
  onSave?: (content: string) => Promise<void>;
  autoSaveDelay?: number;
  showPreview?: boolean;
  height?: string;
  onImproveWithAI?: () => Promise<void>;
  isImprovingWithAI?: boolean;
}

export function MarkdownEditor({
  content,
  onChange,
  onSave,
  autoSave = true,
  autoSaveDelay = 2000,
  showPreview = true,
  height = '600px',
  onImproveWithAI,
  isImprovingWithAI = false
}: MarkdownEditorProps) {
  const [editorContent, setEditorContent] = useState(content);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);

  // Debounced auto-save function
  const debouncedSave = useCallback(async (contentToSave: string) => {
    if (!onSave || !autoSave) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave(contentToSave);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, autoSave]);

  // Handle content changes
  const handleEditorChange = useCallback((value: string | undefined) => {
    const newContent = value || '';
    setEditorContent(newContent);
    onChange(newContent);
    setHasUnsavedChanges(true);
    setSaveError(null);

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    if (autoSave && onSave) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        debouncedSave(newContent);
      }, autoSaveDelay);
    }
  }, [onChange, autoSave, onSave, autoSaveDelay, debouncedSave]);

  // Manual save function
  const handleManualSave = useCallback(async () => {
    if (!onSave) return;

    // Clear auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    await debouncedSave(editorContent);
  }, [debouncedSave, editorContent]);

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleManualSave();
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Update editor content when prop changes
  useEffect(() => {
    if (content !== editorContent) {
      setEditorContent(content);
      setHasUnsavedChanges(false);
    }
  }, [content]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const formatLastSaved = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          {showPreview && (
            <div className="flex items-center bg-background rounded-none border">
              <Button
                variant={!isPreviewMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsPreviewMode(false)}
                className="rounded-none border-r border-border"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant={isPreviewMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsPreviewMode(true)}
                className="rounded-none"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          )}

          {/* Improve with AI Button */}
          {onImproveWithAI && (
            <Button
              onClick={onImproveWithAI}
              disabled={isImprovingWithAI}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-none ml-2"
            >
              {isImprovingWithAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Improving...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Improve with AI
                </>
              )}
            </Button>
          )}

          {/* Save Button */}
          {onSave && (
            <Button
              onClick={handleManualSave}
              disabled={isSaving || !hasUnsavedChanges}
              size="sm"
              className="rounded-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center space-x-4 text-sm">
          {saveError && (
            <Badge variant="destructive" className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {saveError}
            </Badge>
          )}

          {hasUnsavedChanges && !isSaving && (
            <Badge variant="secondary" className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Unsaved changes
            </Badge>
          )}

          {lastSaved && !hasUnsavedChanges && !isSaving && (
            <Badge variant="default" className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Saved at {formatLastSaved(lastSaved)}
            </Badge>
          )}

          {isSaving && (
            <Badge variant="secondary" className="flex items-center">
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Auto-saving...
            </Badge>
          )}
        </div>
      </div>

      {/* Editor/Preview Content */}
      <div className="flex-1 overflow-hidden" style={{ height: '500px' }}>
        {isPreviewMode ? (
          <div className="h-full overflow-y-auto overflow-x-hidden p-6 bg-background">
            <MarkdownPreview 
            content={editorContent} />
          </div>
        ) : (
          <Editor
            height="500px"
            defaultLanguage="markdown"
            value={editorContent}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              fontSize: 14,
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              suggest: {
                showKeywords: true,
                showSnippets: true,
              },
            }}
            theme="vs"
          />
        )}
      </div>
    </div>
  );
}

// Simple markdown preview component that renders content in a scrollable list
function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n');

  const renderLine = (line: string, index: number) => {
    const trimmedLine = line.trim();

    // Headers
    if (trimmedLine.startsWith('# ')) {
      return (
        <h1 key={index} className="text-2xl font-bold text-gray-900 mt-6 mb-4 first:mt-0">
          {trimmedLine.substring(2)}
        </h1>
      );
    }
    if (trimmedLine.startsWith('## ')) {
      return (
        <h2 key={index} className="text-xl font-semibold text-gray-800 mt-5 mb-3">
          {trimmedLine.substring(3)}
        </h2>
      );
    }
    if (trimmedLine.startsWith('### ')) {
      return (
        <h3 key={index} className="text-lg font-medium text-gray-700 mt-4 mb-2">
          {trimmedLine.substring(4)}
        </h3>
      );
    }

    // Lists
    if (trimmedLine.startsWith('- ')) {
      return (
        <div key={index} className="flex items-start space-x-2 my-1">
          <span className="text-gray-500 mt-1">•</span>
          <span className="text-gray-700">{trimmedLine.substring(2)}</span>
        </div>
      );
    }

    // Numbered lists
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      return (
        <div key={index} className="flex items-start space-x-2 my-1">
          <span className="text-blue-600 font-medium min-w-[20px]">{numberedMatch[1]}.</span>
          <span className="text-gray-700">{numberedMatch[2]}</span>
        </div>
      );
    }

    // Bold text
    if (trimmedLine.includes('**')) {
      const parts = trimmedLine.split('**');
      return (
        <p key={index} className="text-gray-700 my-2">
          {parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
          )}
        </p>
      );
    }

    // Code blocks
    if (trimmedLine.startsWith('```')) {
      return <div key={index} className="bg-gray-100 border-l-4 border-gray-300 my-2"></div>;
    }

    // Inline code
    if (trimmedLine.includes('`')) {
      const parts = trimmedLine.split('`');
      return (
        <p key={index} className="text-gray-700 my-2">
          {parts.map((part, i) =>
            i % 2 === 1 ?
              <code key={i} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">{part}</code> :
              part
          )}
        </p>
      );
    }

    // Empty lines
    if (trimmedLine === '') {
      return <div key={index} className="h-2"></div>;
    }

    // Regular paragraphs
    return (
      <p key={index} className="text-gray-700 my-2 leading-relaxed">
        {trimmedLine}
      </p>
    );
  };

  return (
    <div className="space-y-1">
      {lines.map((line, index) => renderLine(line, index))}
    </div>
  );
}