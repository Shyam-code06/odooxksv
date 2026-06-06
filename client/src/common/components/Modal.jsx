import React, { useEffect } from 'react';

const Modal = ({
  isOpen = false,
  onClose,
  title,
  size = '', // 'sm', 'lg', 'xl'
  children,
  footer = null,
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = size ? `modal-${size}` : '';

  return (
    <>
      <div 
        className="modal fade show d-block" 
        tabIndex="-1" 
        role="dialog"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      >
        <div 
          className={`modal-dialog modal-dialog-centered ${sizeClass}`} 
          role="document"
          onClick={e => e.stopPropagation()} // Prevent closing when clicking modal content
        >
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
            <div className="modal-header border-bottom py-3">
              <h5 className="modal-title fw-bold text-dark">{title}</h5>
              <button 
                type="button" 
                className="btn-close" 
                aria-label="Close"
                onClick={onClose}
              />
            </div>
            <div className="modal-body p-4">
              {children}
            </div>
            {footer && (
              <div className="modal-footer border-top py-2 bg-light rounded-bottom-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
