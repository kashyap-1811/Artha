import { useEffect, useRef } from "react";

const DotBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const dots = [];
    const spacing = 32; // px between dots
    const dotRadius = 1.2;
    const glowRadius = 160;

    const initDots = () => {
      const { innerWidth: width, innerHeight: height } = window;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      dots.length = 0;
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          dots.push({ x, y, baseOpacity: 0.1 });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dots.forEach((dot) => {
        const dx = mouseRef.current.x - dot.x;
        const dy = mouseRef.current.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let opacity = dot.baseOpacity;
        let scale = 1;
        let color = "#94a3b8"; // slate-400

        if (distance < glowRadius) {
          const ratio = 1 - distance / glowRadius;
          opacity = dot.baseOpacity + ratio * 0.7; // Brighter near mouse
          scale = 1 + ratio * 1.5; // Bigger near mouse
          color = `rgba(59, 130, 246, ${opacity})`; // brand blue
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotRadius * scale, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = distance < glowRadius ? 10 * (1 - distance / glowRadius) : 0;
        ctx.shadowColor = "rgba(59, 130, 246, 0.4)";
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleResize = () => {
      initDots();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    initDots();
    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Click through to page content
        zIndex: -1, // Behind everything
        opacity: 0.6,
      }}
    />
  );
};

export default DotBackground;
