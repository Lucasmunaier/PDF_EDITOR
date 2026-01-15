
import React, { useState } from 'react';
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
import { RotateCcwIcon, Trash2Icon, DownloadIcon, FileIcon, XIcon } from './Icons';
import Spinner from './Spinner';

interface PdfEditorProps {
  pdfDoc: PDFDocument;
  initialPages: PageInfo[];
  onReset: () => void;
  fileName: string;
}

const PdfEditor: React.FC<PdfEditorProps> = ({ pdfDoc, initialPages, onReset, fileName }) => {
  const [pages, setPages] = useState<PageInfo[]>(initialPages);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Exija que o ponteiro se mova 5px para ativar o arrasto
        // Isso permite que cliques simples sejam registrados
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

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
        if(newSelection.has(pageId)) {
            newSelection.delete(pageId);
        } else {
            newSelection.add(pageId);
        }
    } else {
        newSelection.clear();
        newSelection.add(pageId);
    }
    setSelectedPages(newSelection);
  };
  
  const handleRotate = () => {
    setPages(pages.map(p => {
        if(selectedPages.has(p.id)) {
            // Normaliza para um ângulo positivo entre 0 e 270
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
            const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageInfo.originalIndex]);
            
            // 1. Adiciona a página ao novo documento PRIMEIRO.
            newPdfDoc.addPage(copiedPage);

            // 2. Obtém a referência da página que acabamos de adicionar.
            const newPage = newPdfDoc.getPage(newPdfDoc.getPageCount() - 1);

            // 3. Aplica a rotação na página que já está no documento.
            newPage.setRotation(degrees(pageInfo.rotation));
        }

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}_editado.pdf`;
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
        <div className="flex-shrink-0 bg-gray-800/50 rounded-xl p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-lg font-medium">
                    <FileIcon className="w-6 h-6 text-blue-400" />
                    <span>{fileName}.pdf</span>
                    <span className="text-gray-400 text-sm">({pages.length} páginas)</span>
                </div>
                <div className="flex items-center gap-2">
                     <button
                        onClick={handleRotate}
                        disabled={selectedPages.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Rotacionar selecionadas"
                    >
                        <RotateCcwIcon className="w-5 h-5" /> <span className="hidden md:inline">Rotacionar</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={selectedPages.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Excluir selecionadas"
                    >
                        <Trash2Icon className="w-5 h-5" /> <span className="hidden md:inline">Excluir</span>
                    </button>
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                        title="Carregar outro PDF"
                    >
                       <XIcon className="w-5 h-5" /> <span className="hidden md:inline">Fechar</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-800 transition-colors"
                    >
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
                            <PageThumbnail 
                                key={page.id} 
                                page={page} 
                                pageNumber={index + 1} 
                                isSelected={selectedPages.has(page.id)}
                                onClick={togglePageSelection}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    </div>
  );
};

export default PdfEditor;
