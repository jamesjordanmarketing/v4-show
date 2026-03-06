"""
RunPod Serverless Handler for LoRA Training Jobs

This handler receives training job requests from the Supabase Edge Function,
validates parameters, executes training via train_lora.py, and manages job status.

Author: Bright Run AI
Date: December 28, 2025
"""

import runpod
import logging
import json
import traceback
import boto3
import os
from pathlib import Path
from typing import Dict, Any, Optional
from status_manager import StatusManager
from train_lora import train_lora_model

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize status manager
status_manager = StatusManager()


def validate_job_input(job_input: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate job input parameters.
    
    Args:
        job_input: Dictionary containing job configuration
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ['job_id', 'dataset_url', 'hyperparameters', 'gpu_config']
    
    # Check required top-level fields
    for field in required_fields:
        if field not in job_input:
            return False, f"Missing required field: {field}"
    
    # Validate hyperparameters
    hyperparams = job_input.get('hyperparameters', {})
    required_hyperparams = [
        'base_model', 'learning_rate', 'batch_size', 
        'epochs', 'rank'
    ]
    
    # Optional hyperparameters (alpha and dropout may not be sent)
    optional_hyperparams = ['alpha', 'dropout']
    
    for param in required_hyperparams:
        if param not in hyperparams:
            return False, f"Missing hyperparameter: {param}"
    
    # Validate ranges
    if not 0.00001 <= hyperparams['learning_rate'] <= 0.001:
        return False, "learning_rate must be between 0.00001 and 0.001"
    
    if not 1 <= hyperparams['batch_size'] <= 64:
        return False, "batch_size must be between 1 and 64"
    
    if not 1 <= hyperparams['epochs'] <= 20:
        return False, "epochs must be between 1 and 20"
    
    if not 4 <= hyperparams['rank'] <= 128:
        return False, "rank must be between 4 and 128"
    
    # Validate GPU config
    gpu_config = job_input.get('gpu_config', {})
    if 'type' not in gpu_config:
        return False, "Missing gpu_config.type"
    
    if 'count' not in gpu_config:
        return False, "Missing gpu_config.count"
    
    if not 1 <= gpu_config['count'] <= 8:
        return False, "count must be between 1 and 8"
    
    # Validate dataset URL
    dataset_url = job_input.get('dataset_url', '')
    if not dataset_url.startswith('https://'):
        return False, "dataset_url must be a valid HTTPS URL"
    
    return True, None


def upload_model_to_s3(job_id: str, model_dir: str) -> Dict[str, str]:
    """
    Upload model files to RunPod S3 and return presigned URLs.
    
    Args:
        job_id: Training job ID
        model_dir: Directory containing trained model files
        
    Returns:
        Dictionary mapping filename to presigned URL
    """
    logger.info(f"Uploading model files for job {job_id} to S3...")
    
    try:
        # Initialize S3 client with RunPod endpoint
        s3_client = boto3.client(
            's3',
            endpoint_url=os.environ.get('S3_ENDPOINT_URL'),
            aws_access_key_id=os.environ.get('S3_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('S3_SECRET_ACCESS_KEY')
        )
        
        bucket_name = os.environ.get('NETWORK_VOLUME_ID')
        logger.info(f"S3 Bucket: {bucket_name}")
        logger.info(f"S3 Endpoint: {os.environ.get('S3_ENDPOINT_URL')}")
        
        model_files = {}
        model_path = Path(model_dir)
        
        # Find all model files (adapter files, configs, etc.)
        file_patterns = [
            'adapter_model.bin',
            'adapter_model.safetensors',
            'adapter_config.json',
            'training_args.bin',
            '*.json',
            '*.bin',
            '*.safetensors'
        ]
        
        uploaded_files = set()
        
        for pattern in file_patterns:
            for file_path in model_path.glob(pattern):
                # Skip if already uploaded
                if file_path.name in uploaded_files:
                    continue
                    
                # Skip large non-adapter files
                if file_path.stat().st_size > 100_000_000:  # Skip files > 100MB
                    logger.warning(f"Skipping large file: {file_path.name} ({file_path.stat().st_size} bytes)")
                    continue
                
                s3_key = f"models/{job_id}/{file_path.name}"
                logger.info(f"Uploading {file_path.name} to s3://{bucket_name}/{s3_key}...")
                
                # Upload file to S3
                s3_client.upload_file(
                    str(file_path),
                    bucket_name,
                    s3_key
                )
                
                # Generate presigned URL (24 hours expiry)
                url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': bucket_name,
                        'Key': s3_key
                    },
                    ExpiresIn=86400  # 24 hours
                )
                
                model_files[file_path.name] = url
                uploaded_files.add(file_path.name)
                logger.info(f"✓ Uploaded {file_path.name}")
        
        logger.info(f"Successfully uploaded {len(model_files)} model files")
        return model_files
        
    except Exception as e:
        logger.error(f"Error uploading model files to S3: {str(e)}")
        logger.error(traceback.format_exc())
        return {}


def handler(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main RunPod serverless handler.
    
    Args:
        event: RunPod event containing job input
        
    Returns:
        Dictionary with job status and results
    """
    logger.info("=" * 80)
    logger.info("RunPod Handler: New job received")
    logger.info("=" * 80)
    
    try:
        # Extract job input
        job_input = event.get('input', {})
        job_id = job_input.get('job_id', 'unknown')
        
        logger.info(f"Job ID: {job_id}")
        logger.info(f"Input keys: {list(job_input.keys())}")
        
        # Validate input
        is_valid, error_message = validate_job_input(job_input)
        if not is_valid:
            logger.error(f"Validation failed: {error_message}")
            status_manager.update_status(
                job_id=job_id,
                status='failed',
                error_message=f"Validation error: {error_message}"
            )
            return {
                "status": "failed",
                "error_message": f"Validation error: {error_message}",
                "job_id": job_id
            }
        
        logger.info("Validation passed")
        
        # Initialize job status
        status_manager.update_status(
            job_id=job_id,
            status='initializing',
            stage='setup',
            progress=0.0
        )
        
        # Log configuration
        hyperparams = job_input['hyperparameters']
        logger.info(f"Base Model: {hyperparams['base_model']}")
        logger.info(f"Learning Rate: {hyperparams['learning_rate']}")
        logger.info(f"Batch Size: {hyperparams['batch_size']}")
        logger.info(f"Epochs: {hyperparams['epochs']}")
        logger.info(f"LoRA Rank: {hyperparams['rank']}")
        logger.info(f"GPU Type: {job_input['gpu_config']['type']}")
        
        # Execute training
        logger.info("Starting training execution...")
        result = train_lora_model(
            job_id=job_id,
            dataset_url=job_input['dataset_url'],
            hyperparameters=hyperparams,
            gpu_config=job_input['gpu_config'],
            callback_url=job_input.get('callback_url'),
            status_manager=status_manager
        )
        
        if result['status'] == 'completed':
            logger.info("=" * 80)
            logger.info("Training completed successfully!")
            logger.info(f"Adapter path: {result.get('adapter_path', 'N/A')}")
            logger.info("=" * 80)
            
            # Upload model files to S3 and get URLs
            adapter_path = result.get('adapter_path')
            model_files = {}
            
            if adapter_path and os.path.exists(adapter_path):
                logger.info("Uploading model files to S3...")
                model_files = upload_model_to_s3(job_id, adapter_path)
                
                if model_files:
                    logger.info(f"Model files uploaded: {list(model_files.keys())}")
                else:
                    logger.warning("No model files were uploaded to S3")
            else:
                logger.warning(f"Adapter path not found or invalid: {adapter_path}")
            
            # Return enhanced result with model file URLs
            return {
                "status": "success",
                "model_files": model_files,
                "model_metadata": {
                    "base_model": hyperparams.get('base_model', 'unknown'),
                    "lora_rank": hyperparams.get('rank', 0),
                    "final_loss": result.get('final_loss', 0.0),
                    "training_time": result.get('training_time', 0)
                },
                "progress": 100,
                "current_epoch": result.get('epochs_completed', hyperparams.get('epochs', 0)),
                "current_step": result.get('steps_completed', 0),
                "job_id": job_id
            }
        else:
            logger.error("=" * 80)
            logger.error("Training failed!")
            logger.error(f"Error: {result.get('error_message', 'Unknown error')}")
            logger.error("=" * 80)
        
        return result
        
    except Exception as e:
        error_msg = f"Handler exception: {str(e)}"
        error_trace = traceback.format_exc()
        logger.error(error_msg)
        logger.error(error_trace)
        
        job_id = event.get('input', {}).get('job_id', 'unknown')
        status_manager.update_status(
            job_id=job_id,
            status='failed',
            error_message=error_msg
        )
        
        return {
            "status": "failed",
            "error_message": error_msg,
            "traceback": error_trace,
            "job_id": job_id
        }


# Start RunPod serverless worker
if __name__ == "__main__":
    logger.info("Starting RunPod serverless worker...")
    logger.info("Waiting for jobs...")
    runpod.serverless.start({"handler": handler})
