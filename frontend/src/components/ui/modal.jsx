import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        const isSelectDropdown =
          e.target.closest('[data-radix-popper-content-wrapper]') ||
          e.target.closest('[role="listbox"]') ||
          e.target.closest('[data-state="open"]') ||
          e.target.closest('.select-content') ||
          e.target.closest('[data-radix-select-content]');

        if (!isSelectDropdown) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{title}</h2>

          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {children}
        </div>

      </div>
    </div>
  );
}