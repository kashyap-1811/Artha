import './ui.css';

export default function EmptyState({ title, description, action }) {
    return (
        <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '2px dashed rgba(255, 255, 255, 0.1)',
            color: 'var(--text-secondary)'
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📂</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {title}
            </h3>
            <p style={{ marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                {description}
            </p>
            {action && <div>{action}</div>}
        </div>
    );
}
