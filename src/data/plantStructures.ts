import { StructureNode, NodeFile, Branch, Category } from '../types';

export const BRANCH_IMAGES = {
  civil: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABM3vDJu8n4sj21_Wqg_bGunZjY0sn4m2oFrJy6wSLZu1Yc5KU51nnju_0GTLI92Fa1QrOeDR28nRxDH0osNYZKy1NDuJwp0dc7yf0dNqVEfJNAw-w7RMtlS3XoHw79PqH3ha1pn01RFwM1O9c9-F2vOIGozgDc39ulk_rgNbElmSuvu1r1Gth6a7Imr6-Rifp09Kv0Bg6c0lNwsef_h_ukrzEztKNHjdHM-wI_MsrmE3oySLQWtkZ',
  mechanical: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAglVqRUwAHwu1mRSrQb6g0onwEhWDbz7TBoINFcUpcaPx0P5lKssI2ro_BzZQU8lwGhvneIqA8ib3xSPk3aikjuxwas8LJCn0lJk6kJYbmeo_OXwsIK9W221_obdLKIUC5YJ9KQ-ILJHHjFmejnd3mrC9fwtzz2UhKsVHtr5fIUeFO3IU5iC8CEgpvYiJwkQT3r2w20bfNjdUVpkY3CDExkWopPWPh71tzJT8vzlc3gPsCLafPHD0x',
  eni: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTnVJN6cntxCUZpvWbmIEXFveJhOtjXcDyCGQrouSpln-ey1bm9myGBfBQdsZhHcmsXT_VtNR7LeO1mhsRLA33dX7AgTDQ6ytcjw68kw8wjSrCD6xFI4McEbrnQ1sPjYixk1tLLgdb8wwSoSIOnIokqX0hMPqag3GX8kuAVSCEGxHpsKBfwZNzHlP9FbYkNfXY_-ua5i0BBBQ5sb0DSAbsBPD-0nUBm8ZODwa4or2wq7ip4ZF8OjSA',
  legacySheet: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAl43qcwGb00njB3NiGaLFuSjLsY2bNbxjh90WEMjVrv4OeoFgOd1LHk3IRggl9M_dlKRAHC45k-UCkuK8qjDALn2pB3mroOSJ7izu53YqZbh6xWsoZjQukB7MtRMwd53KYBxX-e7tsr9ZElmD96aE7Fa4RmB-lKCVwRVH0nscO8RyyRNHX6NE6Y3HYC1Aga2SoFOLfP6jJMcn5HcxKITh8uram5CgOjUEGkHqMYM3jS7LnsmdlXq0MhOYrOFj5G9T9dw'
};

// 53 Plant Structures exactly transcribed from the specification sheet (Image 1)
export const RAW_STRUCTURES_LIST: { code: string; name: string; isHighlighted: boolean }[] = [
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

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initial 53 structures (all starting with 0 uploaded files)
export const INITIAL_STRUCTURE_NODES: StructureNode[] = RAW_STRUCTURES_LIST.map((item, index) => {
  const idNum = (index + 1).toString().padStart(3, '0');
  return {
    id: idNum,
    code: item.code,
    name: item.name,
    fullTag: `${item.code}-${item.name}`,
    isHighlighted: item.isHighlighted,
    files: []
  };
});

// Calculate branch totals
export function calculateBranchTotals(nodes: StructureNode[]) {
  const branches: Branch[] = ['civil', 'mechanical', 'eni'];
  const result = {
    civil: { fileCount: 0, sizeBytes: 0 },
    mechanical: { fileCount: 0, sizeBytes: 0 },
    eni: { fileCount: 0, sizeBytes: 0 }
  };

  nodes.forEach(node => {
    node.files.forEach(file => {
      if (result[file.branch]) {
        result[file.branch].fileCount += 1;
        result[file.branch].sizeBytes += file.sizeBytes;
      }
    });
  });

  return result;
}
