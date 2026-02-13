import './ui.css';

export default function Card({ children, className = '', title, action }) {
    return (
        <div className={`ui-card ${className}`}>
            {(title || action) && (
                <div className="ui-card-header">
                    {title && <h3 className="ui-card-title">{title}</h3>}
                    {action && <div className="ui-card-action">{action}</div>}
                </div>
            )}
            <div className="ui-card-body">
                {children}
            </div>
        </div>
    );
}
