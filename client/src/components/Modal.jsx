import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(raf);
    }
    setShow(false);
  }, [open]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[size] || 'max-w-md';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className={`relative bg-white w-full ${sizeClass} rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto transition-all duration-200 ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 sm:translate-y-0'}`}>
        {title && (
          <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-gray-100 rounded-t-2xl">
            <h2 className="font-bold text-lg text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = "Ha, tasdiqlash", confirmClass = "btn-danger" }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Bekor qilish</button>
        <button onClick={() => { onConfirm(); onClose(); }} className={`${confirmClass} flex-1`}>{confirmText}</button>
      </div>
    </Modal>
  );
}
