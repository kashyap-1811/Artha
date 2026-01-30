import './ui.css';

export default function Alert({ type = 'error', message }) {
    if (!message) return null;

    const styles = {
        error: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
        warning: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
        info: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' }
    };

    const style = styles[type] || styles.error;

    return (
        <div style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: style.bg,
            color: style.color,
            border: `1px solid ${style.border}`,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        }}>
            <span>⚠️</span>
            <span>{message}</span>
        </div>
    );
}
