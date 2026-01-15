
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageInfo } from '../types';

interface PageThumbnailProps {
  page: PageInfo;
  pageNumber: number;
  isSelected: boolean;
  onClick: (pageId: string, event: React.MouseEvent) => void;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({ page, pageNumber, isSelected, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const rotationStyle = {
    transform: `rotate(${page.rotation}deg)`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group touch-none aspect-[7/10] bg-gray-800 rounded-lg p-2 flex flex-col items-center justify-center transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 shadow-2xl' : 'ring-1 ring-gray-700'}`}
      onClick={(e) => onClick(page.id, e)}
    >
      <div className="w-full h-full overflow-hidden rounded-md flex items-center justify-center bg-gray-900">
        <img
          src={page.thumbnailUrl}
          alt={`Página ${pageNumber}`}
          className="max-w-full max-h-full object-contain transition-transform duration-300 ease-in-out"
          style={rotationStyle}
        />
      </div>
      <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">
        {pageNumber}
      </span>
      {isDragging && <div className="absolute inset-0 bg-black/50 rounded-lg"></div>}
    </div>
  );
};
