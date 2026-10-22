import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import Lenis from "lenis";

// ---------------------------------------------------------
// 1. BRIGHT GEN-Z 3D WIREFRAME & IRIDESCENT MESH CANVAS
// ---------------------------------------------------------
export function Interactive3DBackground({ accent = "violet" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e) => {
      mouse.targetX = (e.clientX / width - 0.5) * 2;
      mouse.targetY = (e.clientY / height - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 3D Golden-Ratio Icosahedron
    const t = (1 + Math.sqrt(5)) / 2;
    const rawVertices = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    const edges = [
      [0, 11], [0, 5], [0, 1], [0, 7], [0, 10],
      [1, 5], [5, 11], [11, 10], [10, 7], [7, 1],
      [3, 9], [3, 4], [3, 2], [3, 6], [3, 8],
      [4, 9], [2, 4], [6, 2], [8, 6], [9, 8],
      [4, 5], [2, 11], [6, 10], [8, 7], [9, 1],
      [4, 11], [2, 10], [6, 7], [8, 1], [9, 5]
    ];

    const palette = ["124, 58, 237", "236, 72, 153", "6, 182, 212", "249, 115, 22"];
    const particles = Array.from({ length: 48 }, (_, idx) => ({
      x: (Math.random() - 0.5) * 1200,
      y: (Math.random() - 0.5) * 800,
      z: Math.random() * 800 + 100,
      size: Math.random() * 3 + 1.2,
      rgb: palette[idx % palette.length]
    }));

    let angleX = 0;
    let angleY = 0;

    const project3D = (x, y, z, fov = 540) => {
      const scale = fov / (fov + z + 420);
      return {
        x: width * 0.5 + x * scale,
        y: height * 0.5 + y * scale,
        scale
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      angleY += 0.0035 + mouse.x * 0.004;
      angleX += 0.002 + mouse.y * 0.004;

      const primaryRgb = accent === "coral" ? "249, 115, 22" : "124, 58, 237";
      const secondaryRgb = accent === "coral" ? "236, 72, 153" : "236, 72, 153";
      const tertiaryRgb = "6, 182, 212";

      // Gen-Z Pastel Mesh Aura 1 (Top Left - Electric Lavender/Violet)
      const grad1 = ctx.createRadialGradient(
        width * (0.22 + mouse.x * 0.05),
        height * (0.22 + mouse.y * 0.05),
        20,
        width * 0.25,
        height * 0.25,
        520
      );
      grad1.addColorStop(0, `rgba(${primaryRgb}, 0.16)`);
      grad1.addColorStop(1, "rgba(244, 245, 251, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Aura 2 (Bottom Right - Hyper Pink / Coral)
      const grad2 = ctx.createRadialGradient(
        width * (0.78 - mouse.x * 0.05),
        height * (0.75 - mouse.y * 0.05),
        20,
        width * 0.78,
        height * 0.75,
        500
      );
      grad2.addColorStop(0, `rgba(${secondaryRgb}, 0.15)`);
      grad2.addColorStop(1, "rgba(244, 245, 251, 0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Aura 3 (Center Right - Cyber Mint/Aqua)
      const grad3 = ctx.createRadialGradient(
        width * (0.65 + mouse.y * 0.04),
        height * (0.25 - mouse.x * 0.04),
        10,
        width * 0.65,
        height * 0.25,
        400
      );
      grad3.addColorStop(0, `rgba(${tertiaryRgb}, 0.13)`);
      grad3.addColorStop(1, "rgba(244, 245, 251, 0)");
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      // Project 3D Icosahedron
      const radius = Math.min(width, height) * 0.24;
      const projectedVerts = rawVertices.map(([vx, vy, vz]) => {
        let x = vx * radius;
        let y = vy * radius;
        let z = vz * radius;

        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;

        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX;

        return project3D(x1 + mouse.x * 55, y2 + mouse.y * 55, z2);
      });

      // Draw 3D Wireframe Edges
      ctx.lineWidth = 1.25;
      edges.forEach(([i, j], idx) => {
        const p1 = projectedVerts[i];
        const p2 = projectedVerts[j];
        const alpha = Math.max(0.06, ((p1.scale + p2.scale) * 0.5 - 0.3) * 0.32);
        const strokeRgb = idx % 2 === 0 ? primaryRgb : secondaryRgb;
        ctx.strokeStyle = `rgba(${strokeRgb}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw 3D Vertices
      projectedVerts.forEach((p, idx) => {
        const dotRgb = idx % 2 === 0 ? primaryRgb : secondaryRgb;
        ctx.fillStyle = `rgba(${dotRgb}, ${p.scale * 0.55})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, p.scale * 3.6), 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Floating Confetti/Depth Orbs
      particles.forEach((pt) => {
        pt.z -= 0.65;
        if (pt.z < -250) pt.z = 750;
        const proj = project3D(pt.x + mouse.x * 90, pt.y + mouse.y * 90, pt.z);
        ctx.fillStyle = `rgba(${pt.rgb}, ${Math.min(0.45, proj.scale * 0.4)})`;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, pt.size * proj.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [accent]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

// ---------------------------------------------------------
// 2. REACT BITS 3D TILT + IRIDESCENT SPOTLIGHT CARD
// ---------------------------------------------------------
export function TiltSpotlightCard({
  children,
  className = "",
  onClick,
  maxTilt = 10,
  glowColor = "rgba(219, 39, 119, 0.14)"
}) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;

    const rotateY = ((x - midX) / midX) * maxTilt;
    const rotateX = -((y - midY) / midY) * maxTilt;

    gsap.to(el, {
      rotateX,
      rotateY,
      scale: 1.02,
      duration: 0.35,
      ease: "power2.out",
      transformPerspective: 900,
      transformOrigin: "center"
    });

    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(300px circle at ${x}px ${y}px, ${glowColor}, transparent 75%)`;
      glowRef.current.style.opacity = "1";
    }
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    gsap.to(el, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.5)"
    });
    if (glowRef.current) {
      glowRef.current.style.opacity = "0";
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
      className={`neo-glass relative overflow-hidden transition-colors ${className}`}
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 z-0"
      />
      <div className="relative z-10 h-full w-full" style={{ transform: "translateZ(14px)" }}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 3. GSAP MAGNETIC TACTILE BUTTON
// ---------------------------------------------------------
export function MagneticButton({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
  title = ""
}) {
  const btnRef = useRef(null);

  const handleMove = (e) => {
    if (disabled || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
    gsap.to(btnRef.current, { x, y, duration: 0.25, ease: "power2.out" });
  };

  const handleLeave = () => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  };

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      title={title}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------
// 4. LENIS SMOOTH SCROLL + GSAP TICKER SYNCHRONIZATION HOOK
// ---------------------------------------------------------
export function useLenisSmoothScroll(scrollContainerRef, depTrigger) {
  useEffect(() => {
    const wrapper = scrollContainerRef.current;
    if (!wrapper) return;

    const lenis = new Lenis({
      wrapper,
      content: wrapper.firstElementChild || wrapper,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    const update = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
    };
  }, [scrollContainerRef, depTrigger]);
}

// ---------------------------------------------------------
// 5. GSAP 3D STAGGERED ENTRANCE HOOK
// ---------------------------------------------------------
export function useGsap3DCascade(containerRef, triggerDeps = []) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const items = el.querySelectorAll(".gsap-3d-item");
    if (!items.length) return;

    gsap.fromTo(
      items,
      {
        opacity: 0,
        y: 26,
        rotateX: -14,
        scale: 0.96
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.55,
        stagger: 0.04,
        ease: "power3.out",
        clearProps: "transform"
      }
    );
  }, triggerDeps);
}