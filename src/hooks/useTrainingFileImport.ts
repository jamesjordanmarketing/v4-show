import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * React Query hooks for training file import operations
 * From Section DATA-BRIDGE - Training Files to Datasets Migration
 */

/**
 * Hook for importing a training file as a dataset
 */
export function useImportTrainingFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trainingFileId: string) => {
      const response = await fetch('/api/datasets/import-from-training-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training_file_id: trainingFileId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-files-available'] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success(data.message || 'Training file imported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import training file');
    },
  });
}

/**
 * Hook for fetching training files available for import
 */
export function useAvailableTrainingFiles() {
  return useQuery({
    queryKey: ['training-files-available'],
    queryFn: async () => {
      const response = await fetch('/api/training-files/available-for-import');
      
      if (!response.ok) {
        throw new Error('Failed to fetch training files');
      }
      
      return response.json();
    },
  });
}

/**
 * Hook for bulk importing all available training files
 */
export function useBulkImportTrainingFiles() {
  const queryClient = useQueryClient();
  const importSingle = useImportTrainingFile();

  return useMutation({
    mutationFn: async (trainingFileIds: string[]) => {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const id of trainingFileIds) {
        try {
          const result = await importSingle.mutateAsync(id);
          results.push({ id, success: true, data: result });
          successCount++;
        } catch (error: any) {
          results.push({ id, success: false, error: error.message });
          errorCount++;
        }
      }

      return { results, successCount, errorCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-files-available'] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      
      if (data.errorCount === 0) {
        toast.success(`Successfully imported all ${data.successCount} training files`);
      } else {
        toast.warning(
          `Imported ${data.successCount} files, ${data.errorCount} failed`,
          { description: 'Check the list for details' }
        );
      }
    },
  });
}


