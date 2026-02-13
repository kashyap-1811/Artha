import './ui.css';

export default function Skeleton({ width, height, className = '' }) {
    return (
        <div
            className={`ui-skeleton ${className}`}
            style={{ width, height }}
        />
    );
}
