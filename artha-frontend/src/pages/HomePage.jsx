import { useEffect } from "react";

export default function HomePage() {
  
  // Apply a dark theme specifically for the home page matching the Navbar aesthetic
  useEffect(() => {
    document.body.style.backgroundColor = "#020617"; // slate-950
    document.body.style.color = "#ffffff";
    
    return () => {
      // Revert if navigating away to standard layout pages 
      // Note: Layout pages usually define their own background colors
      document.body.style.backgroundColor = ""; 
      document.body.style.color = "";
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)' // Dark glow effect
    }}>
      <h1 style={{
        fontSize: '4rem',
        fontWeight: '800',
        marginBottom: '1.5rem',
        background: 'linear-gradient(to right, #ffffff, #94a3b8)',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        letterSpacing: '-0.02em'
      }}>
        Next Generation <br/> Financial Intelligence
      </h1>
      
      <p style={{
        fontSize: '1.25rem',
        color: '#94a3b8',
        maxWidth: '600px',
        marginBottom: '3rem',
        lineHeight: '1.6'
      }}>
        Apex provides institutional-grade tracking and analytics for modern businesses. Completely rethink how you manage assets, expenses, and budgets.
      </p>

    </div>
  );
}
