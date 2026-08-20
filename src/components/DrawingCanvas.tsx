import React, { useRef, useState, useEffect } from 'react';
import { 
  Trash2, 
  Download, 
  Edit2, 
  Eraser, 
  Undo, 
  Check, 
  Minus, 
  Square, 
  Circle, 
  ArrowUpRight, 
  Grid, 
  Type,
  PenTool
} from 'lucide-react';

type ToolType = 'pen' | 'line' | 'rect' | 'circle' | 'arrow' | 'eraser';

interface DrawingCanvasProps {
  onSaveSketchToNode?: (dataUrl: string) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onSaveSketchToNode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [strokeColor, setStrokeColor] = useState('#002046');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [hasContent, setHasContent] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [gridMode, setGridMode] = useState<'blueprint' | 'dot' | 'plain'>('blueprint');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // Setup and resize canvas
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const ctx = canvas.getContext('2d');
    let prevData: ImageData | null = null;
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) {
        // ignore
      }
    }

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (prevData) {
        ctx.putImageData(prevData, 0, 0);
      }
    }
  };

  useEffect(() => {
    setupCanvas();
    const handleResize = () => {
      setupCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory(prev => [...prev.slice(-15), currentState]);
    } catch (e) {
      // ignore
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveHistoryState();
    setIsDrawing(true);
    setHasContent(true);

    const { x, y } = getCanvasCoords(e);
    setStartX(x);
    setStartY(y);

    // Save snapshot for shape preview
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (activeTool === 'pen' || activeTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : strokeColor;
      ctx.lineWidth = activeTool === 'eraser' ? lineWidth * 6 : lineWidth;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'pen' || activeTool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (snapshot) {
      // Restore previous state and draw live preview of shape
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;

      if (activeTool === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (activeTool === 'rect') {
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        // Draw line
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(y - startY, x - startX);
        const headlen = 12 + lineWidth;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setSnapshot(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveHistoryState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an export canvas with white background for CAD blueprint
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    // Draw background grid or white
    expCtx.fillStyle = '#ffffff';
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    // Add subtle grid lines on export if blueprint grid is on
    if (gridMode === 'blueprint') {
      expCtx.strokeStyle = '#e2e8f0';
      expCtx.lineWidth = 1;
      const step = 25;
      for (let x = 0; x < exportCanvas.width; x += step) {
        expCtx.beginPath();
        expCtx.moveTo(x, 0);
        expCtx.lineTo(x, exportCanvas.height);
        expCtx.stroke();
      }
      for (let y = 0; y < exportCanvas.height; y += step) {
        expCtx.beginPath();
        expCtx.moveTo(0, y);
        expCtx.lineTo(exportCanvas.width, y);
        expCtx.stroke();
      }
    }

    // Overlay drawing
    expCtx.drawImage(canvas, 0, 0);

    // Add watermark / title stamp
    expCtx.fillStyle = '#002046';
    expCtx.font = 'bold 12px monospace';
    expCtx.fillText(`PLANT CAD MARKUP • ${new Date().toLocaleString()}`, 20, exportCanvas.height - 15);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Engineering_CAD_Markup_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    if (onSaveSketchToNode) {
      onSaveSketchToNode(dataUrl);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const colors = [
    { label: 'Engineering Navy', value: '#002046' },
    { label: 'Markup Red', value: '#dc2626' },
    { label: 'Verified Green', value: '#16a34a' },
    { label: 'Inspection Amber', value: '#d97706' },
    { label: 'Blueprint Cyan', value: '#0284c7' },
    { label: 'Dark Carbon', value: '#18181b' },
  ];

  return (
    <section className="bg-white border border-[#c4c6cf] rounded-2xl overflow-hidden flex flex-col shadow-xs">
      {/* Canvas Top Controls Toolbar */}
      <div className="bg-[#f2f4f6] px-4 py-3 border-b border-[#c4c6cf] flex flex-wrap justify-between items-center gap-3">
        {/* Tools Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-white border border-[#c4c6cf] rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setActiveTool('pen')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTool === 'pen' ? 'bg-[#002046] text-white' : 'text-[#545f72] hover:bg-[#e6e8ea]'
              }`}
              title="Freehand Pen"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pen</span>
            </button>

            <button
              onClick={() => setActiveTool('line')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTool === 'line' ? 'bg-[#002046] text-white' : 'text-[#545f72] hover:bg-[#e6e8ea]'
              }`}
              title="Straight Line"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Line</span>
            </button>

            <button
              onClick={() => setActiveTool('arrow')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTool === 'arrow' ? 'bg-[#002046] text-white' : 'text-[#545f72] hover:bg-[#e6e8ea]'
              }`}
              title="Arrow Annotation"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Arrow</span>
            </button>

            <button
              onClick={() => setActiveTool('rect')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTool === 'rect' ? 'bg-[#002046] text-white' : 'text-[#545f72] hover:bg-[#e6e8ea]'
              }`}
              title="Rectangle Box"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Box</span>
            </button>

            <button
              onClick={() => setActiveTool('circle')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTool === 'circle' ? 'bg-[#002046] text-white' : 'text-[#545f72] hover:bg-[#e6e8ea]'
              }`}
              title="Circle / Node"
            >
              <Circle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Circle</span>
            </button>

            <button
              onClick={() => setActiveTool('eraser')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTool === 'eraser' ? 'bg-[#002046] text-white' : 'text-[#545f72] hover:bg-[#e6e8ea]'
              }`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Eraser</span>
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 bg-white border border-[#c4c6cf] rounded-xl px-2.5 py-1.5 shadow-2xs">
            {colors.map(c => (
              <button
                key={c.value}
                onClick={() => {
                  setStrokeColor(c.value);
                  if (activeTool === 'eraser') setActiveTool('pen');
                }}
                className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                  strokeColor === c.value && activeTool !== 'eraser'
                    ? 'scale-125 border-[#002046] ring-2 ring-[#002046]/40 shadow-xs'
                    : 'border-slate-300 hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>

          {/* Line Thickness */}
          <div className="hidden lg:flex items-center gap-1 bg-white border border-[#c4c6cf] rounded-xl px-2 py-1 shadow-2xs text-xs font-mono text-[#545f72]">
            {[1, 2, 4, 8].map(w => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  lineWidth === w
                    ? 'bg-[#002046] text-white'
                    : 'hover:bg-[#e6e8ea]'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {/* Right Side Actions: Grid Switch, Undo, Clear, Export */}
        <div className="flex items-center gap-2">
          {/* Grid Toggle */}
          <div className="flex items-center bg-white border border-[#c4c6cf] rounded-xl p-1 shadow-2xs text-[11px] font-mono">
            <button
              onClick={() => setGridMode(gridMode === 'blueprint' ? 'plain' : 'blueprint')}
              className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                gridMode === 'blueprint' ? 'bg-[#d5e0f7] text-[#002046] font-bold' : 'text-[#545f72] hover:bg-[#e6e8ea]'
              }`}
              title="Toggle Grid Lines"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          {history.length > 0 && (
            <button
              id="btn-canvas-undo"
              onClick={handleUndo}
              className="p-2 rounded-xl bg-white border border-[#c4c6cf] hover:bg-[#e6e8ea] text-[#44474e] transition-colors shadow-2xs cursor-pointer"
              title="Undo last stroke"
            >
              <Undo className="w-4 h-4" />
            </button>
          )}

          <button
            id="btn-canvas-clear"
            onClick={handleClear}
            className="p-2 rounded-xl bg-white border border-[#c4c6cf] hover:bg-red-50 text-[#44474e] hover:text-red-600 transition-colors shadow-2xs cursor-pointer"
            title="Clear canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            id="btn-canvas-export-png"
            onClick={handleExportPNG}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#002046] text-white hover:bg-[#1b365d] active:scale-98'
            }`}
            title="Export and download CAD markup image"
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>Export CAD (PNG)</span>
          </button>
        </div>
      </div>

      {/* Interactive Canvas Area */}
      <div
        ref={containerRef}
        className={`h-72 md:h-80 w-full relative cursor-crosshair overflow-hidden touch-none bg-white ${
          gridMode === 'blueprint' ? 'canvas-grid' : ''
        }`}
      >
        {!hasContent && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-35">
            <span className="text-[#74777f] text-sm font-semibold tracking-wide">
              Engineering CAD & Blueprint Markup Tool
            </span>
            <span className="text-[#74777f] text-xs font-mono mt-1">
              Select a tool above to sketch schematics, lines, arrows, or plant annotations
            </span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </section>
  );
};
