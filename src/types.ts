export type Branch = 'civil' | 'mechanical' | 'eni';

export type Category = 'DRAWINGS' | 'GRN' | 'SRN' | 'PO' | 'SO';

export type AppView = 'dashboard' | 'files' | 'data-entry' | 'settings';

export interface NodeFile {
  id: string;
  name: string;
  extension: 'dwg' | 'pdf' | 'dxf' | 'docx' | 'xlsx' | 'png' | 'jpg' | 'zip' | string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadDate: string;
  uploadedBy: string;
  version: string;
  status: 'verified' | 'pending' | 'critical';
  category: Category;
  branch: Branch;
  drawingNumber?: string;
  revision?: string;
  r2Key?: string;
  downloadUrl?: string;
  localPath?: string;
}

export interface R2ConnectionStatus {
  configured: boolean;
  accountId: string;
  bucketName: string;
  publicUrl: string;
  hasAccessKey: boolean;
  hasSecretKey: boolean;
  endpoint: string;
}

export interface StructureNode {
  id: string; // e.g. "001", "002"
  code: string; // e.g. "ST-1"
  name: string; // e.g. "REFINERY PLANT"
  fullTag: string; // e.g. "ST-1-REFINERY PLANT"
  isHighlighted: boolean; // highlighted green in the master sheet
  files: NodeFile[];
}

export interface BranchStats {
  branch: Branch;
  label: string;
  iconName: string;
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  imageUrl: string;
  imageAlt: string;
  activeNodesCount: number;
}

