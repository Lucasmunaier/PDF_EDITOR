
import React, { useState, useRef } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { PageInfo } from '../types';
import { PageThumbnail } from './PageThumbnail';
import { RotateCcwIcon, Trash2Icon, DownloadIcon, FileIcon, XIcon, PlusCircleIcon } from './Icons';
import Spinner from './Spinner';

// Make pdfjsLib available
declare const pdfjsLib: any;

interface PdfEditorProps {
  initialDocs: PDFDocument[];
  initialPages: PageInfo[];
  onReset: () => void;
  fileName: string;
}

const PdfEditor: React.FC<PdfEditorProps> = ({ initialDocs, initialPages, onReset, fileName }) => {
  const [sourceDocs, setSourceDocs] = useState<PDFDocument[]>(initialDocs);
  const [pages, setPages] = useState<PageInfo[]>(initialPages);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const addPdfsInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  
  const handleAddPdfs = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    setIsAdding(true);
    const newPages: PageInfo[] = [];
    const newDocs: PDFDocument[] = [];

    try {
        for (const file of Array.from(event.target.files)) {
            // FIX: Cast file to File to access arrayBuffer method.
            const arrayBuffer = await (file as File).arrayBuffer();
            const doc = await PDFDocument.load(arrayBuffer);
            const docIndex = sourceDocs.length + newDocs.length;
            newDocs.push(doc);

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
                    newPages.push({
                        id: `${Date.now()}-${docIndex}-${i}`,
                        originalIndex: i,
                        sourceDocIndex: docIndex,
                        rotation: page.rotate,
                        thumbnailUrl: canvas.toDataURL(),
                    });
                }
            }
        }
        setSourceDocs(prev => [...prev, ...newDocs]);
        setPages(prev => [...prev, ...newPages]);
    } catch (error) {
        console.error("Falha ao adicionar PDFs:", error);
        alert("Ocorreu um erro ao adicionar os PDFs.");
    } finally {
        setIsAdding(false);
        // Reset file input to allow selecting the same file again
        if(addPdfsInputRef.current) addPdfsInputRef.current.value = "";
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const togglePageSelection = (pageId: string, event: React.MouseEvent) => {
    const newSelection = new Set(selectedPages);
    if(event.ctrlKey || event.metaKey) {
        newSelection.has(pageId) ? newSelection.delete(pageId) : newSelection.add(pageId);
    } else {
        newSelection.clear();
        newSelection.add(pageId);
    }
    setSelectedPages(newSelection);
  };
  
  const handleRotate = () => {
    setPages(pages.map(p => {
        if(selectedPages.has(p.id)) {
            const newRotation = (((p.rotation - 90) % 360) + 360) % 360;
            return { ...p, rotation: newRotation };
        }
        return p;
    }));
  };

  const handleDelete = () => {
    setPages(pages.filter(p => !selectedPages.has(p.id)));
    setSelectedPages(new Set());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const newPdfDoc = await PDFDocument.create();

        for (const pageInfo of pages) {
            const sourceDoc = sourceDocs[pageInfo.sourceDocIndex];
            const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageInfo.originalIndex]);
            newPdfDoc.addPage(copiedPage);
            const newPage = newPdfDoc.getPage(newPdfDoc.getPageCount() - 1);
            newPage.setRotation(degrees(pageInfo.rotation));
        }

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const finalFileName = fileName.endsWith('.pdf') ? fileName.replace(/\.pdf$/i, '_editado.pdf') : `${fileName}_editado.pdf`;
        link.download = finalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Failed to save PDF:", e);
        alert("Ocorreu um erro ao salvar o PDF.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
        <input type="file" ref={addPdfsInputRef} multiple accept="application/pdf" className="hidden" onChange={handleAddPdfs} />
        <div className="flex-shrink-0 bg-gray-800/50 rounded-xl p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-lg font-medium">
                    <FileIcon className="w-6 h-6 text-blue-400" />
                    <span className="truncate" title={fileName}>{fileName}</span>
                    <span className="text-gray-400 text-sm">({pages.length} páginas)</span>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={() => addPdfsInputRef.current?.click()} disabled={isAdding} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 transition-colors" title="Adicionar mais PDFs">
                        {isAdding ? <Spinner/> : <PlusCircleIcon className="w-5 h-5" />} <span className="hidden md:inline">{isAdding ? "Adicionando..." : "Adicionar PDF(s)"}</span>
                    </button>
                     <button onClick={handleRotate} disabled={selectedPages.size === 0} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Rotacionar selecionadas">
                        <RotateCcwIcon className="w-5 h-5" /> <span className="hidden md:inline">Rotacionar</span>
                    </button>
                    <button onClick={handleDelete} disabled={selectedPages.size === 0} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Excluir selecionadas">
                        <Trash2Icon className="w-5 h-5" /> <span className="hidden md:inline">Excluir</span>
                    </button>
                    <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors" title="Começar de novo">
                       <XIcon className="w-5 h-5" /> <span className="hidden md:inline">Fechar</span>
                    </button>
                    <button onClick={handleSave} disabled={isSaving || pages.length === 0} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-800 transition-colors">
                        {isSaving ? <Spinner /> : <DownloadIcon className="w-5 h-5" />} 
                        {isSaving ? "Salvando..." : "Salvar PDF"}
                    </button>
                </div>
            </div>
            {selectedPages.size > 0 && <p className="text-sm text-gray-400 mt-3">{selectedPages.size} página(s) selecionada(s). Use Ctrl/Cmd para selecionar várias.</p>}
        </div>
        <div className="flex-grow overflow-y-auto p-2 -mx-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {pages.map((page, index) => (
                            <PageThumbnail key={page.id} page={page} pageNumber={index + 1} isSelected={selectedPages.has(page.id)} onClick={togglePageSelection}/>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    </div>
  );
};

export default PdfEditor;
