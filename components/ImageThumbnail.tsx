
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageInfo } from '../types';

interface ImageThumbnailProps {
  image: ImageInfo;
  imageNumber: number;
  isSelected: boolean;
  onClick: (imageId: string, event: React.MouseEvent) => void;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ image, imageNumber, isSelected, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const rotationStyle = {
    transform: `rotate(${image.rotation}deg)`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group touch-none aspect-[7/10] bg-gray-800 rounded-lg p-1.5 flex flex-col items-center justify-between transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 shadow-2xl' : 'ring-1 ring-gray-700'}`}
      onClick={(e) => onClick(image.id, e)}
    >
      <div className="w-full h-full overflow-hidden rounded-md flex items-center justify-center bg-gray-900/50">
        <img
          src={image.thumbnailUrl}
          alt={image.name}
          className="max-w-full max-h-full object-contain transition-transform duration-300 ease-in-out"
          style={rotationStyle}
        />
      </div>
      <div className="w-full pt-1.5 flex items-center justify-between gap-2">
         <p className="text-xs text-gray-300 truncate flex-1" title={image.name}>{image.name}</p>
         <span className="bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {imageNumber}
        </span>
      </div>
      {isDragging && <div className="absolute inset-0 bg-black/50 rounded-lg"></div>}
    </div>
  );
};
