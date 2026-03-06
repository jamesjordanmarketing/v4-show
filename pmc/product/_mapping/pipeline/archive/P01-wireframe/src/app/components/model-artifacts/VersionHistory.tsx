import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Star, Download, Calendar } from 'lucide-react';
import type { ModelVersion } from '../../data/modelArtifactsMockData';
import { getQualityContext, getPresetDisplayName, formatFileSize } from '../../data/modelArtifactsMockData';

interface VersionHistoryProps {
  versions: ModelVersion[];
  currentVersionId: string;
  onVersionSelect: (versionId: string) => void;
}

export function VersionHistory({ versions, currentVersionId, onVersionSelect }: VersionHistoryProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`size-3 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Version History</h3>
        <Badge variant="outline">{versions.length} versions</Badge>
      </div>
      
      <div className="space-y-3">
        {versions.map((version) => {
          const qualityInfo = getQualityContext(version.qualityRating);
          const isCurrent = version.id === currentVersionId;
          
          return (
            <div
              key={version.id}
              className={`p-4 border rounded-lg transition-all ${
                isCurrent ? 'border-blue-500 bg-blue-50' : 'hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Version {version.version}</span>
                    {isCurrent && (
                      <Badge className="bg-blue-500 text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    {formatDate(version.createdAt)}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {renderStars(version.qualityRating)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Preset</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getPresetDisplayName(version.presetUsed)}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Validation Loss</p>
                  <p className="text-sm font-semibold mt-1">
                    {version.validationLoss.toFixed(4)}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-sm font-semibold mt-1">
                    ${version.totalCost.toFixed(2)}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">File Size</p>
                  <p className="text-sm font-semibold mt-1">
                    {formatFileSize(version.fileSize)}
                  </p>
                </div>
              </div>
              
              {!isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onVersionSelect(version.id)}
                >
                  View Version
                </Button>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">Tip:</span> Compare versions to identify
          which configuration produces the best results for your use case.
        </p>
      </div>
    </Card>
  );
}
