import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  HeadBucketCommand, 
  ListObjectsV2Command, 
  DeleteObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Directories setup
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.join(process.cwd(), 'local_storage');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage configuration
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

// ----------------------------------------------------
// DATA TYPES & PERSISTENCE SCHEMAS
// ----------------------------------------------------
export type Branch = 'civil' | 'mechanical' | 'eni';
export type Category = 'DRAWINGS' | 'GRN' | 'SRN' | 'PO' | 'SO';

export interface StoredFile {
  id: string;
  name: string;
  extension: string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadDate: string;
  uploadedBy: string;
  version: string;
  status: 'verified' | 'pending' | 'critical';
  category: Category | string;
  branch: Branch | string;
  branchId?: Branch | string;
  nodeCode: string;
  drawingNumber?: string;
  revision?: string;
  r2Key?: string;
  downloadUrl?: string;
  localPath?: string;
}

export interface StructureNode {
  id: string;
  code: string;
  name: string;
  fullTag: string;
  isHighlighted: boolean;
  files: StoredFile[];
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

const R2_CONFIG_FILE = path.join(DATA_DIR, 'r2_config.json');
const PLANT_DATABASE_FILE = path.join(DATA_DIR, 'plant_database.json');

// Canonical 53 Plant Structures Seed List
const SEED_STRUCTURES: { code: string; name: string; isHighlighted: boolean }[] = [
  { code: 'ST-1', name: 'REFINERY PLANT', isHighlighted: true },
  { code: 'ST-2', name: 'OLEO PLANT', isHighlighted: true },
  { code: 'ST-3', name: 'PACKING PLANT', isHighlighted: true },
  { code: 'ST-4', name: 'BOILER', isHighlighted: true },
  { code: 'ST-5', name: 'CHIMNEY', isHighlighted: false },
  { code: 'ST-6', name: 'COAL HANDLING SYSTEM', isHighlighted: false },
  { code: 'ST-7', name: 'COAL YARD', isHighlighted: false },
  { code: 'ST-8', name: 'TG BUILDING', isHighlighted: false },
  { code: 'ST-9', name: 'AOP TANK FARM', isHighlighted: false },
  { code: 'ST-10', name: 'BAKERY TANK FARM', isHighlighted: false },
  { code: 'ST-11', name: 'BEADING TANK FARM', isHighlighted: false },
  { code: 'ST-12', name: 'CHEMICALS TANK FARM', isHighlighted: false },
  { code: 'ST-13', name: 'CPO TANK FARM', isHighlighted: false },
  { code: 'ST-14', name: 'IE TANK FARM', isHighlighted: false },
  { code: 'ST-15', name: 'OLEO TANK FARM', isHighlighted: false },
  { code: 'ST-16', name: 'PACKING TANK FARM', isHighlighted: false },
  { code: 'ST-17', name: 'PKO TANK FARM', isHighlighted: false },
  { code: 'ST-18', name: 'SOYA TANK FARM', isHighlighted: false },
  { code: 'ST-19', name: 'SUNFLOWER TANK FARM', isHighlighted: false },
  { code: 'ST-20', name: 'HYDROGENATION PLANT', isHighlighted: true },
  { code: 'ST-21', name: 'PKO PLANT', isHighlighted: true },
  { code: 'ST-22', name: 'SILO', isHighlighted: true },
  { code: 'ST-23', name: 'WATER TANK', isHighlighted: false },
  { code: 'ST-24', name: 'WTP', isHighlighted: true },
  { code: 'ST-25', name: 'ETP', isHighlighted: true },
  { code: 'ST-26', name: 'STP', isHighlighted: true },
  { code: 'ST-27', name: 'WEIGHBRIDGE', isHighlighted: false },
  { code: 'ST-28', name: 'OLEO WAREHOUSE', isHighlighted: false },
  { code: 'ST-29', name: 'SPRAY COOLER PLANT', isHighlighted: false },
  { code: 'ST-30', name: 'SOAP PLANT', isHighlighted: false },
  { code: 'ST-31', name: 'ACID OIL PLANT', isHighlighted: false },
  { code: 'ST-32', name: 'IE PLANT', isHighlighted: false },
  { code: 'ST-33', name: 'PIPE RACK', isHighlighted: false },
  { code: 'ST-34', name: 'SWITCH YARD', isHighlighted: false },
  { code: 'ST-35', name: 'SPENT EARTH & CATALYST STORE', isHighlighted: false },
  { code: 'ST-36', name: 'HSD STORAGE', isHighlighted: false },
  { code: 'ST-37', name: 'RM AND FG LOADING & UNLOADING', isHighlighted: false },
  { code: 'ST-38', name: 'PUMP HOUSE', isHighlighted: false },
  { code: 'ST-39', name: 'PLANT UTILITY', isHighlighted: false },
  { code: 'ST-40', name: 'GATE COMPLEX', isHighlighted: true },
  { code: 'ST-41', name: 'COMPOUND WALL', isHighlighted: false },
  { code: 'ST-42', name: 'ROAD', isHighlighted: false },
  { code: 'ST-43', name: 'DRAIN', isHighlighted: false },
  { code: 'ST-44', name: 'FOOTPATH', isHighlighted: false },
  { code: 'ST-45', name: 'TOILET BLOCK', isHighlighted: true },
  { code: 'ST-46', name: 'ADMIN BUILDING', isHighlighted: true },
  { code: 'ST-47', name: 'WORKERS ENTRY', isHighlighted: false },
  { code: 'ST-48', name: 'WATCH TOWER', isHighlighted: false },
  { code: 'ST-49', name: 'WAREHOUSE', isHighlighted: true },
  { code: 'ST-50', name: '2-POLE STRUCTURE', isHighlighted: false },
  { code: 'ST-51', name: 'GARDEN WALL', isHighlighted: false },
  { code: 'ST-52', name: 'STORE', isHighlighted: false },
  { code: 'ST-53', name: 'STREET LIGHT/HIGH MAST', isHighlighted: false },
];

function generateDefaultNodes(): StructureNode[] {
  return SEED_STRUCTURES.map((item, idx) => ({
    id: (idx + 1).toString().padStart(3, '0'),
    code: item.code,
    name: item.name,
    fullTag: `${item.code}-${item.name}`,
    isHighlighted: item.isHighlighted,
    files: [],
  }));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ----------------------------------------------------
// DATABASE LOAD / SAVE LOGIC
// ----------------------------------------------------
function loadDatabase(): StructureNode[] {
  try {
    if (fs.existsSync(PLANT_DATABASE_FILE)) {
      const data = fs.readFileSync(PLANT_DATABASE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Also check legacy files if migrating
    const legacyServerStore = path.join(process.cwd(), 'server_store.json');
    const legacyNodesStore = path.join(process.cwd(), 'nodes_store.json');
    if (fs.existsSync(legacyNodesStore)) {
      const data = fs.readFileSync(legacyNodesStore, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        saveDatabase(parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading plant database:', err);
  }

  const defaults = generateDefaultNodes();
  saveDatabase(defaults);
  return defaults;
}

function saveDatabase(nodes: StructureNode[]) {
  try {
    fs.writeFileSync(PLANT_DATABASE_FILE, JSON.stringify(nodes, null, 2), 'utf-8');
    // Also mirror to legacy files for backward compatibility
    fs.writeFileSync(path.join(process.cwd(), 'nodes_store.json'), JSON.stringify(nodes, null, 2), 'utf-8');
    const filesMap: Record<string, StoredFile[]> = {};
    nodes.forEach(n => {
      filesMap[n.code] = n.files || [];
    });
    fs.writeFileSync(path.join(process.cwd(), 'server_store.json'), JSON.stringify(filesMap, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving plant database:', err);
  }
}

function loadR2Config(): R2Config {
  let config: R2Config = {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  };

  try {
    if (fs.existsSync(R2_CONFIG_FILE)) {
      const data = fs.readFileSync(R2_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      config = { ...config, ...parsed };
    }
  } catch (err) {
    console.error('Error loading R2 config:', err);
  }
  return config;
}

function saveR2Config(config: R2Config) {
  try {
    fs.writeFileSync(R2_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving R2 config:', err);
  }
}

// In-memory runtime state hydrated directly from persistent disk
let globalNodes: StructureNode[] = loadDatabase();
let currentR2Config: R2Config = loadR2Config();

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
    maxAttempts: 2,
  });
}

function fileNameFromR2Key(key: string): string {
  const keyName = key.split('/').pop() || key;
  return keyName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '');
}

async function listR2Files(): Promise<StoredFile[]> {
  const s3 = getR2Client();
  if (!s3 || !currentR2Config.bucketName) {
    return [];
  }

  const files: StoredFile[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: currentR2Config.bucketName,
      Prefix: 'drawings/',
      ContinuationToken: continuationToken,
    }));

    for (const object of result.Contents || []) {
      if (!object.Key || object.Size === undefined) continue;

      const [, nodeCode, branch, category, ...keyParts] = object.Key.split('/');
      if (!nodeCode || !branch || !category || keyParts.length === 0) continue;

      const name = fileNameFromR2Key(object.Key);
      const extension = (name.split('.').pop() || 'dwg').toLowerCase();
      const uploadDate = (object.LastModified || new Date()).toISOString().slice(0, 10);
      const idMatch = keyParts[0].match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i);
      const id = idMatch ? `fl-${idMatch[1]}` : `r2-${Buffer.from(object.Key).toString('base64url')}`;

      files.push({
        id,
        name,
        extension,
        sizeBytes: object.Size,
        sizeFormatted: formatBytes(object.Size),
        uploadDate,
        uploadedBy: 'Engineering Team',
        version: 'Rev-A',
        status: 'verified',
        category,
        branch,
        branchId: branch,
        nodeCode,
        drawingNumber: `R2-${nodeCode}`,
        revision: 'Rev-A',
        r2Key: object.Key,
        downloadUrl: currentR2Config.publicUrl
          ? `${currentR2Config.publicUrl.replace(/\/$/, '')}/${object.Key}`
          : `/api/r2/download-key?key=${encodeURIComponent(object.Key)}`,
      });
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return files;
}

async function getNodesWithR2Files(): Promise<StructureNode[]> {
  const r2Files = await listR2Files();
  if (r2Files.length === 0 && (!getR2Client() || !currentR2Config.bucketName)) {
    return globalNodes;
  }

  const filesByNode = new Map<string, StoredFile[]>();
  r2Files.forEach(file => {
    const nodeFiles = filesByNode.get(file.nodeCode) || [];
    nodeFiles.push(file);
    filesByNode.set(file.nodeCode, nodeFiles);
  });

  return globalNodes.map(node => ({
    ...node,
    files: filesByNode.get(node.code) || [],
  }));
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. GET /api/nodes - Master structures & associated files
app.get('/api/nodes', async (req, res) => {
  try {
    const nodes = await getNodesWithR2Files();
    const totalFiles = nodes.reduce((acc, n) => acc + (n.files?.length || 0), 0);
    const totalSizeBytes = nodes.reduce(
      (acc, n) => acc + (n.files || []).reduce((sub, f) => sub + (f.sizeBytes || 0), 0),
      0
    );

    res.json({
      success: true,
      nodes,
      totalCount: nodes.length,
      totalFiles,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/nodes - Save/Update entire nodes structure
app.post('/api/nodes', (req, res) => {
  try {
    const { nodes } = req.body;
    if (Array.isArray(nodes)) {
      globalNodes = nodes;
      saveDatabase(nodes);
      res.json({ success: true, count: nodes.length, message: 'Nodes updated successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Expected an array of structure nodes' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET /api/files - Query all files across all structures with optional filtering
app.get('/api/files', async (req, res) => {
  try {
    const { branch, category, nodeCode, search } = req.query;

    const nodes = await getNodesWithR2Files();
    let allFiles: StoredFile[] = nodes
      .filter(node => !nodeCode || node.code === nodeCode)
      .flatMap(node => node.files || []);

    if (branch && typeof branch === 'string' && branch !== 'ALL') {
      const bTarget = branch.toLowerCase();
      allFiles = allFiles.filter(f => (f.branch || '').toLowerCase() === bTarget || (f.branchId || '').toLowerCase() === bTarget);
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      allFiles = allFiles.filter(f => f.category === category);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      allFiles = allFiles.filter(
        f =>
          f.name.toLowerCase().includes(q) ||
          (f.drawingNumber && f.drawingNumber.toLowerCase().includes(q)) ||
          f.nodeCode.toLowerCase().includes(q)
      );
    }

    const totalSizeBytes = allFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

    res.json({
      success: true,
      files: allFiles,
      count: allFiles.length,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/files - Add single or batch file records to a structure
app.post('/api/files', (req, res) => {
  try {
    const { nodeCode, file, files, branch, category } = req.body;
    const targetCode = nodeCode || (file && file.nodeCode);

    if (!targetCode) {
      return res.status(400).json({ success: false, error: 'nodeCode is required' });
    }

    const incomingList: any[] = Array.isArray(files)
      ? files
      : Array.isArray(file)
      ? file
      : file
      ? [file]
      : [];

    if (incomingList.length === 0) {
      return res.status(400).json({ success: false, error: 'No file items provided' });
    }

    const nodeIndex = globalNodes.findIndex(n => n.code === targetCode);
    if (nodeIndex === -1) {
      return res.status(404).json({ success: false, error: `Node ${targetCode} not found` });
    }

    const processedFiles: StoredFile[] = incomingList.map((item, idx) => {
      const uuid = crypto.randomUUID();
      const fileId = item.id || `fl-${uuid}`;
      const ext = item.extension || (item.name ? item.name.split('.').pop()?.toLowerCase() : 'dwg') || 'dwg';
      const sizeBytes = item.sizeBytes || 0;
      const fileBranch = item.branch || branch || 'civil';
      const fileCategory = item.category || category || 'DRAWINGS';

      return {
        id: fileId,
        name: item.name || `Document-${uuid.slice(0, 6)}.${ext}`,
        extension: ext,
        sizeBytes,
        sizeFormatted: item.sizeFormatted || formatBytes(sizeBytes),
        uploadDate: item.uploadDate || new Date().toISOString().slice(0, 10),
        uploadedBy: item.uploadedBy || 'Engineering Team',
        version: item.version || item.revision || 'Rev-A',
        status: item.status || 'verified',
        category: fileCategory,
        branch: fileBranch,
        branchId: fileBranch,
        nodeCode: targetCode,
        drawingNumber: item.drawingNumber || `DWG-${fileBranch.toUpperCase().slice(0, 3)}-${targetCode}-${String(idx + 1).padStart(3, '0')}`,
        revision: item.revision || item.version || 'Rev-A',
        r2Key: item.r2Key,
        downloadUrl: item.downloadUrl,
        localPath: item.localPath,
      };
    });

    const currentFiles = globalNodes[nodeIndex].files || [];
    const existingIds = new Set(currentFiles.map(f => f.id));
    const newItems = processedFiles.filter(f => !existingIds.has(f.id));

    globalNodes[nodeIndex].files = [...newItems, ...currentFiles];
    saveDatabase(globalNodes);

    res.json({
      success: true,
      files: globalNodes[nodeIndex].files,
      addedFiles: newItems,
      addedCount: newItems.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. DELETE /api/files/:fileId - Delete file globally from nodes, R2, and disk
app.delete('/api/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    let foundFile: StoredFile | null = null;
    let targetNodeCode = '';

    globalNodes.forEach(node => {
      const match = (node.files || []).find(f => f.id === fileId);
      if (match) {
        foundFile = match;
        targetNodeCode = node.code;
        node.files = node.files.filter(f => f.id !== fileId);
      }
    });

    if (!foundFile) {
      return res.json({ success: true, message: 'File was already removed' });
    }

    // Delete from Cloudflare R2 if applicable
    if ((foundFile as StoredFile).r2Key) {
      const s3 = getR2Client();
      if (s3 && currentR2Config.bucketName) {
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: currentR2Config.bucketName,
              Key: (foundFile as StoredFile).r2Key,
            })
          );
        } catch (s3Err) {
          console.warn('Could not delete object from R2:', s3Err);
        }
      }
    }

    // Delete local buffer if exists
    if ((foundFile as StoredFile).localPath && fs.existsSync((foundFile as StoredFile).localPath!)) {
      try {
        fs.unlinkSync((foundFile as StoredFile).localPath!);
      } catch (unlinkErr) {
        console.warn('Could not delete local file:', unlinkErr);
      }
    }

    saveDatabase(globalNodes);

    res.json({
      success: true,
      fileId,
      nodeCode: targetNodeCode,
      message: 'File deleted from central database and storage successfully',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Backward compatibility delete endpoint: /api/structures/:nodeCode/files/:fileId
app.delete('/api/structures/:nodeCode/files/:fileId', async (req, res) => {
  const { fileId } = req.params;
  req.url = `/api/files/${fileId}`;
  return app._router.handle(req, res);
});

// 7. GET /api/branches - Branch tree and discipline storage stats
app.get('/api/branches', async (req, res) => {
  try {
    const branches: Branch[] = ['civil', 'mechanical', 'eni'];
    const nodes = await getNodesWithR2Files();
    const branchStats = branches.map(b => {
      const branchFiles: StoredFile[] = [];
      const activeStructures = new Set<string>();

      nodes.forEach(node => {
        (node.files || []).forEach(f => {
          if (f.branch === b || f.branchId === b) {
            branchFiles.push(f);
            activeStructures.add(node.code);
          }
        });
      });

      const sizeBytes = branchFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

      const labels: Record<Branch, string> = {
        civil: 'Civil Engineering',
        mechanical: 'Mechanical Engineering',
        eni: 'Electrical & Inst.',
      };

      return {
        branchId: b,
        branch: b,
        label: labels[b],
        fileCount: branchFiles.length,
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        activeNodesCount: activeStructures.size,
        totalStructures: nodes.length,
      };
    });

    res.json({
      success: true,
      branches: branchStats,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. DELETE /api/branches/:branch - Purge an entire branch across all 53 structures
app.delete('/api/branches/:branch', async (req, res) => {
  try {
    const targetBranch = req.params.branch as Branch;
    let deletedCount = 0;
    const filesToDelete: StoredFile[] = [];

    globalNodes.forEach(node => {
      const remaining: StoredFile[] = [];
      (node.files || []).forEach(f => {
        if (f.branch === targetBranch || f.branchId === targetBranch) {
          deletedCount++;
          filesToDelete.push(f);
        } else {
          remaining.push(f);
        }
      });
      node.files = remaining;
    });

    saveDatabase(globalNodes);

    // Clean up files in background
    const s3 = getR2Client();
    for (const f of filesToDelete) {
      if (f.r2Key && s3 && currentR2Config.bucketName) {
        s3.send(
          new DeleteObjectCommand({
            Bucket: currentR2Config.bucketName,
            Key: f.r2Key,
          })
        ).catch(() => {});
      }
      if (f.localPath && fs.existsSync(f.localPath)) {
        try {
          fs.unlinkSync(f.localPath);
        } catch (e) {}
      }
    }

    res.json({
      success: true,
      branch: targetBranch,
      deletedCount,
      message: `Successfully purged ${deletedCount} documents for ${targetBranch.toUpperCase()}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. DELETE /api/nodes/:nodeCode/category/:category
app.delete('/api/nodes/:nodeCode/category/:category', (req, res) => {
  try {
    const { nodeCode, category } = req.params;
    const { branch } = req.query;

    const node = globalNodes.find(n => n.code === nodeCode);
    if (!node) {
      return res.status(404).json({ success: false, error: `Node ${nodeCode} not found` });
    }

    const beforeCount = node.files.length;
    node.files = node.files.filter(f => {
      const matchCat = f.category === category;
      const matchBranch = !branch || branch === 'ALL' || f.branch === branch || f.branchId === branch;
      return !(matchCat && matchBranch);
    });

    const deletedCount = beforeCount - node.files.length;
    saveDatabase(globalNodes);

    res.json({
      success: true,
      nodeCode,
      category,
      deletedCount,
      remainingFiles: node.files,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. GET /api/storage-stats - Real-time global storage usage & discipline breakdown
app.get('/api/storage-stats', async (req, res) => {
  try {
    const nodes = await getNodesWithR2Files();
    let totalFiles = 0;
    let totalDrawingFiles = 0;
    let totalSizeBytes = 0;

    const branchBreakdown: Record<Branch, { count: number; sizeBytes: number; sizeFormatted: string; activeNodesCount: number }> = {
      civil: { count: 0, sizeBytes: 0, sizeFormatted: '0 B', activeNodesCount: 0 },
      mechanical: { count: 0, sizeBytes: 0, sizeFormatted: '0 B', activeNodesCount: 0 },
      eni: { count: 0, sizeBytes: 0, sizeFormatted: '0 B', activeNodesCount: 0 },
    };

    const branchActiveNodes: Record<Branch, Set<string>> = {
      civil: new Set(),
      mechanical: new Set(),
      eni: new Set(),
    };

    nodes.forEach(node => {
      (node.files || []).forEach(f => {
        totalFiles++;
        totalSizeBytes += f.sizeBytes || 0;
        if (f.category === 'DRAWINGS') {
          totalDrawingFiles++;
        }

        const b = (f.branch || f.branchId || 'civil') as Branch;
        if (branchBreakdown[b]) {
          branchBreakdown[b].count++;
          branchBreakdown[b].sizeBytes += f.sizeBytes || 0;
          branchActiveNodes[b].add(node.code);
        }
      });
    });

    (['civil', 'mechanical', 'eni'] as Branch[]).forEach(b => {
      branchBreakdown[b].sizeFormatted = formatBytes(branchBreakdown[b].sizeBytes);
      branchBreakdown[b].activeNodesCount = branchActiveNodes[b].size;
    });

    const isR2Configured = Boolean(
      currentR2Config.accountId &&
      currentR2Config.accessKeyId &&
      currentR2Config.secretAccessKey &&
      currentR2Config.bucketName
    );

    res.json({
      success: true,
      totalFiles,
      totalDrawingFilesCount: totalDrawingFiles,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      branches: branchBreakdown,
      structuresCount: nodes.length,
      r2Configured: isR2Configured,
      r2Bucket: currentR2Config.bucketName || '',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. POST /api/r2/upload - Multipart upload handling single & multi files with unique keys & R2 pipe
app.post('/api/r2/upload', upload.any(), async (req, res) => {
  try {
    const rawFiles = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (!rawFiles || rawFiles.length === 0) {
      return res.status(400).json({ error: 'No files provided in form-data' });
    }

    const { 
      nodeCode = 'ST-1', 
      branch = 'civil', 
      category = 'DRAWINGS', 
      drawingNumber, 
      revision = 'Rev-A', 
      uploadedBy = 'Engineering Team', 
      status = 'verified', 
      relativePath,
      fileKey: customFileKey,
      fileId: customFileId,
      relativePaths
    } = req.body;

    let relativePathsMap: Record<string, string> = {};
    if (typeof relativePaths === 'string') {
      try {
        relativePathsMap = JSON.parse(relativePaths);
      } catch (e) {
        // ignore parse error
      }
    }

    const s3 = getR2Client();
    const uploadedFileRecords: StoredFile[] = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const origName = file.originalname;
      const fileRelativePath = relativePathsMap[origName] || (rawFiles.length === 1 ? relativePath : '') || origName;

      // Unique file key for EVERY file using crypto.randomUUID() + '-' + file.name
      const uniqueUUID = crypto.randomUUID();
      const fileKey = customFileKey && rawFiles.length === 1
        ? customFileKey
        : `${uniqueUUID}-${origName}`;
      const fileId = customFileId && rawFiles.length === 1
        ? customFileId
        : `fl-${uniqueUUID}`;

      const cleanFileKey = fileKey.replace(/[^a-zA-Z0-9._/-]/g, '_');
      const r2Key = `drawings/${nodeCode}/${branch}/${category}/${cleanFileKey}`;
      let downloadUrl = `/api/r2/download/${path.basename(file.path)}`;

      // Upload each file individually to Cloudflare R2
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
          console.warn(`R2 Put failed for ${origName}, continuing with local storage fallback:`, s3Err);
        }
      }

      const ext = (origName.split('.').pop() || 'dwg').toLowerCase();
      const docNumber = drawingNumber
        ? (rawFiles.length > 1 ? `${drawingNumber}-${String(i + 1).padStart(3, '0')}` : drawingNumber)
        : `DWG-${branch.toUpperCase().slice(0, 3)}-${nodeCode}-${Date.now().toString().slice(-4)}-${String(i + 1).padStart(2, '0')}`;

      const newFileRecord: StoredFile = {
        id: fileId,
        name: fileRelativePath,
        extension: ext,
        sizeBytes: file.size,
        sizeFormatted: formatBytes(file.size),
        uploadDate: new Date().toISOString().slice(0, 10),
        uploadedBy: uploadedBy || 'Engineering Team',
        version: revision || 'Rev-A',
        status: (status as any) || 'verified',
        category: category || 'DRAWINGS',
        branch: branch || 'civil',
        branchId: branch || 'civil',
        nodeCode: nodeCode,
        drawingNumber: docNumber,
        revision: revision || 'Rev-A',
        r2Key,
        downloadUrl,
        localPath: file.path,
      };

      uploadedFileRecords.push(newFileRecord);
    }

    // Insert all uploaded files into central global database
    const nodeIndex = globalNodes.findIndex(n => n.code === nodeCode);
    if (nodeIndex !== -1) {
      const current = globalNodes[nodeIndex].files || [];
      const existingIds = new Set(current.map(f => f.id));
      const filteredNew = uploadedFileRecords.filter(f => !existingIds.has(f.id));
      globalNodes[nodeIndex].files = [...filteredNew, ...current];
      saveDatabase(globalNodes);
    }

    return res.json({
      success: true,
      files: uploadedFileRecords,
      file: uploadedFileRecords[0],
      count: uploadedFileRecords.length,
      nodeCode,
      branch,
      message: `${uploadedFileRecords.length} file(s) successfully uploaded and indexed in central database`,
    });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// 12. Cloudflare R2 Status & Configuration
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

  saveR2Config(currentR2Config);

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

// 13. Pre-signed upload URL for Direct Large File Upload (Multi-GB)
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

// 14. Pre-signed Download URL & Direct File Download
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

// 15. Direct local file download
app.get('/api/r2/download/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.download(filePath);
  }
  return res.status(404).send('File not found');
});

// 16. Clear / Reset all files across all structures
app.post('/api/structures/reset', (req, res) => {
  globalNodes = globalNodes.map(n => ({ ...n, files: [] }));
  saveDatabase(globalNodes);
  res.json({ success: true, message: 'Reset all structures to 0 files successfully.' });
});

// Legacy structures files endpoint
app.get('/api/structures/files', (req, res) => {
  const filesMap: Record<string, StoredFile[]> = {};
  globalNodes.forEach(n => {
    filesMap[n.code] = n.files || [];
  });
  res.json(filesMap);
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
