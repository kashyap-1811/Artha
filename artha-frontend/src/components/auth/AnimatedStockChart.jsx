import React, { useEffect, useRef, useState } from 'react';

export default function AnimatedStockChart() {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(canvas.parentElement);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let t = 0; // Time variable for moving the chart

    // Generate random but smooth y points for the "stock" line
    const numPoints = 60; // Points visible on screen
    const points = [];
    let currentY = dimensions.height * 0.6; // Start somewhat in the middle
    let volatility = dimensions.height * 0.03; // Base volatility

    // Pre-fill some points
    for (let i = 0; i < numPoints + 20; i++) { // Extra points for sliding
      points.push(currentY);
      // Random walk with slight upward bias
      let change = (Math.random() - 0.45) * volatility; 
      
      // occasional spike
      if (Math.random() > 0.9) {
          change *= 3;
      }
      
      currentY += change;
      
      // bounds keeping
      if (currentY > dimensions.height * 0.9) currentY -= Math.abs(change) * 2;
      if (currentY < dimensions.height * 0.1) currentY += Math.abs(change) * 2;
    }


    function drawGrid() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Horizontal lines
        for(let i=0; i<dimensions.height; i+=40) {
            ctx.moveTo(0, i);
            ctx.lineTo(dimensions.width, i);
        }
        // Vertical lines
        for(let i=0; i<dimensions.width; i+=40) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, dimensions.height);
        }
        ctx.stroke();
    }

    function animate() {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      drawGrid();

      // We slice the points to get the current window, sliding over time
      const speed = 0.3; // px per frame
      const xOffset = -(t % (dimensions.width / numPoints));
      const startIndex = Math.floor(t / (dimensions.width / numPoints)) % (points.length - numPoints - 1);
      
      const currentPoints = points.slice(startIndex, startIndex + numPoints + 2);
      
      const xStep = dimensions.width / numPoints;

      ctx.beginPath();
      // Start drawing from slightly left of screen for smooth scroll
      ctx.moveTo(xOffset - xStep, currentPoints[0]);

      for (let i = 1; i < currentPoints.length; i++) {
          const x = xOffset + (i - 1) * xStep;
          const y = currentPoints[i];
          
          // Use extremely simple bezier/quadratic for smooth lines if wanted, or just straight lines
          // For stock charts, straight lines are fine, but let's do a smooth bezier midway
          const prevX = xOffset + (i - 2) * xStep;
          const prevY = currentPoints[i - 1];
          const cpX = (prevX + x) / 2;
          
          if(i === 1) {
              ctx.lineTo(x, y);
          } else {
             ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
             // Final point straight
             if (i === currentPoints.length - 1) {
                 ctx.lineTo(x,y);
             }
          }
      }

      // Fill gradient below line
      const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)'); // Blue
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
      
      const lineGradient = ctx.createLinearGradient(0,0, dimensions.width, 0);
      lineGradient.addColorStop(0, '#3b82f6');
      lineGradient.addColorStop(1, '#818cf8');


      // Copy path for stroke
      const pathSvg = new Path2D();
      pathSvg.moveTo(xOffset - xStep, currentPoints[0]);
      for(let i=1; i < currentPoints.length; i++) {
        const x = xOffset + (i - 1) * xStep;
        const y = currentPoints[i];
        pathSvg.lineTo(x, y);
      }
      
      // Close path to fill
      ctx.lineTo(dimensions.width + xStep, dimensions.height);
      ctx.lineTo(0, dimensions.height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw the line graph on top
      ctx.lineWidth = 3;
      ctx.strokeStyle = lineGradient;
      ctx.stroke(pathSvg);

      // Draw a glowing "current price" marker at the right-most point on screen (roughly)
      const lastVisibleIndex = Math.min(numPoints, currentPoints.length-2);
      const markerX = xOffset + (lastVisibleIndex - 1) * xStep;
      const markerY = currentPoints[lastVisibleIndex];

      ctx.beginPath();
      ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(markerX, markerY, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255, 0.2)';
      ctx.fill();

      t += speed;
      
      // Continuously append new points to array to never run out if t gets huge
      if(startIndex > points.length - numPoints - 10) {
          let lastY = points[points.length-1];
          for(let i=0; i<50; i++) {
            let change = (Math.random() - 0.45) * volatility;
            lastY += change;
            if (lastY > dimensions.height * 0.9) lastY -= Math.abs(change) * 2;
            if (lastY < dimensions.height * 0.1) lastY += Math.abs(change) * 2;
            points.push(lastY);
          }
      }


      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <div className="stock-chart-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas 
        ref={canvasRef} 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.8 }} 
      />
    </div>
  );
}
