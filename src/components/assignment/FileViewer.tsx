// src/components/assignment/FilePreviewer.tsx
import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import mammoth from 'mammoth';
import { read, utils } from 'xlsx';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface FilePreviewerProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
}

const FilePreviewer: React.FC<FilePreviewerProps> = ({ fileId, fileName, onClose }) => {
  const [content, setContent] = useState<React.ReactNode>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);

  // Enhanced zoom functionality
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setZoom(Math.min(Math.max(value / 100, 0.5), 3));
    }
  };
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  useEffect(() => {
    const fetchAndPreviewFile = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/attachments/${fileId}`);
        if (!response.ok) throw new Error('Failed to download file');
        
        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || '';
        const url = URL.createObjectURL(blob);

        if (contentType.includes('pdf')) {
          setContent(
            <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
              <Document
                file={blob}
                onLoadSuccess={({ numPages }) => {
                  setNumPages(numPages);
                  setIsLoading(false);
                }}
                onLoadError={() => setError('Failed to load PDF')}
              >
                <Page 
                  pageNumber={pageNumber} 
                  width={window.innerWidth * 0.8 * zoom}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>
            </div>
          );
        } else if (contentType.startsWith('image/')) {
          setContent(
            <div className="flex justify-center" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
              <img 
                src={url} 
                alt="Preview" 
                className="object-contain max-h-[80vh]"
                onLoad={() => setIsLoading(false)}
              />
            </div>
          );
        } else if (contentType.includes('text')) {
          const text = await blob.text();
          setContent(
            <div className="p-6 prose max-w-full" style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
              <pre className="whitespace-pre-wrap">{text}</pre>
            </div>
          );
          setIsLoading(false);
        } else if (contentType.includes('vnd.openxmlformats-officedocument')) {
          const arrayBuffer = await blob.arrayBuffer();
          if (contentType.includes('wordprocessingml')) {
            const { value } = await mammoth.convertToHtml({ arrayBuffer });
            setContent(
              <div 
                className="p-6 prose max-w-full" 
                style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
                dangerouslySetInnerHTML={{ __html: value }}
              />
            );
          } else {
            const wb = read(arrayBuffer);
            const html = utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]]);
            setContent(
              <div 
                className="p-6 overflow-auto"
                style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }
          setIsLoading(false);
        } else {
          setError('Preview not available for this file type');
          setIsLoading(false);
        }

      } catch (err) {
        console.error('Preview error:', err);
        setError('Failed to load preview');
        setIsLoading(false);
      }
    };

    fetchAndPreviewFile();
  }, [fileId, pageNumber, zoom]);

  return (
    <div className={`fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-0 ${isFullscreen ? 'backdrop-blur-none' : ''}`}>
      <div className={`bg-white flex flex-col transition-all duration-300
        ${isFullscreen ? 'w-full h-full rounded-none' : 'w-[95vw] h-[95vh] rounded-lg'} overflow-hidden`}>

        {/* Header - Fixed full width */}
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 truncate max-w-[50vw]">
              {fileName}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {numPages > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <button 
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber === 1}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <span>{pageNumber} of {numPages}</span>
                <button 
                  onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                  disabled={pageNumber === numPages}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 border-l pl-4">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-100 rounded text-gray-600"
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max="300"
                  step="10"
                  value={Math.round(zoom * 100)}
                  onChange={handleZoomInput}
                  className="w-20 px-2 py-1 border rounded text-center text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>

              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-100 rounded text-gray-600"
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-100 rounded text-gray-600"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>

              <a
                href={`http://localhost:5001/api/attachments/${fileId}`}
                download
                className="p-2 hover:bg-gray-100 rounded text-gray-600"
                title="Download"
              >
                <Download size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Content Area - Full height remaining space */}
        <div className="flex-1 overflow-auto relative bg-gray-50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="animate-pulse flex flex-col items-center gap-2 text-gray-500">
                <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <span>Loading preview...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
              <div className="text-red-500 text-lg">{error}</div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close Preview
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="h-full w-full overflow-auto p-4">
              {content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewer;