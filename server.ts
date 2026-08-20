import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// In-memory or fallback local storage folder for large uploads when R2 is in setup phase
const UPLOADS_DIR = path.join(process.cwd(), 'local_storage');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage for local buffer / direct upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4GB max file size
});

// Runtime Cloudflare R2 configuration
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

let currentR2Config: R2Config = {
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || '',
  publicUrl: process.env.R2_PUBLIC_URL || '',
};

function getR2Client(): S3Client | null {
  if (
    !currentR2Config.accountId ||
    !currentR2Config.accessKeyId ||
    !currentR2Config.secretAccessKey
  ) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${currentR2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: currentR2Config.accessKeyId,
      secretAccessKey: currentR2Config.secretAccessKey,
    },
  });
}

// Server-side persistent state for 53 structures and their uploaded files
interface StoredFile {
  id: string;
  name: string;
  extension: string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadDate: string;
  uploadedBy: string;
  version: string;
  status: 'verified' | 'pending' | 'critical';
  category: string;
  branch: string;
  drawingNumber?: string;
  revision?: string;
  r2Key?: string;
  downloadUrl?: string;
  localPath?: string;
}

const SERVER_STORE_FILE = path.join(process.cwd(), 'server_store.json');
const NODES_STORE_FILE = path.join(process.cwd(), 'nodes_store.json');

function loadServerFiles(): Record<string, StoredFile[]> {
  try {
    if (fs.existsSync(SERVER_STORE_FILE)) {
      const data = fs.readFileSync(SERVER_STORE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading server store:', err);
  }
  return {};
}

function saveServerFiles(data: Record<string, StoredFile[]>) {
  try {
    fs.writeFileSync(SERVER_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server store:', err);
  }
}

function loadServerNodes(): any[] {
  try {
    if (fs.existsSync(NODES_STORE_FILE)) {
      const data = fs.readFileSync(NODES_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading nodes store:', err);
  }
  return [];
}

function saveServerNodes(nodes: any[]) {
  try {
    fs.writeFileSync(NODES_STORE_FILE, JSON.stringify(nodes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving nodes store:', err);
  }
}

// Global in-memory storage dictionary initialized from disk
let structureFiles: Record<string, StoredFile[]> = loadServerFiles();
let serverNodes: any[] = loadServerNodes();

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1.1 Master Nodes CRUD API (Synchronizes the 53 plant structures & attachments)
app.get('/api/nodes', (req, res) => {
  try {
    const nodes = loadServerNodes();
    res.json({ success: true, nodes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/nodes', (req, res) => {
  try {
    const { nodes } = req.body;
    if (Array.isArray(nodes)) {
      serverNodes = nodes;
      saveServerNodes(nodes);

      // Sync structureFiles from nodes
      const newFilesMap: Record<string, StoredFile[]> = {};
      nodes.forEach((n: any) => {
        if (n.code && Array.isArray(n.files)) {
          newFilesMap[n.code] = n.files;
        }
      });
      structureFiles = newFilesMap;
      saveServerFiles(structureFiles);
    }
    res.json({ success: true, count: Array.isArray(nodes) ? nodes.length : 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Cloudflare R2 Status & Configuration
app.get('/api/r2/status', (req, res) => {
  const isConfigured = Boolean(
    currentR2Config.accountId &&
    currentR2Config.accessKeyId &&
    currentR2Config.secretAccessKey &&
    currentR2Config.bucketName
  );

  res.json({
    configured: isConfigured,
    accountId: currentR2Config.accountId ? `${currentR2Config.accountId.slice(0, 4)}...${currentR2Config.accountId.slice(-4)}` : '',
    bucketName: currentR2Config.bucketName || '',
    publicUrl: currentR2Config.publicUrl || '',
    hasAccessKey: Boolean(currentR2Config.accessKeyId),
    hasSecretKey: Boolean(currentR2Config.secretAccessKey),
    endpoint: currentR2Config.accountId ? `https://${currentR2Config.accountId}.r2.cloudflarestorage.com` : '',
  });
});

app.post('/api/r2/config', (req, res) => {
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = req.body;

  if (accountId !== undefined) currentR2Config.accountId = accountId.trim();
  if (accessKeyId !== undefined) currentR2Config.accessKeyId = accessKeyId.trim();
  if (secretAccessKey !== undefined) currentR2Config.secretAccessKey = secretAccessKey.trim();
  if (bucketName !== undefined) currentR2Config.bucketName = bucketName.trim();
  if (publicUrl !== undefined) currentR2Config.publicUrl = publicUrl.trim();

  res.json({
    success: true,
    message: 'Cloudflare R2 configuration updated successfully',
    configured: Boolean(
      currentR2Config.accountId &&
      currentR2Config.accessKeyId &&
      currentR2Config.secretAccessKey &&
      currentR2Config.bucketName
    ),
  });
});

app.post('/api/r2/test-connection', async (req, res) => {
  try {
    const s3 = getR2Client();
    if (!s3) {
      return res.status(400).json({
        success: false,
        error: 'Cloudflare R2 is not configured. Please supply Account ID, Access Key ID, Secret Access Key, and Bucket Name.',
      });
    }

    if (!currentR2Config.bucketName) {
      return res.status(400).json({
        success: false,
        error: 'Cloudflare R2 Bucket Name is required.',
      });
    }

    // Attempt list or head bucket
    const cmd = new ListObjectsV2Command({
      Bucket: currentR2Config.bucketName,
      MaxKeys: 5,
    });
    const result = await s3.send(cmd);

    return res.json({
      success: true,
      message: `Successfully connected to Cloudflare R2 bucket "${currentR2Config.bucketName}"!`,
      bucket: currentR2Config.bucketName,
      sampleObjectsCount: result.KeyCount || 0,
    });
  } catch (err: any) {
    console.error('R2 Connection test failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to authenticate with Cloudflare R2.',
    });
  }
});

// 3. Pre-signed upload URL for Direct Large File Upload (Multi-GB)
app.post('/api/r2/presigned-upload-url', async (req, res) => {
  try {
    const { fileName, contentType, nodeCode, branch, category } = req.body;

    if (!fileName || !nodeCode) {
      return res.status(400).json({ error: 'fileName and nodeCode are required.' });
    }

    const s3 = getR2Client();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `drawings/${nodeCode}/${branch || 'general'}/${category || 'DRAWINGS'}/${Date.now()}-${cleanFileName}`;

    if (!s3 || !currentR2Config.bucketName) {
      // Local fallback mode
      return res.json({
        useLocalFallback: true,
        r2Key,
        uploadEndpoint: '/api/r2/upload',
      });
    }

    const command = new PutObjectCommand({
      Bucket: currentR2Config.bucketName,
      Key: r2Key,
      ContentType: contentType || 'application/octet-stream',
    });

    // 1 hour expiry for large uploads
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return res.json({
      useLocalFallback: false,
      presignedUrl,
      r2Key,
      publicUrl: currentR2Config.publicUrl ? `${currentR2Config.publicUrl.replace(/\/$/, '')}/${r2Key}` : null,
    });
  } catch (err: any) {
    console.error('Error generating pre-signed upload URL:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate upload URL' });
  }
});

// 4. Multipart direct upload handler (supporting both direct S3 pipe and local storage)
app.post('/api/r2/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided in form-data' });
    }

    const { nodeCode, branch, category, drawingNumber, revision, uploadedBy, status } = req.body;
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `drawings/${nodeCode || 'GENERAL'}/${branch || 'civil'}/${category || 'DRAWINGS'}/${Date.now()}-${cleanFileName}`;
    let downloadUrl = `/api/r2/download/${path.basename(file.path)}`;

    const s3 = getR2Client();
    if (s3 && currentR2Config.bucketName) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const putCmd = new PutObjectCommand({
          Bucket: currentR2Config.bucketName,
          Key: r2Key,
          Body: fileBuffer,
          ContentType: file.mimetype || 'application/octet-stream',
        });
        await s3.send(putCmd);

        if (currentR2Config.publicUrl) {
          downloadUrl = `${currentR2Config.publicUrl.replace(/\/$/, '')}/${r2Key}`;
        } else {
          downloadUrl = `/api/r2/download-key?key=${encodeURIComponent(r2Key)}`;
        }
      } catch (s3Err) {
        console.warn('R2 Put failed, continuing with local storage fallback:', s3Err);
      }
    }

    const ext = (file.originalname.split('.').pop() || 'dwg').toLowerCase();
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const newFileRecord: StoredFile = {
      id: `${nodeCode || 'ST'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: file.originalname,
      extension: ext,
      sizeBytes: file.size,
      sizeFormatted: formatBytes(file.size),
      uploadDate: new Date().toISOString().slice(0, 10),
      uploadedBy: uploadedBy || 'chirag.maheswari@rbminfracon-kutchh.com',
      version: revision || 'Rev-A',
      status: (status as any) || 'verified',
      category: category || 'DRAWINGS',
      branch: branch || 'civil',
      drawingNumber: drawingNumber || '',
      revision: revision || 'Rev-A',
      r2Key,
      downloadUrl,
      localPath: file.path,
    };

    if (nodeCode) {
      if (!structureFiles[nodeCode]) {
        structureFiles[nodeCode] = [];
      }
      structureFiles[nodeCode].unshift(newFileRecord);
      saveServerFiles(structureFiles);
    }

    return res.json({
      success: true,
      file: newFileRecord,
      message: 'File successfully uploaded and indexed in Document Portal',
    });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// 5. Pre-signed Download URL & Direct File Download
app.get('/api/r2/download-key', async (req, res) => {
  try {
    const key = req.query.key as string;
    if (!key) {
      return res.status(400).send('File key is required');
    }

    const s3 = getR2Client();
    if (s3 && currentR2Config.bucketName) {
      const command = new GetObjectCommand({
        Bucket: currentR2Config.bucketName,
        Key: key,
      });
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      return res.redirect(presignedUrl);
    }

    return res.status(404).send('R2 storage is not configured or file key is not found');
  } catch (err: any) {
    console.error('Error serving download key:', err);
    return res.status(500).send('Error generating download link');
  }
});

// 6. Direct local file download
app.get('/api/r2/download/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.download(filePath);
  }
  return res.status(404).send('File not found');
});

// 7. Get structure files dictionary
app.get('/api/structures/files', (req, res) => {
  res.json(structureFiles);
});

// 8. Add a file record
app.post('/api/structures/file', (req, res) => {
  const { nodeCode, file } = req.body;
  if (!nodeCode || !file) {
    return res.status(400).json({ error: 'nodeCode and file object are required' });
  }

  if (!structureFiles[nodeCode]) {
    structureFiles[nodeCode] = [];
  }

  structureFiles[nodeCode].unshift(file);
  saveServerFiles(structureFiles);

  res.json({ success: true, files: structureFiles[nodeCode] });
});

// 9. Delete a file record
app.delete('/api/structures/:nodeCode/files/:fileId', async (req, res) => {
  const { nodeCode, fileId } = req.params;
  if (!structureFiles[nodeCode]) {
    return res.json({ success: true });
  }

  const fileToDelete = structureFiles[nodeCode].find(f => f.id === fileId);
  if (fileToDelete) {
    // Attempt deletion from Cloudflare R2 if key exists
    if (fileToDelete.r2Key) {
      const s3 = getR2Client();
      if (s3 && currentR2Config.bucketName) {
        try {
          await s3.send(new DeleteObjectCommand({
            Bucket: currentR2Config.bucketName,
            Key: fileToDelete.r2Key,
          }));
        } catch (s3Err) {
          console.warn('Failed to delete object from R2:', s3Err);
        }
      }
    }
    // Delete local file if exists
    if (fileToDelete.localPath && fs.existsSync(fileToDelete.localPath)) {
      try {
        fs.unlinkSync(fileToDelete.localPath);
      } catch (unlinkErr) {
        console.warn('Failed to delete local file:', unlinkErr);
      }
    }
  }

  structureFiles[nodeCode] = structureFiles[nodeCode].filter(f => f.id !== fileId);
  saveServerFiles(structureFiles);

  res.json({ success: true });
});

// 10. Clear / Reset all files
app.post('/api/structures/reset', (req, res) => {
  structureFiles = {};
  saveServerFiles(structureFiles);
  if (Array.isArray(serverNodes) && serverNodes.length > 0) {
    serverNodes = serverNodes.map((n: any) => ({ ...n, files: [] }));
    saveServerNodes(serverNodes);
  }
  res.json({ success: true, message: 'Reset all structures to 0 files.' });
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Document Portal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
