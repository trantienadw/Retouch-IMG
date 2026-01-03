
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Undo, 
  Redo, 
  Sparkles, 
  Sliders, 
  Filter, 
  Maximize, 
  Image as ImageIcon,
  Check,
  X,
  Type as TypeIcon,
  Crop,
  Layers,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings,
  HelpCircle,
  Eye,
  Trash2,
  Save,
  Menu,
  Key
} from 'lucide-react';
import { Adjustments, ToolCategory, HistoryItem, UserPreset } from './types';
import { DEFAULT_ADJUSTMENTS, FILTERS, ARTISTIC_STYLES } from './constants';
import { applyAdjustments, getFilterCSS } from './utils/imageProcessing';
import { analyzeImageWithAI, applyAIStyle } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('ai');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [compareMode, setCompareMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [statusMessage, setStatusMessage] = useState('Welcome to Lumina AI');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Presets
  useEffect(() => {
    const saved = localStorage.getItem('lumina_presets');
    if (saved) setUserPresets(JSON.parse(saved));
  }, []);

  // History Management
  const addToHistory = useCallback((imageData: ImageData, currentAdjusts: Adjustments, currentFilter: string | null) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      if (newHistory.length > 50) newHistory.shift();
      return [...newHistory, { imageData, adjustments: { ...currentAdjusts }, filter: currentFilter }];
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setAdjustments(prev.adjustments);
      setActiveFilter(prev.filter);
      setHistoryIndex(historyIndex - 1);
      redraw();
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setAdjustments(next.adjustments);
      setActiveFilter(next.filter);
      setHistoryIndex(historyIndex + 1);
      redraw();
    }
  };

  // Canvas Operations
  const redraw = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const processed = applyAdjustments(originalImageData, adjustments, activeFilter);
    ctx.putImageData(processed, 0, 0);
  }, [originalImageData, adjustments, activeFilter]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        setImage(img);
        setOriginalImageData(imageData);
        setAdjustments(DEFAULT_ADJUSTMENTS);
        setActiveFilter(null);
        setHistory([{ imageData, adjustments: DEFAULT_ADJUSTMENTS, filter: null }]);
        setHistoryIndex(0);
        setZoom(1);
        setStatusMessage(`Loaded: ${file.name} (${img.width}x${img.height})`);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAIAutoEnhance = async () => {
    if (!image) return;
    setIsProcessing(true);
    setStatusMessage("AI is analyzing image pixels...");
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      
      const result = await analyzeImageWithAI(base64);
      setAdjustments(prev => ({ ...prev, ...result.adjustments }));
      setStatusMessage(`AI: ${result.reasoning}`);
      
      // Add to history after redraw completes
      setTimeout(() => {
        if (canvasRef.current) {
          const processedCtx = canvasRef.current.getContext('2d')!;
          addToHistory(
            processedCtx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height),
            { ...adjustments, ...result.adjustments },
            activeFilter
          );
        }
      }, 100);
    } catch (error: any) {
      console.error(error);
      const is404 = error.message?.includes("Requested entity was not found.");
      setStatusMessage(is404 ? "Model not found. Please select a valid API key." : "AI analysis failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIStyle = async (style: string) => {
    if (!image) return;
    setIsProcessing(true);
    setStatusMessage(`Applying ${style} style with AI...`);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      
      const stylizedBase64 = await applyAIStyle(base64, style);
      const newImg = new Image();
      newImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newImg.width;
        tempCanvas.height = newImg.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(newImg, 0, 0);
        const newData = tempCtx.getImageData(0, 0, newImg.width, newImg.height);
        
        setOriginalImageData(newData);
        setImage(newImg);
        addToHistory(newData, adjustments, activeFilter);
        setStatusMessage(`Applied ${style} style successfully.`);
      };
      newImg.src = stylizedBase64;
    } catch (error: any) {
      console.error(error);
      const is404 = error.message?.includes("Requested entity was not found.");
      setStatusMessage(is404 ? "Access error. Please ensure you have selected a valid paid API key." : "AI Style application failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeySelect = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  const savePreset = () => {
    const name = prompt("Enter preset name:");
    if (!name) return;
    const newPreset: UserPreset = {
      id: Date.now().toString(),
      name,
      adjustments: { ...adjustments },
      filter: activeFilter
    };
    const updated = [...userPresets, newPreset];
    setUserPresets(updated);
    localStorage.setItem('lumina_presets', JSON.stringify(updated));
    setStatusMessage(`Preset "${name}" saved!`);
  };

  const applyUserPreset = (preset: UserPreset) => {
    setAdjustments(preset.adjustments);
    setActiveFilter(preset.filter);
    setStatusMessage(`Applied preset: ${preset.name}`);
  };

  const exportImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `lumina-edited-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    setStatusMessage("Image exported successfully!");
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') undo();
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) redo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-slate-200">
      {/* Top Bar */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 glass z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            LUMINA <span className="text-cyan-400 font-light">AI</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Open
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
          
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          
          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-full hover:bg-white/5 disabled:opacity-30 transition-all">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-full hover:bg-white/5 disabled:opacity-30 transition-all">
            <Redo className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <button 
            onMouseDown={() => setCompareMode(true)} 
            onMouseUp={() => setCompareMode(false)}
            onMouseLeave={() => setCompareMode(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-sm font-medium"
          >
            <Eye className="w-4 h-4" /> Compare
          </button>

          <button 
            onClick={exportImage}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] transition-all shadow-lg shadow-cyan-500/20 text-sm font-bold"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Navigation */}
        <aside className="w-16 border-r border-white/5 flex flex-col items-center py-4 gap-6 glass">
          {[
            { id: 'ai', icon: Sparkles, label: 'AI Tools' },
            { id: 'adjust', icon: Sliders, label: 'Adjust' },
            { id: 'filters', icon: Filter, label: 'Filters' },
            { id: 'transform', icon: Crop, label: 'Transform' },
            { id: 'creative', icon: LayoutGrid, label: 'Creative' },
            { id: 'presets', icon: Save, label: 'Presets' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveCategory(item.id as ToolCategory)}
              className={`p-3 rounded-xl transition-all group relative ${
                activeCategory === item.id 
                  ? 'bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="absolute left-16 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/10">
                {item.label}
              </span>
            </button>
          ))}
        </aside>

        {/* Dynamic Tool Panel */}
        <aside className="w-72 border-r border-white/5 overflow-y-auto glass p-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold capitalize">{activeCategory} Tools</h2>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-300">
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {activeCategory === 'ai' && (
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleAIAutoEnhance}
                disabled={!image || isProcessing}
                className="w-full p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:border-cyan-500/50 transition-all flex flex-col items-center gap-3 group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-center">
                  <span className="block font-bold text-cyan-400">AI Auto Enhance</span>
                  <span className="text-xs text-slate-400">Smart exposure, color & focus</span>
                </div>
              </button>

              <button 
                onClick={handleKeySelect}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 group text-xs text-slate-400"
              >
                <Key className="w-4 h-4 group-hover:text-cyan-400" />
                <span>Manage API Keys</span>
              </button>

              <div className="mt-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">AI Artistic Styles</label>
                <div className="grid grid-cols-2 gap-2">
                  {ARTISTIC_STYLES.map(style => (
                    <button 
                      key={style.id}
                      onClick={() => handleAIStyle(style.name)}
                      disabled={!image || isProcessing}
                      className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all flex flex-col items-center gap-1 group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{style.icon}</span>
                      <span className="text-[10px] font-medium text-slate-400">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'adjust' && (
            <div className="flex flex-col gap-6">
              {[
                { label: 'Exposure', key: 'exposure', min: -100, max: 100 },
                { label: 'Contrast', key: 'contrast', min: -100, max: 100 },
                { label: 'Saturation', key: 'saturation', min: -100, max: 100 },
                { label: 'Brightness', key: 'brightness', min: -100, max: 100 },
                { label: 'Temperature', key: 'temperature', min: -100, max: 100 },
                { label: 'Tint', key: 'tint', min: -100, max: 100 },
                { label: 'Sharpness', key: 'sharpness', min: 0, max: 100 },
                { label: 'Vignette', key: 'vignette', min: 0, max: 100 },
              ].map((adj) => (
                <div key={adj.key} className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">{adj.label}</span>
                    <span className="text-cyan-400 font-bold">{(adjustments as any)[adj.key]}</span>
                  </div>
                  <input 
                    type="range"
                    min={adj.min}
                    max={adj.max}
                    value={(adjustments as any)[adj.key]}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value);
                      setAdjustments(prev => ({ ...prev, [adj.key]: newVal }));
                    }}
                    onMouseUp={() => {
                      if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d')!;
                        addToHistory(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height), adjustments, activeFilter);
                      }
                    }}
                    className="w-full accent-cyan-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              ))}
              <button 
                onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}
                className="w-full py-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 transition-all"
              >
                Reset All Adjustments
              </button>
            </div>
          )}

          {activeCategory === 'filters' && (
            <div className="grid grid-cols-2 gap-3">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 border transition-all group ${
                    activeFilter === f.id 
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{f.icon}</span>
                  <span className="text-xs font-bold">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeCategory === 'presets' && (
            <div className="flex flex-col gap-4">
              <button 
                onClick={savePreset}
                className="w-full p-4 rounded-xl border border-dashed border-white/20 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2 group"
              >
                <Plus className="w-5 h-5 text-slate-500 group-hover:text-cyan-400" />
                <span className="text-sm font-bold text-slate-500 group-hover:text-cyan-400">Save Current as Preset</span>
              </button>

              <div className="space-y-2">
                {userPresets.map((p) => (
                  <div key={p.id} className="group flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                    <button 
                      onClick={() => applyUserPreset(p)}
                      className="flex-1 text-left text-sm font-medium"
                    >
                      {p.name}
                    </button>
                    <button 
                      onClick={() => {
                        const updated = userPresets.filter(x => x.id !== p.id);
                        setUserPresets(updated);
                        localStorage.setItem('lumina_presets', JSON.stringify(updated));
                      }}
                      className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Canvas Area */}
        <section className="flex-1 relative bg-[#050505] flex items-center justify-center overflow-hidden">
          {!image && (
            <div 
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload({ target: { files: [file] } } as any);
              }}
            >
              <div className="w-32 h-32 rounded-full bg-cyan-500/5 flex items-center justify-center border-2 border-dashed border-white/10 mb-8 animate-pulse">
                <ImageIcon className="w-12 h-12 text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Drop your image here</h2>
              <p className="text-slate-500 max-w-xs mx-auto mb-8">Start editing with Lumina AI's professional grade tools. Supports JPG, PNG, WEBP up to 10MB.</p>
              <button className="px-8 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-bold shadow-xl shadow-cyan-500/20 transition-all">
                Browse Files
              </button>
            </div>
          )}

          {image && (
            <div className="relative p-8 w-full h-full flex items-center justify-center">
              <div 
                className="relative shadow-2xl transition-transform duration-200 ease-out"
                style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? 'grab' : 'default' }}
              >
                {compareMode && (
                  <div className="absolute inset-0 z-10 pointer-events-none opacity-50 ring-4 ring-cyan-500/50" />
                )}
                
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full max-h-full rounded-sm"
                  width={image.width}
                  height={image.height}
                  style={{ filter: compareMode ? 'none' : getFilterCSS(activeFilter) }}
                />

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-sm">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
                    <span className="text-cyan-400 font-bold tracking-widest text-xs animate-pulse">PROCESSING AI</span>
                  </div>
                )}
              </div>

              {/* Zoom Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full glass border border-white/10 shadow-2xl z-30">
                <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400 hover:text-white">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-16 text-center text-[10px] font-bold text-slate-500">{Math.round(zoom * 100)}%</div>
                <button onClick={() => setZoom(Math.min(5, zoom + 0.1))} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400 hover:text-white">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                <button onClick={() => setZoom(1)} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400 hover:text-white">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-8 border-t border-white/5 bg-[#0a0a0a] px-4 flex items-center justify-between text-[10px] font-medium text-slate-500 glass">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {isProcessing ? 'AI Processing...' : 'Engine Ready'}
          </span>
          <div className="w-[1px] h-3 bg-white/10" />
          <span>{statusMessage}</span>
        </div>
        
        <div className="flex items-center gap-6">
          {image && (
            <>
              <div className="flex items-center gap-1">
                <span className="opacity-50">Dimensions:</span> {image.width} × {image.height} px
              </div>
              <div className="flex items-center gap-1">
                <span className="opacity-50">Zoom:</span> {Math.round(zoom * 100)}%
              </div>
            </>
          )}
          <div className="flex items-center gap-3">
            <Settings className="w-3.5 h-3.5 hover:text-cyan-400 cursor-pointer" />
            <HelpCircle className="w-3.5 h-3.5 hover:text-cyan-400 cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
