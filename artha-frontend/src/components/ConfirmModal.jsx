import { createPortal } from "react-dom";

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  isDestructive = true, 
  isProcessing = false 
}) {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="create-modal-overlay" onClick={!isProcessing ? onCancel : undefined} style={{ zIndex: 999999 }}>
      <section className="create-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(100%, 24rem)', padding: '1.8rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: isDestructive ? '#fee2e2' : 'var(--accent-soft)', color: isDestructive ? '#ef4444' : 'var(--accent)', marginBottom: '1rem' }}>
          {isDestructive ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9 12l2 2 4-4"></path></svg>
          )}
        </div>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{title}</h3>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={isProcessing}
            style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--edge)', background: 'var(--surface-hover)', color: 'var(--text-main)', fontWeight: 600, cursor: isProcessing ? 'wait' : 'pointer', fontSize: '0.9rem' }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            disabled={isProcessing}
            style={{ 
              padding: '0.6rem 1.25rem', 
              borderRadius: '8px', 
              border: 'none', 
              background: isDestructive ? '#ef4444' : 'var(--accent)', 
              color: '#fff', 
              fontWeight: 700, 
              cursor: isProcessing ? 'wait' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
              fontSize: '0.9rem'
            }}
          >
            {isProcessing ? "Processing..." : confirmText}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
