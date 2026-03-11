"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  File as FileIcon, 
  X, 
  Loader2, 
  Eye, 
  BookOpen, 
  Coins,
  Printer,
  Copy,
  FileText,
  Palette,
  ChevronDown,
  ChevronUp,
  Info,
  Settings2,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { API_ENDPOINTS } from '@/lib/api';
import ShopSelector from './ShopSelector';

interface FileWithPreview extends File {
  preview: string;
}

type PrintMode = 'bw' | 'color' | 'mixed';
type PageSize = 'A4' | 'A3' | 'Letter' | 'Legal';
type Orientation = 'portrait' | 'landscape';
type PrintSide = 'one-sided' | 'two-sided';
type PageSelection = 'all' | 'custom';

interface UploadedFile {
  file: FileWithPreview;
  pageCount: number | null;
  config: PrintConfig;
  isExpanded: boolean;
}

interface PrintConfig {
  pageSelection: PageSelection;
  customPages: string;
  copies: number;
  printMode: PrintMode;
  colorPages: string; // e.g., "1,3,5-7" - only used when printMode is 'mixed'
  pageSize: PageSize;
  orientation: Orientation;
  printSide: PrintSide;
}

interface PreviewContent {
  type: 'image' | 'pdf' | 'unsupported';
  src: string;
  fileName: string;
}

interface ShopPricing {
  bw: number;
  color: number;
}

interface SelectedShop {
  shop_id: string;
  shop_name: string;
  location: string;
  pricing: ShopPricing;
  profile_photo: string;
  isLive: boolean;
}

// Default pricing (will be overridden by shop pricing)
const DEFAULT_PRICING: ShopPricing = {
  bw: 1,
  color: 5,
};

const DEFAULT_CONFIG: PrintConfig = {
  pageSelection: 'all',
  customPages: '',
  copies: 1,
  printMode: 'bw',
  colorPages: '',
  pageSize: 'A4',
  orientation: 'portrait',
  printSide: 'one-sided',
};

// Parse page range string like "1-3, 5, 7-10" and return total count
const parsePageRange = (rangeStr: string, maxPages: number): number[] => {
  if (!rangeStr.trim()) return [];
  
  const pages: number[] = [];
  const parts = rangeStr.split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
          if (!pages.includes(i)) pages.push(i);
        }
      }
    } else {
      const num = parseInt(part);
      if (!isNaN(num) && num >= 1 && num <= maxPages && !pages.includes(num)) {
        pages.push(num);
      }
    }
  }
  
  return pages.sort((a, b) => a - b);
};

const FileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [studentName, setStudentName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(null);
  const [studentAuth, setStudentAuth] = useState<{ user_id: string; username: string } | null>(null);
  const [pricing, setPricing] = useState<ShopPricing>(DEFAULT_PRICING);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [selectedShop, setSelectedShop] = useState<SelectedShop | null>(null);

  // Fetch pricing from selected shop
  useEffect(() => {
    if (selectedShop) {
      setPricing(selectedShop.pricing);
    }
  }, [selectedShop]);

  useEffect(() => {
    const authData = localStorage.getItem('student-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      setStudentAuth(parsed);
      setStudentName(parsed.username);
      
      // Fetch wallet balance for logged in user
      const fetchWallet = async () => {
        try {
          const response = await axios.get(API_ENDPOINTS.wallet(parsed.user_id));
          setWalletBalance(response.data.balance);
        } catch (error) {
          console.error("Error fetching wallet:", error);
        }
      };
      fetchWallet();
    } else {
      let currentSessionId = localStorage.getItem('sessionId');
      if (!currentSessionId) {
        currentSessionId = uuidv4();
        localStorage.setItem('sessionId', currentSessionId);
      }
      setSessionId(currentSessionId);
    }
  }, []);

  // Calculate cost breakdown for a single file
  const calculateFileCost = useCallback((file: UploadedFile): { bwPages: number; colorPages: number; bwCost: number; colorCost: number; totalCost: number } => {
    const { config, pageCount } = file;
    if (!pageCount) return { bwPages: 0, colorPages: 0, bwCost: 0, colorCost: 0, totalCost: 0 };

    // Determine total pages to print
    let pagesToPrint: number[];
    if (config.pageSelection === 'all') {
      pagesToPrint = Array.from({ length: pageCount }, (_, i) => i + 1);
    } else {
      pagesToPrint = parsePageRange(config.customPages, pageCount);
      if (pagesToPrint.length === 0) pagesToPrint = Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    const totalPagesToPrint = pagesToPrint.length;
    
    let bwPages = 0;
    let colorPagesCount = 0;

    if (config.printMode === 'bw') {
      bwPages = totalPagesToPrint;
      colorPagesCount = 0;
    } else if (config.printMode === 'color') {
      bwPages = 0;
      colorPagesCount = totalPagesToPrint;
    } else {
      // Mixed mode - parse which pages are color
      const colorPageNumbers = parsePageRange(config.colorPages, pageCount);
      colorPagesCount = pagesToPrint.filter(p => colorPageNumbers.includes(p)).length;
      bwPages = totalPagesToPrint - colorPagesCount;
    }

    const bwCost = bwPages * pricing.bw * config.copies;
    const colorCost = colorPagesCount * pricing.color * config.copies;

    return {
      bwPages: bwPages * config.copies,
      colorPages: colorPagesCount * config.copies,
      bwCost,
      colorCost,
      totalCost: bwCost + colorCost,
    };
  }, [pricing]);

  // Calculate total cost for all files
  const costBreakdown = useMemo(() => {
    let totalBwPages = 0;
    let totalColorPages = 0;
    let totalBwCost = 0;
    let totalColorCost = 0;
    let totalCost = 0;

    uploadedFiles.forEach(file => {
      const cost = calculateFileCost(file);
      totalBwPages += cost.bwPages;
      totalColorPages += cost.colorPages;
      totalBwCost += cost.bwCost;
      totalColorCost += cost.colorCost;
      totalCost += cost.totalCost;
    });

    return {
      bwPages: totalBwPages,
      colorPages: totalColorPages,
      bwCost: totalBwCost,
      colorCost: totalColorCost,
      totalCost,
    };
  }, [uploadedFiles, calculateFileCost]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFilesPromises = acceptedFiles.map(async (file): Promise<UploadedFile> => {
      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file)
      }) as FileWithPreview;

      let pageCount: number | null = null;
      if (file.type === 'application/pdf') {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          pageCount = pdf.numPages;
        } catch (e) {
          console.error("Error reading PDF for page count:", e);
          pageCount = null;
        }
      } else if (file.type.startsWith('image/')) {
        pageCount = 1;
      }

      return {
        file: fileWithPreview,
        pageCount,
        config: { ...DEFAULT_CONFIG },
        isExpanded: true,
      };
    });

    const newFiles = await Promise.all(newFilesPromises);
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    }
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleExpand = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], isExpanded: !newFiles[index].isExpanded };
      return newFiles;
    });
  };

  const handleConfigChange = (index: number, field: keyof PrintConfig, value: string | number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = {
        ...newFiles[index],
        config: { ...newFiles[index].config, [field]: value }
      };
      return newFiles;
    });
  };

  const handleSubmit = async () => {
    if (!selectedShop) {
      toast.error("Please select a shop first.");
      return;
    }
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file.");
      return;
    }
    if (!studentName && !studentAuth) {
      toast.error("Please enter your name.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    
    const configs = uploadedFiles.map(f => {
      const fileCost = calculateFileCost(f);
      return {
        name: f.file.name,
        pages: f.config.pageSelection === 'all' ? 'all' : f.config.customPages,
        colorPages: f.config.printMode === 'mixed' ? f.config.colorPages : (f.config.printMode === 'color' ? 'all' : ''),
        sided: f.config.printSide,
        copies: f.config.copies,
        pageCount: f.pageCount,
        pageSize: f.config.pageSize,
        orientation: f.config.orientation,
        printMode: f.config.printMode,
        bwPages: fileCost.bwPages,
        colorPagesCount: fileCost.colorPages,
        estimatedCost: fileCost.totalCost,
      };
    });

    uploadedFiles.forEach(f => {
      formData.append('files', f.file);
    });

    formData.append('config', JSON.stringify(configs));
    formData.append('shopId', selectedShop.shop_id);

    if (studentAuth) {
      formData.append('userId', studentAuth.user_id);
    } else {
      formData.append('studentName', studentName);
      formData.append('sessionId', sessionId);
    }

    try {
      const response = await axios.post(API_ENDPOINTS.createOrder, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Order ${response.data.order_id} created successfully!`);
      setUploadedFiles([]);
      
      // Refresh wallet balance
      if (studentAuth) {
        const walletResponse = await axios.get(API_ENDPOINTS.wallet(studentAuth.user_id));
        setWalletBalance(walletResponse.data.balance);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to create order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openPreview = async (file: FileWithPreview) => {
    let content: PreviewContent;
    if (file.type.startsWith('image/')) {
      content = { type: 'image', src: file.preview, fileName: file.name };
    } else if (file.type === 'application/pdf') {
      content = { type: 'pdf', src: file.preview, fileName: file.name };
    } else {
      content = { type: 'unsupported', src: '', fileName: file.name };
    }
    setPreviewContent(content);
    setIsPreviewOpen(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Shop Selection */}
      <ShopSelector 
        selectedShopId={selectedShop?.shop_id || null}
        onSelectShop={setSelectedShop}
      />

      {/* File Upload Section - Only show when shop is selected */}
      {selectedShop && (
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Printer className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Print Your Documents</h1>
            </div>
            <p className="text-gray-400">
              Printing at <span className="text-blue-400 font-semibold">{selectedShop.shop_name}</span> • {selectedShop.location}
            </p>
          </div>

      {/* Upload Zone */}
      <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <div
          {...getRootProps()}
          className={`p-10 border-4 border-dashed rounded-lg m-4 text-center cursor-pointer transition-all duration-300
            ${isDragActive 
              ? 'border-blue-400 bg-blue-900/20' 
              : 'border-gray-600 hover:border-blue-500 hover:bg-gray-700/50'}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-4">
            <div className={`p-4 rounded-full ${isDragActive ? 'bg-blue-500/20' : 'bg-gray-700'}`}>
              <UploadCloud className={`w-12 h-12 ${isDragActive ? 'text-blue-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-lg text-gray-200">
                {isDragActive ? 'Drop files here!' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-gray-400 mt-1">or click to browse</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {['PDF', 'DOCX', 'PNG', 'JPG'].map(format => (
                <span key={format} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">{format}</span>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {uploadedFiles.length > 0 && (
            <motion.div
              className="p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Name Input for Guests */}
              {!studentAuth && (
                <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name (for order pickup)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              )}

              {/* Files List */}
              <div className="space-y-4">
                {uploadedFiles.map((uploadedFile, index) => {
                  const fileCost = calculateFileCost(uploadedFile);
                  
                  return (
                    <motion.div
                      key={index}
                      className="bg-gray-700/50 rounded-xl overflow-hidden border border-gray-600"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* File Header */}
                      <div className="p-4 flex items-center justify-between bg-gray-700">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <FileIcon className="w-6 h-6 text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white truncate">{uploadedFile.file.name}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <FileText size={14} />
                                {uploadedFile.pageCount !== null ? `${uploadedFile.pageCount} page${uploadedFile.pageCount > 1 ? 's' : ''}` : 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1 text-yellow-400">
                                <Coins size={14} />
                                {fileCost.totalCost.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openPreview(uploadedFile.file)} 
                            className="p-2 hover:bg-gray-600 rounded-lg transition"
                            title="Preview"
                          >
                            <Eye className="w-5 h-5 text-gray-300" />
                          </button>
                          <button 
                            onClick={() => toggleExpand(index)} 
                            className="p-2 hover:bg-gray-600 rounded-lg transition"
                            title="Settings"
                          >
                            {uploadedFile.isExpanded ? <ChevronUp className="w-5 h-5 text-gray-300" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                          </button>
                          <button 
                            onClick={() => removeFile(index)} 
                            className="p-2 hover:bg-red-600/50 rounded-lg transition"
                            title="Remove"
                          >
                            <X className="w-5 h-5 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Print Settings (Expandable) */}
                      <AnimatePresence>
                        {uploadedFile.isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 border-t border-gray-600 space-y-6">
                              {/* Row 1: Page Selection & Copies */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Pages to Print */}
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                    <FileText size={16} />
                                    Pages to Print
                                  </label>
                                  <div className="flex gap-2">
                                    <select
                                      value={uploadedFile.config.pageSelection}
                                      onChange={(e) => handleConfigChange(index, 'pageSelection', e.target.value)}
                                      className="flex-1 p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                                      title="Page selection"
                                    >
                                      <option value="all">All Pages</option>
                                      <option value="custom">Custom Range</option>
                                    </select>
                                    {uploadedFile.config.pageSelection === 'custom' && (
                                      <input
                                        type="text"
                                        placeholder="e.g., 1-5, 8, 10-12"
                                        value={uploadedFile.config.customPages}
                                        onChange={(e) => handleConfigChange(index, 'customPages', e.target.value)}
                                        className="flex-1 p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                                        title="Custom page range"
                                      />
                                    )}
                                  </div>
                                  {uploadedFile.config.pageSelection === 'custom' && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <Info size={12} />
                                      Use commas and dashes (e.g., 1-3, 5, 7-10)
                                    </p>
                                  )}
                                </div>

                                {/* Copies */}
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                    <Copy size={16} />
                                    Number of Copies
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleConfigChange(index, 'copies', Math.max(1, uploadedFile.config.copies - 1))}
                                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white font-bold"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={uploadedFile.config.copies}
                                      onChange={(e) => handleConfigChange(index, 'copies', Math.max(1, parseInt(e.target.value) || 1))}
                                      className="flex-1 p-3 bg-gray-700 text-white text-center rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                                      title="Number of copies"
                                    />
                                    <button
                                      onClick={() => handleConfigChange(index, 'copies', uploadedFile.config.copies + 1)}
                                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Color Settings */}
                              <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                  <Palette size={16} />
                                  Color Mode
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { value: 'bw', label: 'Black & White', desc: `${pricing.bw} coin/page`, icon: '🖨️' },
                                    { value: 'color', label: 'Full Color', desc: `${pricing.color} coins/page`, icon: '🎨' },
                                    { value: 'mixed', label: 'Mixed', desc: 'Specify color pages', icon: '📄' },
                                  ].map(option => (
                                    <button
                                      key={option.value}
                                      onClick={() => handleConfigChange(index, 'printMode', option.value)}
                                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                                        uploadedFile.config.printMode === option.value
                                          ? 'border-blue-500 bg-blue-500/20'
                                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                                      }`}
                                    >
                                      <div className="text-lg mb-1">{option.icon}</div>
                                      <div className="font-medium text-white text-sm">{option.label}</div>
                                      <div className="text-xs text-gray-400">{option.desc}</div>
                                    </button>
                                  ))}
                                </div>
                                
                                {/* Color Pages Input (for mixed mode) */}
                                {uploadedFile.config.printMode === 'mixed' && (
                                  <div className="mt-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Which pages should be printed in color?
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g., 1, 3, 5-7 (leave empty for all B&W)"
                                      value={uploadedFile.config.colorPages}
                                      onChange={(e) => handleConfigChange(index, 'colorPages', e.target.value)}
                                      className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                                      title="Color page numbers"
                                    />
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                      <Info size={12} />
                                      Pages not listed will be printed in black & white
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Row 3: Paper Settings */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Paper Size */}
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                    <Settings2 size={16} />
                                    Paper Size
                                  </label>
                                  <select
                                    value={uploadedFile.config.pageSize}
                                    onChange={(e) => handleConfigChange(index, 'pageSize', e.target.value)}
                                    className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                                    title="Paper size"
                                  >
                                    <option value="A4">A4 (210 × 297 mm)</option>
                                    <option value="A3">A3 (297 × 420 mm)</option>
                                    <option value="Letter">Letter (8.5 × 11 in)</option>
                                    <option value="Legal">Legal (8.5 × 14 in)</option>
                                  </select>
                                </div>

                                {/* Orientation */}
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-300">Orientation</label>
                                  <div className="flex gap-2">
                                    {['portrait', 'landscape'].map(orient => (
                                      <button
                                        key={orient}
                                        onClick={() => handleConfigChange(index, 'orientation', orient)}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                          uploadedFile.config.orientation === orient
                                            ? 'border-blue-500 bg-blue-500/20'
                                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                                        }`}
                                      >
                                        <div className={`mx-auto border-2 border-current ${
                                          orient === 'portrait' ? 'w-4 h-6' : 'w-6 h-4'
                                        } ${uploadedFile.config.orientation === orient ? 'border-blue-400' : 'border-gray-500'}`} />
                                        <div className="text-xs mt-1 text-gray-300 capitalize">{orient}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Print Side */}
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-300">Print Side</label>
                                  <select
                                    value={uploadedFile.config.printSide}
                                    onChange={(e) => handleConfigChange(index, 'printSide', e.target.value)}
                                    className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                                    title="Print side"
                                  >
                                    <option value="one-sided">One-sided</option>
                                    <option value="two-sided">Two-sided (Duplex)</option>
                                  </select>
                                </div>
                              </div>

                              {/* File Cost Breakdown */}
                              <div className="p-3 bg-gray-800 rounded-lg border border-gray-600">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-400">B&W: {fileCost.bwPages} pages × {pricing.bw}</span>
                                  <span className="text-white">{fileCost.bwCost} coins</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                  <span className="text-gray-400">Color: {fileCost.colorPages} pages × {pricing.color}</span>
                                  <span className="text-white">{fileCost.colorCost} coins</span>
                                </div>
                                <div className="border-t border-gray-600 mt-2 pt-2 flex items-center justify-between font-semibold">
                                  <span className="text-gray-300">File Total:</span>
                                  <span className="text-yellow-400 flex items-center gap-1">
                                    <Coins size={16} /> {fileCost.totalCost.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Order Summary & Submit */}
              <div className="mt-6 p-4 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-xl border border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">Order Summary</h3>
                  </div>
                  {studentAuth && walletBalance !== null && (
                    <div className={`text-sm px-3 py-1 rounded-full ${
                      walletBalance >= costBreakdown.totalCost 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      Wallet: <Coins size={14} className="inline" /> {walletBalance.toFixed(2)}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-white">{uploadedFiles.length}</div>
                    <div className="text-xs text-gray-400">Files</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-white">{costBreakdown.bwPages}</div>
                    <div className="text-xs text-gray-400">B&W Pages</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-white">{costBreakdown.colorPages}</div>
                    <div className="text-xs text-gray-400">Color Pages</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 rounded-lg border border-yellow-500/30">
                    <div className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-1">
                      <Coins size={20} /> {costBreakdown.totalCost.toFixed(2)}
                    </div>
                    <div className="text-xs text-yellow-400/80">Total Cost</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="text-sm text-gray-400">
                    <span className="font-medium">Pricing ({selectedShop.shop_name}):</span> B&W {pricing.bw} coin/page • Color {pricing.color} coins/page
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {studentAuth && walletBalance !== null && walletBalance < costBreakdown.totalCost && (
                      <p className="text-red-400 text-sm">
                        Insufficient balance! Need {(costBreakdown.totalCost - walletBalance).toFixed(2)} more coins
                      </p>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || (studentAuth !== null && walletBalance !== null && walletBalance < costBreakdown.totalCost)}
                      className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-8 rounded-lg transition-all flex items-center justify-center gap-2 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Printer size={20} />
                          Place Print Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {isPreviewOpen && previewContent && (
            <motion.div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
            >
              <motion.div 
              className="bg-gray-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <header className="flex justify-between items-center p-4 border-b border-gray-700">
                <h3 className="font-bold text-lg truncate text-white">{previewContent.fileName}</h3>
                <button 
                  onClick={() => setIsPreviewOpen(false)} 
                  className="p-2 rounded-full hover:bg-gray-700 transition"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>
              <div className="flex-grow p-4 overflow-auto bg-gray-900">
                {previewContent.type === 'image' && (
                  <Image src={previewContent.src} alt="Preview" width={800} height={1000} className="mx-auto rounded-lg" />
                )}
                {previewContent.type === 'pdf' && (
                  <iframe src={previewContent.src} className="w-full h-full rounded-lg" title="PDF Preview" />
                )}
                {previewContent.type === 'unsupported' && (
                  <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full">
                    <BookOpen size={48} className="mb-4" />
                    <p>Preview is not available for this file type.</p>
                    <p className="text-sm mt-2">You can still print it!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}
    </div>
  );
};

export default FileUpload;
