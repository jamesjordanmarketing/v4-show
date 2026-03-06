import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { FlaskConical, Rocket, Archive, Trash2, AlertTriangle } from 'lucide-react';
import type { ModelArtifact, ModelStatus } from '../../data/modelArtifactsMockData';

interface ModelActionsProps {
  model: ModelArtifact;
  onStatusChange: (newStatus: ModelStatus) => void;
  onDelete: () => void;
}

export function ModelActions({ model, onStatusChange, onDelete }: ModelActionsProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const handleArchive = () => {
    onStatusChange('archived');
    setShowArchiveDialog(false);
  };
  
  const handleDelete = () => {
    if (deleteConfirmation === model.name) {
      onDelete();
      setShowDeleteDialog(false);
    }
  };
  
  const canTest = model.status === 'stored' || model.status === 'testing';
  const canDeploy = model.status !== 'production' && model.status !== 'archived';
  const canArchive = model.status !== 'archived';
  
  return (
    <>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Model Actions</h3>
        
        <div className="space-y-3">
          {/* Test Model */}
          <Button
            className="w-full justify-start"
            variant="outline"
            disabled={!canTest}
            onClick={() => {
              console.log('Test model - feature coming soon');
              alert('Test Model feature coming soon!\n\nThis will launch an inference interface where you can test the LoRA adapter with sample prompts.');
            }}
          >
            <FlaskConical className="size-4 mr-2" />
            Test Model
            {!canTest && <span className="ml-auto text-xs text-muted-foreground">(Unavailable)</span>}
          </Button>
          
          {/* Deploy to Production */}
          <Button
            className="w-full justify-start"
            variant="outline"
            disabled={!canDeploy}
            onClick={() => {
              if (model.status === 'production') {
                alert('Model is already in production');
              } else {
                onStatusChange('production');
              }
            }}
          >
            <Rocket className="size-4 mr-2" />
            Deploy to Production
            {!canDeploy && <span className="ml-auto text-xs text-muted-foreground">(Already deployed)</span>}
          </Button>
          
          {/* Archive */}
          <Button
            className="w-full justify-start"
            variant="outline"
            disabled={!canArchive}
            onClick={() => setShowArchiveDialog(true)}
          >
            <Archive className="size-4 mr-2" />
            Archive Model
            {!canArchive && <span className="ml-auto text-xs text-muted-foreground">(Already archived)</span>}
          </Button>
          
          {/* Delete */}
          <Button
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="size-4 mr-2" />
            Delete Model
          </Button>
        </div>
        
        {/* Info */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">Note:</span> Archived models can be restored.
            Deleted models are permanently removed from storage.
          </p>
        </div>
      </Card>
      
      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="size-5 text-amber-600" />
              Archive Model
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this model?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg mb-4">
              <p className="font-medium mb-1">{model.name}</p>
              <p className="text-sm text-muted-foreground">
                Status will change from "{model.status}" to "archived"
              </p>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">ℹ️ Info:</span> Archived models are not available
                for deployment but can be restored later. The model files remain in storage.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleArchive}
            >
              <Archive className="size-4 mr-2" />
              Archive Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-600" />
              Delete Model Permanently
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the model
              and remove all files from storage.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Warning: Permanent Deletion
                  </p>
                  <ul className="text-xs text-red-800 space-y-1">
                    <li>• Model files will be permanently deleted</li>
                    <li>• Training history will be preserved (for reference)</li>
                    <li>• This action cannot be reversed</li>
                    <li>• You will need to retrain to recreate this model</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Type the model name to confirm: <code className="text-xs bg-muted px-1 py-0.5 rounded">{model.name}</code>
              </p>
              <Input
                placeholder="Enter model name"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmation('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmation !== model.name}
            >
              <Trash2 className="size-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
