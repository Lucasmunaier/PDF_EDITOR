
import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileDropzone from './components/FileDropzone';
import PdfEditor from './components/PdfEditor';
import { PageInfo } from './types';
import { LogoIcon, GithubIcon } from './components/Icons';
import Spinner from './components/Spinner';

// Make pdfjsLib available in the component
declare const pdfjsLib: any;

const App: React.FC = () => {
    const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
    const [pagesInfo, setPagesInfo] = useState<PageInfo[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');

    const handleFileSelect = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        setPdfDoc(null);
        setPagesInfo([]);

        try {
            if (file.type !== 'application/pdf') {
                throw new Error('Por favor, selecione um arquivo PDF.');
            }
            setFileName(file.name.replace(/\.pdf$/i, ''));
            const arrayBuffer = await file.arrayBuffer();

            // Load with pdf-lib for manipulation
            const doc = await PDFDocument.load(arrayBuffer);
            setPdfDoc(doc);
            
            // Load with pdf.js for rendering thumbnails
            const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdfJsDoc.numPages;
            const pages: PageInfo[] = [];

            for (let i = 0; i < numPages; i++) {
                const page = await pdfJsDoc.getPage(i + 1);
                const viewport = page.getViewport({ scale: 0.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    pages.push({
                        id: `${Date.now()}-${i}`,
                        originalIndex: i,
                        rotation: doc.getPage(i).getRotation().angle,
                        thumbnailUrl: canvas.toDataURL(),
                    });
                }
            }
            setPagesInfo(pages);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Ocorreu um erro ao processar o PDF.');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleReset = () => {
        setPdfDoc(null);
        setPagesInfo([]);
        setError(null);
        setIsLoading(false);
        setFileName('');
    };

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
                {isLoading ? (
                    <div className="flex-grow flex flex-col justify-center items-center">
                         <Spinner />
                         <p className="mt-4 text-lg text-gray-400">Processando seu PDF...</p>
                    </div>
                ) : pdfDoc ? (
                    <PdfEditor 
                        pdfDoc={pdfDoc} 
                        initialPages={pagesInfo} 
                        onReset={handleReset} 
                        fileName={fileName}
                    />
                ) : (
                    <FileDropzone onFileSelect={handleFileSelect} error={error} />
                )}
            </main>
        </div>
    );
};

export default App;
