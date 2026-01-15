
import React, { useCallback, useRef, useState } from 'react';
import { UploadCloudIcon } from './Icons';

interface FileDropzoneProps {
  onFileSelect: (files: FileList) => void;
  error: string | null;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileSelect, error }) => {
  const [isDragging, setIsDragging] = useState(false);
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
      onFileSelect(e.dataTransfer.files);
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
    }
  };
  
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const acceptTypes = 'application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp';

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
                accept={acceptTypes}
                multiple
                className="hidden"
                onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-gray-700/50 p-4 rounded-full">
                    <UploadCloudIcon className="h-12 w-12 text-blue-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white">Arraste e solte seus arquivos aqui</h2>
                <p className="text-gray-400">ou</p>
                <button type="button" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all">
                    Selecione os arquivos
                </button>
                 <p className="text-xs text-gray-500 pt-2">Suporta PDF, Word e Imagens (JPG, PNG, WebP)</p>
            </div>
        </div>
        {error && <p className="mt-4 text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
    </div>
  );
};

export default FileDropzone;
