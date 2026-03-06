/**
 * Pipeline Store
 * 
 * Global state management for pipeline configuration and active jobs
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  TrainingSensitivity,
  TrainingProgression,
  TrainingRepetition,
  PipelineTrainingJob,
  DEFAULT_ENGINE,
} from '@/types/pipeline';
import { estimateTrainingCost } from '@/lib/pipeline/hyperparameter-utils';

interface PipelineState {
  // Configuration state
  selectedFileId: string | null;
  selectedFileName: string | null;
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
  jobName: string;
  
  // Active job tracking
  activeJobId: string | null;
  activeJob: PipelineTrainingJob | null;
  
  // Actions
  setSelectedFile: (id: string | null, name?: string | null) => void;
  setTrainingSensitivity: (value: TrainingSensitivity) => void;
  setTrainingProgression: (value: TrainingProgression) => void;
  setTrainingRepetition: (value: TrainingRepetition) => void;
  setJobName: (name: string) => void;
  setActiveJob: (job: PipelineTrainingJob | null) => void;
  resetConfiguration: () => void;
  
  // Computed getters
  getCostEstimate: () => {
    computeCost: number;
    evaluationCost: number;
    totalCost: number;
    estimatedDuration: string;
  };
  isConfigurationValid: () => boolean;
  getEngine: () => typeof DEFAULT_ENGINE;
}

const DEFAULT_CONFIG = {
  selectedFileId: null,
  selectedFileName: null,
  trainingSensitivity: 'medium' as TrainingSensitivity,
  trainingProgression: 'medium' as TrainingProgression,
  trainingRepetition: 3 as TrainingRepetition,
  jobName: '',
  activeJobId: null,
  activeJob: null,
};

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CONFIG,
      
      // Setters
      setSelectedFile: (id, name) => set({ 
        selectedFileId: id, 
        selectedFileName: name || null 
      }),
      
      setTrainingSensitivity: (value) => set({ trainingSensitivity: value }),
      
      setTrainingProgression: (value) => set({ trainingProgression: value }),
      
      setTrainingRepetition: (value) => set({ trainingRepetition: value }),
      
      setJobName: (name) => set({ jobName: name }),
      
      setActiveJob: (job) => set({ 
        activeJob: job, 
        activeJobId: job?.id ?? null 
      }),
      
      resetConfiguration: () => set(DEFAULT_CONFIG),
      
      // Computed
      getCostEstimate: () => {
        const { trainingSensitivity, trainingProgression, trainingRepetition } = get();
        return estimateTrainingCost({
          trainingSensitivity,
          trainingProgression,
          trainingRepetition,
        });
      },
      
      isConfigurationValid: () => {
        const { selectedFileId, jobName } = get();
        return selectedFileId !== null && jobName.trim().length > 0;
      },
      
      getEngine: () => DEFAULT_ENGINE,
    }),
    {
      name: 'pipeline-config',
      partialize: (state) => ({
        // Only persist configuration, not active job
        trainingSensitivity: state.trainingSensitivity,
        trainingProgression: state.trainingProgression,
        trainingRepetition: state.trainingRepetition,
      }),
    }
  )
);
