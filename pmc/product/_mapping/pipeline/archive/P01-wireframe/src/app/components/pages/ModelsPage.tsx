import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Brain, Download, Play, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Model {
  id: string;
  name: string;
  version: string;
  status: 'testing' | 'production' | 'archived';
  createdAt: string;
  accuracy?: number;
  size: string;
}

const mockModels: Model[] = [
  {
    id: 'model-001',
    name: 'Customer Support LoRA v2.0',
    version: '2.0',
    status: 'production',
    createdAt: '2025-12-19',
    accuracy: 94.5,
    size: '2.3 GB'
  },
  {
    id: 'model-002',
    name: 'Product Description Generator',
    version: '1.2',
    status: 'production',
    createdAt: '2025-12-18',
    accuracy: 91.2,
    size: '1.8 GB'
  },
  {
    id: 'model-003',
    name: 'Technical Documentation Assistant',
    version: '1.0',
    status: 'testing',
    createdAt: '2025-12-17',
    accuracy: 88.7,
    size: '2.1 GB'
  }
];

interface ModelsPageProps {
  onViewArtifact?: (artifactId: string, modelName: string) => void;
}

export function ModelsPage({ onViewArtifact }: ModelsPageProps = {}) {
  const getStatusBadge = (status: Model['status']) => {
    const variants = {
      production: 'default',
      testing: 'secondary',
      archived: 'outline'
    } as const;

    const labels = {
      production: '🟢 Production',
      testing: '🟡 Testing',
      archived: '⚪ Archived'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Models</h1>
          <p className="text-muted-foreground mt-1">
            Manage your trained LoRA model artifacts
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Production Models</CardDescription>
            <CardTitle className="text-3xl">
              {mockModels.filter(m => m.status === 'production').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Currently deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Testing Models</CardDescription>
            <CardTitle className="text-3xl">
              {mockModels.filter(m => m.status === 'testing').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Under evaluation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Models</CardDescription>
            <CardTitle className="text-3xl">{mockModels.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All model versions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Models List */}
      <div className="space-y-4">
        <h2>All Models</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockModels.map((model) => (
            <Card key={model.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="size-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{model.name}</CardTitle>
                      <CardDescription>v{model.version}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(model.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {model.accuracy && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-medium">{model.accuracy}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium">{model.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{model.createdAt}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Download className="size-3 mr-1" />
                    Download
                  </Button>
                  {model.status === 'testing' && (
                    <Button size="sm" variant="default" className="flex-1">
                      <Play className="size-3 mr-1" />
                      Deploy
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State Alternative (if no models) */}
      {mockModels.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Brain className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="mb-2">No models yet</h3>
              <p className="text-muted-foreground mb-6">
                Train your first model to see it here
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}