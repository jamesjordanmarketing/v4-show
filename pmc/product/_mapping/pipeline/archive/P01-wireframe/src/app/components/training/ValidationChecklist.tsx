import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import type { ValidationItem } from '../../data/trainingConfigMockData';

interface ValidationChecklistProps {
  items: ValidationItem[];
  className?: string;
}

export function ValidationChecklist({ items, className = '' }: ValidationChecklistProps) {
  const getStatusIcon = (status: ValidationItem['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="size-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="size-5 text-yellow-600" />;
      case 'incomplete':
        return <XCircle className="size-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: ValidationItem['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'incomplete':
        return 'bg-red-50 border-red-200';
    }
  };

  const allValid = items.every(item => 
    item.status === 'complete' || item.status === 'warning'
  );

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Pre-Launch Validation</h3>
        {allValid ? (
          <Badge className="bg-green-500 hover:bg-green-600">Ready to Launch</Badge>
        ) : (
          <Badge variant="secondary">Incomplete</Badge>
        )}
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-md border ${getStatusColor(item.status)}`}
          >
            <div className="mt-0.5 shrink-0">
              {getStatusIcon(item.status)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.message}</p>
            </div>
          </div>
        ))}
      </div>

      {items.some(item => item.status === 'warning') && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <Info className="size-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-800">
            Some items require acknowledgment. Review warnings before proceeding.
          </p>
        </div>
      )}
    </Card>
  );
}
