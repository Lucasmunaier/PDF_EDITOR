
import React, { useCallback, useRef, useState } from 'react';
import { UploadCloudIcon } from './Icons';

interface FileDropzoneProps {
  onFileSelect: (files: FileList, options: { useOcr: boolean }) => void;
  error: string | null;
  mode: 'edit' | 'pdf-to-word' | 'word-to-pdf' | 'image-to-pdf';
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileSelect, error, mode }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [useOcr, setUseOcr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files, { useOcr });
    }
  }, [onFileSelect, useOcr]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files, { useOcr });
    }
  };
  
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const acceptTypes = {
    'edit': 'application/pdf',
    'pdf-to-word': 'application/pdf',
    'word-to-pdf': '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image-to-pdf': 'image/jpeg,image/png,image/webp'
  };

  const dropzoneText = {
    'edit': 'Arraste e solte seu PDF para editar',
    'pdf-to-word': 'Arraste o PDF para converter para Word',
    'word-to-pdf': 'Arraste o Word para converter para PDF',
    'image-to-pdf': 'Arraste imagens para converter para PDF'
  };
  
  const buttonText = {
    'edit': 'Selecione um PDF',
    'pdf-to-word': 'Selecione um PDF',
    'word-to-pdf': 'Selecione um Word',
    'image-to-pdf': 'Selecione Imagens'
  };


  return (
    <div className="flex-grow flex flex-col justify-center items-center text-center">
        <div 
            className={`w-full max-w-2xl p-8 md:p-12 border-2 border-dashed rounded-2xl transition-all duration-300 ${isDragging ? 'border-blue-400 bg-gray-800/50' : 'border-gray-600 hover:border-blue-500 hover:bg-gray-800/30'} cursor-pointer`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFileDialog}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && openFileDialog()}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptTypes[mode]}
                multiple={mode === 'image-to-pdf'}
                className="hidden"
                onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-gray-700/50 p-4 rounded-full">
                    <UploadCloudIcon className="h-12 w-12 text-blue-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white">{dropzoneText[mode]}</h2>
                <p className="text-gray-400">ou</p>
                <button type="button" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all">
                    {buttonText[mode]}
                </button>
            </div>
        </div>

        {mode === 'pdf-to-word' && (
            <div className="mt-6 text-center">
                <label htmlFor="ocr-checkbox" className="flex items-center justify-center gap-2 text-gray-300 cursor-pointer">
                    <input 
                        type="checkbox" 
                        id="ocr-checkbox"
                        checked={useOcr} 
                        onChange={e => setUseOcr(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-600"
                    />
                    Usar OCR (para PDFs escaneados ou com imagens)
                </label>
                 <p className="text-xs text-gray-500 mt-1">O processo pode ser mais demorado</p>
            </div>
        )}

        {error && <p className="mt-4 text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
    </div>
  );
};

export default FileDropzone;
