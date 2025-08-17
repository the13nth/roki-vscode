import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TechnologyStack {
  backend: string;
  frontend: string;
  uiFramework: string;
  authentication: string;
  hosting: string;
}

interface TechStackReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasoning: string;
  suggestedStack: TechnologyStack;
  currentStack: TechnologyStack;
  onApprove: () => void;
}

export function TechStackReasoningModal({
  isOpen,
  onClose,
  reasoning,
  suggestedStack,
  currentStack,
  onApprove
}: TechStackReasoningModalProps) {
  // Compare suggested stack with current stack
  const hasChanges = Object.keys(suggestedStack).some(
    key => suggestedStack[key as keyof TechnologyStack] !== currentStack[key as keyof TechnologyStack]
  );

  const getStackComparison = () => {
    const comparisons = [];
    const categories = [
      { key: 'backend', label: 'Backend' },
      { key: 'frontend', label: 'Frontend' },
      { key: 'uiFramework', label: 'UI Framework' },
      { key: 'authentication', label: 'Authentication' },
      { key: 'hosting', label: 'Hosting' }
    ];

    for (const category of categories) {
      const current = currentStack[category.key as keyof TechnologyStack];
      const suggested = suggestedStack[category.key as keyof TechnologyStack];
      const isChanged = current !== suggested;
      
      comparisons.push({
        category: category.label,
        current,
        suggested,
        isChanged
      });
    }

    return comparisons;
  };

  const comparisons = getStackComparison();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            AI Technology Stack Recommendation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 p-3 rounded-lg border">
            {hasChanges ? (
              <>
                <XCircle className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-orange-700">
                  Changes Recommended
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {comparisons.filter(c => c.isChanged).length} changes
                </Badge>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700">
                  Current Stack is Optimal
                </span>
              </>
            )}
          </div>

          {/* Stack Comparison */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Technology Stack Comparison</h3>
            <div className="grid gap-3">
              {comparisons.map((comparison) => (
                <div
                  key={comparison.category}
                  className={`p-3 rounded-lg border ${
                    comparison.isChanged ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{comparison.category}</span>
                    {comparison.isChanged ? (
                      <XCircle className="h-4 w-4 text-orange-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Current:</span>
                      <Badge variant="outline" className="text-xs">
                        {comparison.current || 'Not set'}
                      </Badge>
                    </div>
                    {comparison.isChanged && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Suggested:</span>
                        <Badge variant="default" className="text-xs bg-orange-500">
                          {comparison.suggested}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">AI Reasoning</h3>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {reasoning}
                </pre>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {hasChanges && (
              <Button onClick={onApprove} className="bg-orange-500 hover:bg-orange-600">
                Apply Changes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

