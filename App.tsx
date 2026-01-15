
import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileDropzone from './components/FileDropzone';
import PdfEditor from './components/PdfEditor';
import ImageEditor from './components/ImageEditor';
import { PageInfo, ImageInfo } from './types';
import { LogoIcon, GithubIcon, EditIcon, FileTextIcon, FileWordIcon, ImageIcon } from './components/Icons';
import Spinner from './components/Spinner';

// Make external libs available to TypeScript
declare const pdfjsLib: any;
declare const Tesseract: any;
declare const docx: any;
declare const mammoth: any;
declare const jspdf: any;
declare const html2canvas: any;

type Mode = 'edit' | 'pdf-to-word' | 'word-to-pdf' | 'image-to-pdf';

const App: React.FC = () => {
    const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
    const [pagesInfo, setPagesInfo] = useState<PageInfo[]>([]);
    const [imagesInfo, setImagesInfo] = useState<ImageInfo[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [mode, setMode] = useState<Mode>('edit');

    const handlePdfEditLoad = async (file: File) => {
        setFileName(file.name.replace(/\.pdf$/i, ''));
        const arrayBuffer = await file.arrayBuffer();

        const doc = await PDFDocument.load(arrayBuffer);
        setPdfDoc(doc);
        
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const pages: PageInfo[] = [];
        for (let i = 0; i < pdfJsDoc.numPages; i++) {
            const page = await pdfJsDoc.getPage(i + 1);
            const viewport = page.getViewport({ scale: 0.5, rotation: 0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                pages.push({
                    id: `${Date.now()}-${i}`,
                    originalIndex: i,
                    rotation: page.rotate,
                    thumbnailUrl: canvas.toDataURL(),
                });
            }
        }
        setPagesInfo(pages);
    };
    
    const handleImageLoad = async (files: FileList) => {
        setLoadingMessage(`Carregando ${files.length} imagem(s)...`);
        const imagePromises = Array.from(files).map(file => {
            return new Promise<ImageInfo>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        id: `${Date.now()}-${file.name}`,
                        name: file.name,
                        thumbnailUrl: e.target?.result as string,
                        rotation: 0,
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });
        const loadedImages = await Promise.all(imagePromises);
        setImagesInfo(loadedImages);
    };

    const handlePdfToWord = async (file: File, useOcr: boolean) => {
        // ... (existing implementation)
    };

    const handleWordToPdf = async (file: File) => {
        // ... (existing implementation)
    };

    const handleFileProcess = useCallback(async (files: FileList, options: { useOcr: boolean }) => {
        if (!files || files.length === 0) return;
        setIsLoading(true);
        setError(null);
        setLoadingMessage('Preparando arquivo(s)...');
        try {
             if (mode === 'image-to-pdf') {
                await handleImageLoad(files);
            } else {
                const file = files[0];
                switch(mode) {
                    case 'edit':
                        await handlePdfEditLoad(file);
                        break;
                    case 'pdf-to-word':
                        await handlePdfToWord(file, options.useOcr);
                        break;
                    case 'word-to-pdf':
                        await handleWordToPdf(file);
                        break;
                }
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
        } finally {
            if (mode !== 'edit' && mode !== 'image-to-pdf') {
                 setIsLoading(false);
                 setLoadingMessage('');
            } else {
                setIsLoading(false); 
            }
        }
    }, [mode]);
    
    const handleReset = () => {
        setPdfDoc(null);
        setPagesInfo([]);
        setImagesInfo([]);
        setError(null);
        setIsLoading(false);
        setFileName('');
    };

    const switchMode = (newMode: Mode) => {
        handleReset();
        setMode(newMode);
    };
    
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex-grow flex flex-col justify-center items-center">
                     <Spinner />
                     <p className="mt-4 text-lg text-gray-400">{loadingMessage || 'Processando...'}</p>
                </div>
            );
        }
        if (pdfDoc && mode === 'edit') {
            return <PdfEditor pdfDoc={pdfDoc} initialPages={pagesInfo} onReset={() => switchMode('edit')} fileName={fileName} />;
        }
        if (imagesInfo.length > 0 && mode === 'image-to-pdf') {
            return <ImageEditor initialImages={imagesInfo} onReset={() => switchMode('image-to-pdf')} />;
        }
        return <FileDropzone onFileSelect={handleFileProcess} error={error} mode={mode} />;
    };

    const baseButtonClass = "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500";
    const inactiveButtonClass = "text-gray-300 bg-gray-800 hover:bg-gray-700";
    const activeButtonClass = "text-white bg-blue-600 shadow-lg";

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
            <header className="py-4 px-6 md:px-8 border-b border-gray-700/50">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <LogoIcon className="h-8 w-8 text-blue-400" />
                        <h1 className="text-xl font-bold tracking-tight text-white">Editor de PDF Pro</h1>
                    </div>
                     <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                        <GithubIcon className="h-6 w-6" />
                    </a>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col">
                 <div className="w-full flex justify-center mb-6 md:mb-8">
                    <div className="bg-gray-800/50 p-1 rounded-lg flex flex-wrap justify-center gap-1">
                        <button onClick={() => switchMode('edit')} className={`${baseButtonClass} ${mode === 'edit' ? activeButtonClass : inactiveButtonClass}`}>
                            <EditIcon className="w-5 h-5" /> Editar PDF
                        </button>
                         <button onClick={() => switchMode('image-to-pdf')} className={`${baseButtonClass} ${mode === 'image-to-pdf' ? activeButtonClass : inactiveButtonClass}`}>
                            <ImageIcon className="w-5 h-5" /> Imagens para PDF
                        </button>
                        <button onClick={() => switchMode('pdf-to-word')} className={`${baseButtonClass} ${mode === 'pdf-to-word' ? activeButtonClass : inactiveButtonClass}`}>
                             <FileWordIcon className="w-5 h-5" /> PDF para Word
                        </button>
                        <button onClick={() => switchMode('word-to-pdf')} className={`${baseButtonClass} ${mode === 'word-to-pdf' ? activeButtonClass : inactiveButtonClass}`}>
                            <FileTextIcon className="w-5 h-5" /> Word para PDF
                        </button>
                    </div>
                </div>
                {renderContent()}
            </main>
        </div>
    );
};

export default App;
