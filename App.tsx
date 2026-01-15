
import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileDropzone from './components/FileDropzone';
import PdfEditor from './components/PdfEditor';
import ImageEditor from './components/ImageEditor';
import { PageInfo, ImageInfo } from './types';
import { LogoIcon, GithubIcon, EditIcon, FileWordIcon, FileTextIcon, UploadCloudIcon, XIcon } from './components/Icons';
import Spinner from './components/Spinner';

// Make external libs available to TypeScript
declare const pdfjsLib: any;
declare const Tesseract: any;
declare const docx: any;
declare const mammoth: any;
declare const jspdf: any;
declare const html2canvas: any;

type View = 'upload' | 'pdf-tools' | 'word-tools' | 'image-editor' | 'pdf-editor';

const App: React.FC = () => {
    const [view, setView] = useState<View>('upload');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    
    // States for loaded data
    const [sourceDocs, setSourceDocs] = useState<PDFDocument[]>([]);
    const [pagesInfo, setPagesInfo] = useState<PageInfo[]>([]);
    const [imagesInfo, setImagesInfo] = useState<ImageInfo[]>([]);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [useOcr, setUseOcr] = useState(false);

    const loadPdfFiles = async (files: File[]): Promise<{ docs: PDFDocument[], pages: PageInfo[] }> => {
        const allPages: PageInfo[] = [];
        const allDocs: PDFDocument[] = [];

        for (const [docIndex, file] of files.entries()) {
            setLoadingMessage(`Carregando ${file.name}...`);
            const arrayBuffer = await file.arrayBuffer();
            const doc = await PDFDocument.load(arrayBuffer);
            allDocs.push(doc);

            const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
            for (let i = 0; i < pdfJsDoc.numPages; i++) {
                const page = await pdfJsDoc.getPage(i + 1);
                const viewport = page.getViewport({ scale: 0.5, rotation: 0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    allPages.push({
                        id: `${Date.now()}-${docIndex}-${i}`,
                        originalIndex: i,
                        sourceDocIndex: docIndex,
                        rotation: page.rotate,
                        thumbnailUrl: canvas.toDataURL(),
                    });
                }
            }
        }
        return { docs: allDocs, pages: allPages };
    };

    const handleFileProcess = useCallback(async (files: FileList) => {
        if (!files || files.length === 0) return;
        setIsLoading(true);
        setError(null);
        setLoadingMessage('Analisando arquivo(s)...');
        
        try {
            const firstFile = files[0];
            const fileType = firstFile.type;
            const fileExtension = firstFile.name.split('.').pop()?.toLowerCase();

            if (fileType === 'application/pdf') {
                const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
                const { docs, pages } = await loadPdfFiles(pdfFiles);
                setSourceDocs(docs);
                setPagesInfo(pages);
                setFileName(pdfFiles.length > 1 ? `${pdfFiles.length} arquivos` : firstFile.name);
                if (pdfFiles.length > 1) {
                    setView('pdf-editor');
                } else {
                    setView('pdf-tools');
                }
            } else if (fileType.startsWith('image/')) {
                const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
                 const imagePromises = imageFiles.map(file => {
                    return new Promise<ImageInfo>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve({ id: `${Date.now()}-${file.name}`, name: file.name, thumbnailUrl: e.target?.result as string, rotation: 0 });
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                });
                const loadedImages = await Promise.all(imagePromises);
                setImagesInfo(loadedImages);
                setView('image-editor');
            } else if (fileExtension === 'doc' || fileExtension === 'docx') {
                setSourceFile(firstFile);
                setFileName(firstFile.name);
                setView('word-tools');
            } else {
                throw new Error('Tipo de arquivo não suportado. Por favor, use PDF, Word ou Imagens.');
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Ocorreu um erro ao processar o arquivo.');
            handleReset();
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleReset = () => {
        setView('upload');
        setSourceDocs([]);
        setPagesInfo([]);
        setImagesInfo([]);
        setSourceFile(null);
        setError(null);
        setFileName('');
        setIsLoading(false);
    };

    const handlePdfToWord = async () => {
        if (!sourceDocs[0]) return;
        setIsLoading(true);
        setLoadingMessage(useOcr ? 'Iniciando OCR...' : 'Extraindo texto...');
        try {
            const pdfBytes = await sourceDocs[0].save();
            const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
            
            // Reusing conversion logic...
            // This part could be refactored into a separate service if it grows.
        } catch (err) {
            console.error(err);
            setError('Falha ao converter PDF para Word.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleWordToPdf = async () => {
         if (!sourceFile) return;
        setIsLoading(true);
        setLoadingMessage('Convertendo Word para PDF...');
        try {
            const arrayBuffer = await sourceFile.arrayBuffer();
            const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
            
            const container = document.createElement('div');
            container.innerHTML = html;
            Object.assign(container.style, { width: '210mm', padding: '15mm', position: 'absolute', left: '-9999px', backgroundColor: 'white', color: 'black' });
            document.body.appendChild(container);
            
            setLoadingMessage('Renderizando documento...');
            const canvas = await html2canvas(container, { scale: 2 });
            document.body.removeChild(container);
            
            setLoadingMessage('Gerando arquivo PDF...');
            // FIX: Declare imgData from canvas before using it.
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${fileName.replace(/\.[^/.]+$/, "")}.pdf`);
        } catch(err) {
            console.error(err);
            setError('Falha ao converter Word para PDF.');
        } finally {
             setIsLoading(false);
             handleReset();
        }
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

        switch (view) {
            case 'upload':
                return <FileDropzone onFileSelect={handleFileProcess} error={error} />;

            case 'pdf-tools':
                return (
                    <div className="flex-grow flex flex-col justify-center items-center text-center">
                        <div className="w-full max-w-2xl bg-gray-800/50 rounded-2xl p-8">
                             <div className="flex items-center justify-center gap-3 mb-6">
                                <FileTextIcon className="w-10 h-10 text-blue-400"/>
                                <h2 className="text-2xl font-semibold truncate" title={fileName}>{fileName}</h2>
                            </div>
                            <p className="text-gray-400 mb-8">Selecione uma ferramenta para continuar:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => setView('pdf-editor')} className="flex flex-col items-center justify-center p-6 bg-gray-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
                                    <EditIcon className="w-8 h-8 mb-2"/>
                                    <span className="font-semibold">Editar / Juntar PDF</span>
                                </button>
                                <div className="p-6 bg-gray-700 rounded-lg">
                                    <div className="flex flex-col items-center justify-center">
                                        <FileWordIcon className="w-8 h-8 mb-2"/>
                                        <span className="font-semibold">Converter para Word</span>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <label htmlFor="ocr-checkbox" className="flex items-center justify-center gap-2 text-gray-300 cursor-pointer text-sm">
                                            <input type="checkbox" id="ocr-checkbox" checked={useOcr} onChange={e => setUseOcr(e.target.checked)} className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-blue-500 focus:ring-blue-600"/>
                                            Usar OCR
                                        </label>
                                    </div>
                                     <button onClick={handlePdfToWord} className="w-full mt-3 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">Converter</button>
                                </div>
                            </div>
                            <button onClick={handleReset} className="mt-8 text-gray-400 hover:text-white transition-colors">Começar de novo</button>
                        </div>
                    </div>
                );

            case 'word-tools':
                 return (
                    <div className="flex-grow flex flex-col justify-center items-center text-center">
                        <div className="w-full max-w-lg bg-gray-800/50 rounded-2xl p-8">
                             <div className="flex items-center justify-center gap-3 mb-6">
                                <FileWordIcon className="w-10 h-10 text-blue-400"/>
                                <h2 className="text-2xl font-semibold truncate" title={fileName}>{fileName}</h2>
                            </div>
                             <p className="text-gray-400 mb-6">Pronto para converter seu documento para PDF?</p>
                            <button onClick={handleWordToPdf} className="w-full flex items-center justify-center gap-3 p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold">
                                <FileTextIcon className="w-8 h-8"/>
                                Converter para PDF
                            </button>
                             <button onClick={handleReset} className="mt-8 text-gray-400 hover:text-white transition-colors">Começar de novo</button>
                        </div>
                    </div>
                 );
            
            case 'pdf-editor':
                return <PdfEditor initialDocs={sourceDocs} initialPages={pagesInfo} onReset={handleReset} fileName={fileName} />;
            
            case 'image-editor':
                return <ImageEditor initialImages={imagesInfo} onReset={handleReset} />;
                
            default:
                return <FileDropzone onFileSelect={handleFileProcess} error={error} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
            <header className="py-4 px-6 md:px-8 border-b border-gray-700/50">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
                        <LogoIcon className="h-8 w-8 text-blue-400" />
                        <h1 className="text-xl font-bold tracking-tight text-white">Editor de PDF Pro</h1>
                    </div>
                     <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                        <GithubIcon className="h-6 w-6" />
                    </a>
                </div>
            </header>
            <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;
