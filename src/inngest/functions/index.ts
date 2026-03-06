import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';
import { refreshInferenceWorkers } from './refresh-inference-workers';
import { restartInferenceWorkers } from './restart-inference-workers';
import { autoEnrichConversation } from './auto-enrich-conversation';
import { buildTrainingSet } from './build-training-set';
import { rebuildTrainingSet } from './rebuild-training-set';
import { processBatchJob } from './process-batch-job';
import { batchEnrichConversations } from './batch-enrich-conversations';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  restartInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
  processBatchJob,
  batchEnrichConversations,
];

export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  restartInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
  processBatchJob,
  batchEnrichConversations,
};
