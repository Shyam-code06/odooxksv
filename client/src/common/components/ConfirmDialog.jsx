import React from 'react';
import Modal from './Modal';
import Button from './Button';

const ConfirmDialog = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  isLoading = false
}) => {
  const footer = (
    <div className="d-flex justify-content-end gap-2 w-100">
      <Button 
        variant="light" 
        onClick={onClose} 
        disabled={isLoading}
      >
        {cancelText}
      </Button>
      <Button 
        variant={isDanger ? 'danger' : 'primary'} 
        onClick={onConfirm}
        isLoading={isLoading}
      >
        {confirmText}
      </Button>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      size="sm" 
      footer={footer}
    >
      <div className="d-flex align-items-start gap-3">
        <div className={`rounded-circle p-2 d-flex align-items-center justify-content-center ${isDanger ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`} style={{ width: '42px', height: '42px', flexShrink: 0 }}>
          <i className={`bi bi-${isDanger ? 'exclamation-triangle-fill' : 'question-circle-fill'}`} style={{ fontSize: '1.2rem' }} />
        </div>
        <div>
          <p className="text-secondary mb-0">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
