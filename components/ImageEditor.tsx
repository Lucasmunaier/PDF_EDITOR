
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
import { ImageInfo } from '../types';
import { ImageThumbnail } from './ImageThumbnail';
import { RotateCcwIcon, Trash2Icon, DownloadIcon, FileIcon, XIcon } from './Icons';
import Spinner from './Spinner';

interface ImageEditorProps {
  initialImages: ImageInfo[];
  onReset: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ initialImages, onReset }) => {
  const [images, setImages] = useState<ImageInfo[]>(initialImages);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const toggleImageSelection = (imageId: string, event: React.MouseEvent) => {
    const newSelection = new Set(selectedImages);
    if(event.ctrlKey || event.metaKey) {
        if(newSelection.has(imageId)) {
            newSelection.delete(imageId);
        } else {
            newSelection.add(imageId);
        }
    } else {
        newSelection.clear();
        newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };
  
  const handleRotate = () => {
    setImages(images.map(p => {
        if(selectedImages.has(p.id)) {
            const newRotation = (((p.rotation - 90) % 360) + 360) % 360;
            return { ...p, rotation: newRotation };
        }
        return p;
    }));
  };

  const handleDelete = () => {
    setImages(images.filter(p => !selectedImages.has(p.id)));
    setSelectedImages(new Set());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const newPdfDoc = await PDFDocument.create();

        for (const imageInfo of images) {
            const imageBytes = await fetch(imageInfo.thumbnailUrl).then(res => res.arrayBuffer());
            
            let image;
            const mimeType = imageInfo.thumbnailUrl.substring(5, imageInfo.thumbnailUrl.indexOf(';'));

            if (mimeType === 'image/jpeg') {
                image = await newPdfDoc.embedJpg(imageBytes);
            } else if (mimeType === 'image/png') {
                image = await newPdfDoc.embedPng(imageBytes);
            } else {
                console.warn(`Tipo de imagem não suportado para: ${imageInfo.name}, pulando.`);
                continue;
            }

            const isRotated = imageInfo.rotation === 90 || imageInfo.rotation === 270;
            const page = newPdfDoc.addPage([isRotated ? image.height : image.width, isRotated ? image.width : image.height]);

            page.drawImage(image, {
                x: page.getWidth() / 2,
                y: page.getHeight() / 2,
                width: image.width,
                height: image.height,
                rotate: degrees(-imageInfo.rotation), // pdf-lib rotation is counter-clockwise
                xSkew: degrees(0),
                ySkew: degrees(0),
            });
        }

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `imagens_convertidas.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Falha ao salvar o PDF:", e);
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
                    <span>{images.length} imagem(s) carregada(s)</span>
                </div>
                <div className="flex items-center gap-2">
                     <button
                        onClick={handleRotate}
                        disabled={selectedImages.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Rotacionar selecionadas"
                    >
                        <RotateCcwIcon className="w-5 h-5" /> <span className="hidden md:inline">Rotacionar</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={selectedImages.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Excluir selecionadas"
                    >
                        <Trash2Icon className="w-5 h-5" /> <span className="hidden md:inline">Excluir</span>
                    </button>
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                        title="Carregar outras imagens"
                    >
                       <XIcon className="w-5 h-5" /> <span className="hidden md:inline">Limpar</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || images.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-800 transition-colors"
                    >
                        {isSaving ? <Spinner /> : <DownloadIcon className="w-5 h-5" />} 
                        {isSaving ? "Salvando..." : "Salvar em PDF"}
                    </button>
                </div>
            </div>
            {selectedImages.size > 0 && <p className="text-sm text-gray-400 mt-3">{selectedImages.size} imagem(s) selecionada(s). Use Ctrl/Cmd para selecionar várias.</p>}
        </div>
        <div className="flex-grow overflow-y-auto p-2 -mx-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={images.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {images.map((image, index) => (
                            <ImageThumbnail 
                                key={image.id} 
                                image={image} 
                                imageNumber={index + 1} 
                                isSelected={selectedImages.has(image.id)}
                                onClick={toggleImageSelection}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    </div>
  );
};

export default ImageEditor;
