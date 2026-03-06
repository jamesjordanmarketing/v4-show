/**
 * Pipeline Job Adapter Download API
 * 
 * GET - Download trained adapter files as ZIP archive
 */

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { getPipelineJob } from '@/lib/services/pipeline-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const jobId = params.jobId;

  try {
    // 1. Get job details
    const jobResult = await getPipelineJob(jobId);
    
    if (!jobResult.success || !jobResult.data) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const job = jobResult.data;

    // 2. Ownership check — pipeline jobs use userId (mapped from user_id column)
    if (!job.userId || job.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // 2. Validate job is completed
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Training must be complete before downloading' },
        { status: 400 }
      );
    }

    // 3. Check adapter path exists
    if (!job.adapterFilePath) {
      return NextResponse.json(
        { error: 'Adapter files not found. Training may have failed.' },
        { status: 404 }
      );
    }

    // 4. Get storage client with admin privileges
    const supabase = createServerSupabaseAdminClient();
    
    // 5. Parse storage path
    // Expected formats:
    // - "lora-models/adapters/{job_id}.tar.gz" (single file)
    // - "lora-models/adapters/{job_id}" (folder)
    // - "adapters/{job_id}.tar.gz" (single file without bucket)
    const pathParts = job.adapterFilePath.split('/');
    let bucket = 'lora-models';
    let filePath = job.adapterFilePath;
    
    // If path includes bucket name, extract it
    if (pathParts[0] === 'lora-models') {
      bucket = pathParts[0];
      filePath = pathParts.slice(1).join('/');
    }
    
    console.log(`Downloading from bucket: ${bucket}, path: ${filePath}`);
    
    // 6. Check if this is a single file (has extension) or a folder
    const isSingleFile = /\.(tar\.gz|tgz|zip|tar)$/i.test(filePath);
    
    if (isSingleFile) {
      // Simple case: Download the single archive file and serve it
      console.log('Detected single archive file, downloading directly...');
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (downloadError || !fileData) {
        console.error('Error downloading file:', downloadError);
        return NextResponse.json(
          { error: 'Adapter file not found in storage' },
          { status: 404 }
        );
      }

      console.log(`Downloaded file successfully`);

      // Determine content type and filename based on extension
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      let fileEnding = '.tar.gz';
      
      if (filePath.endsWith('.tar.gz')) {
        contentType = 'application/gzip';
        fileEnding = '.tar.gz';
      } else if (fileExtension === 'zip') {
        contentType = 'application/zip';
        fileEnding = '.zip';
      } else if (fileExtension === 'tar') {
        contentType = 'application/x-tar';
        fileEnding = '.tar';
      }

      const sanitizedJobName = job.jobName.replace(/[^a-z0-9]/gi, '_');
      const filename = `${sanitizedJobName}_adapter${fileEnding}`;

      // Convert blob to buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new Response(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
      
    } else {
      // Complex case: List folder contents and create ZIP
      console.log('Detected folder path, listing files...');
      
      const { data: fileList, error: listError } = await supabase.storage
        .from(bucket)
        .list(filePath);

      if (listError) {
        console.error('Error listing files:', listError);
        return NextResponse.json(
          { error: 'Adapter files not found in storage' },
          { status: 404 }
        );
      }

      if (!fileList || fileList.length === 0) {
        console.error('No files found in folder:', filePath);
        return NextResponse.json(
          { error: 'No adapter files found in storage' },
          { status: 404 }
        );
      }

      console.log(`Found ${fileList.length} files:`, fileList.map(f => f.name));

      // Create ZIP archive
      const zip = new JSZip();
      let filesAdded = 0;

      // Download and add each file to ZIP
      for (const file of fileList) {
        // Skip directories
        if (!file.name || file.id === null) {
          continue;
        }

        const fullPath = `${filePath}/${file.name}`;
        console.log(`Downloading file: ${fullPath}`);
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(fullPath);

        if (downloadError) {
          console.error(`Failed to download ${fullPath}:`, downloadError);
          continue; // Skip failed files, don't fail entire download
        }

        if (!fileData) {
          console.error(`No data for ${fullPath}`);
          continue;
        }

        // Add file to ZIP
        const arrayBuffer = await fileData.arrayBuffer();
        zip.file(file.name, arrayBuffer);
        filesAdded++;
        console.log(`Added ${file.name} to ZIP (${arrayBuffer.byteLength} bytes)`);
      }

      // Verify we added at least one file
      if (filesAdded === 0) {
        return NextResponse.json(
          { error: 'No valid adapter files found' },
          { status: 404 }
        );
      }

      // Generate ZIP
      console.log(`Generating ZIP with ${filesAdded} files...`);
      const zipBlob = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      console.log(`ZIP generated: ${zipBlob.length} bytes`);

      // Create sanitized filename
      const sanitizedJobName = job.jobName.replace(/[^a-z0-9]/gi, '_');
      const filename = `${sanitizedJobName}_adapter.zip`;

      // Return ZIP as response
      return new Response(zipBlob as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': zipBlob.length.toString(),
        },
      });
    }

  } catch (error) {
    console.error('Error creating adapter ZIP:', error);
    return NextResponse.json(
      { error: 'Error creating download package. Please try again.' },
      { status: 500 }
    );
  }
}
