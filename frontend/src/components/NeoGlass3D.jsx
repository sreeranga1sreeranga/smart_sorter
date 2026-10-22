import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import Lenis from "lenis";

// ---------------------------------------------------------
// 1. THREE.JS WEBGL 3D GRAFFITI SCULPTURE SCENE
// ---------------------------------------------------------
export function ThreeGraffitiScene({ mode = "user" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const limeLight = new THREE.PointLight(0xccff00, 5, 40);
    limeLight.position.set(10, 10, 10);
    scene.add(limeLight);

    const pinkLight = new THREE.PointLight(0xff007f, 5, 40);
    pinkLight.position.set(-10, -8, 8);
    scene.add(pinkLight);

    const cyanLight = new THREE.PointLight(0x00f0ff, 4, 40);
    cyanLight.position.set(0, 12, -10);
    scene.add(cyanLight);

    // Group holding 3D Graffiti Shapes
    const group = new THREE.Group();
    scene.add(group);

    // Centerpiece: Wireframe + Iridescent TorusKnot
    const knotGeo = new THREE.TorusKnotGeometry(3.4, 0.95, 120, 18);
    const knotMat = new THREE.MeshStandardMaterial({
      color: mode === "admin" ? 0xffbe0b : 0xff007f,
      roughness: 0.25,
      metalness: 0.75,
      wireframe: true
    });
    const torusKnot = new THREE.Mesh(knotGeo, knotMat);
    torusKnot.position.set(-4.5, 0.5, -2);
    group.add(torusKnot);

    // Floating Street-Art Geometric Debris (Cones, Octahedrons, Tori)
    const colors = [0xccff00, 0xff007f, 0x00f0ff, 0xffbe0b, 0x8338ec];
    const floatingMeshes = [];

    for (let i = 0; i < 24; i++) {
      let geo;
      const shapeType = i % 3;
      if (shapeType === 0) geo = new THREE.OctahedronGeometry(Math.random() * 0.65 + 0.35, 0);
      else if (shapeType === 1) geo = new THREE.TorusGeometry(Math.random() * 0.55 + 0.25, 0.15, 12, 24);
      else geo = new THREE.ConeGeometry(Math.random() * 0.5 + 0.3, 1.1, 6);

      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.3,
        metalness: 0.5,
        wireframe: i % 2 === 0
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 28,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 12 - 3
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      group.add(mesh);

      floatingMeshes.push({
        mesh,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.02,
        floatSpeed: Math.random() * 0.015 + 0.005,
        initialY: mesh.position.y,
        offset: Math.random() * Math.PI * 2
      });
    }

    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    let clock = 0;
    let frameId;
    const animate = () => {
      clock += 0.015;
      torusKnot.rotation.x += 0.005;
      torusKnot.rotation.y += 0.008;

      // Smooth GSAP-like camera parallax
      group.rotation.y += (mouse.x * 0.35 - group.rotation.y) * 0.05;
      group.rotation.x += (-mouse.y * 0.25 - group.rotation.x) * 0.05;

      floatingMeshes.forEach((item) => {
        item.mesh.rotation.x += item.rotSpeedX;
        item.mesh.rotation.y += item.rotSpeedY;
        item.mesh.position.y = item.initialY + Math.sin(clock + item.offset) * 0.8;
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [mode]);

  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0" />;
}

// ---------------------------------------------------------
// 2. REACT BITS: SPRAY-PAINT SPLASH CURSOR TRAIL
// ---------------------------------------------------------
export function SplashCursor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const sprayPalette = ["#CCFF00", "#FF007F", "#00F0FF", "#FFBE0B", "#8338EC"];
    const drops = [];

    const handleMove = (e) => {
      for (let i = 0; i < 3; i++) {
        drops.push({
          x: e.clientX + (Math.random() - 0.5) * 14,
          y: e.clientY + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 + 0.4,
          radius: Math.random() * 5.5 + 2,
          color: sprayPalette[Math.floor(Math.random() * sprayPalette.length)],
          alpha: 0.9
        });
      }
    };
    window.addEventListener("mousemove", handleMove);

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += d.vx;
        d.y += d.vy;
        d.radius *= 0.96;
        d.alpha -= 0.025;

        if (d.alpha <= 0.02 || d.radius <= 0.5) {
          drops.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

// ---------------------------------------------------------
// 3. REACT BITS: DECRYPTED SCRAMBLE TEXT ANIMATION
// ---------------------------------------------------------
const GLYPHS = "▲▼◆●★⚡#%&@!$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function DecryptedText({ text, className = "" }) {
  const [output, setOutput] = useState(text);

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setOutput(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) return text[index];
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );
      iteration += 1 / 2;
      if (iteration >= text.length) {
        setOutput(text);
        clearInterval(interval);
      }
    }, 24);

    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{output}</span>;
}

// ---------------------------------------------------------
// 4. REACT BITS: KINETIC TYPEWRITER TAGLINE
// ---------------------------------------------------------
export function TypewriterWords({ words = [], className = "" }) {
  const [index, setIndex] = useState(0);
  const [subText, setSubText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!words.length) return;
    const currentWord = words[index % words.length];
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          setSubText(currentWord.slice(0, subText.length + 1));
          if (subText.length + 1 === currentWord.length) {
            setTimeout(() => setDeleting(true), 1200);
          }
        } else {
          setSubText(currentWord.slice(0, subText.length - 1));
          if (subText.length === 0) {
            setDeleting(false);
            setIndex((prev) => (prev + 1) % words.length);
          }
        }
      },
      deleting ? 35 : 65
    );
    return () => clearTimeout(timeout);
  }, [subText, deleting, index, words]);

  return (
    <span className={className}>
      {subText}
      <span className="inline-block w-2.5 h-5 ml-1 bg-[#CCFF00] animate-pulse align-middle" />
    </span>
  );
}

// ---------------------------------------------------------
// 5. REACT BITS: DIAGONAL STREET-ART CAUTION TAPE MARQUEE
// ---------------------------------------------------------
export function GraffitiTicker({ items = [], bg = "bg-[#CCFF00]", textCol = "text-black" }) {
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div className={`w-full overflow-hidden border-y-2 border-black py-1.5 ${bg} ${textCol} font-mono-code font-extrabold text-xs uppercase tracking-widest shadow-md`}>
      <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
        {repeated.map((item, idx) => (
          <span key={idx} className="flex items-center gap-3">
            <span>★ {item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 6. REACT BITS: 3D TILT + SPOTLIGHT GRAFFITI CARD
// ---------------------------------------------------------
export function TiltSpotlightCard({
  children,
  className = "",
  onClick,
  maxTilt = 9,
  variant = "lime" // 'lime' | 'pink' | 'cyan'
}) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const variantClass =
    variant === "pink"
      ? "graffiti-card-pink"
      : variant === "cyan"
      ? "graffiti-card-cyan"
      : "graffiti-card";

  const glowColor =
    variant === "pink"
      ? "rgba(255, 0, 127, 0.28)"
      : variant === "cyan"
      ? "rgba(0, 240, 255, 0.26)"
      : "rgba(204, 255, 0, 0.24)";

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
      duration: 0.3,
      ease: "power2.out",
      transformPerspective: 900,
      transformOrigin: "center"
    });

    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(280px circle at ${x}px ${y}px, ${glowColor}, transparent 75%)`;
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
      duration: 0.55,
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
      className={`${variantClass} relative overflow-hidden transition-colors ${className}`}
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
// 7. GSAP MAGNETIC STICKER BUTTON
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
    gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.4)" });
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
      className={`sticker-btn ${className}`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------
// 8. REACT BITS + FRAMER MOTION FLOATING BOTTOM 3D DOCK
// ---------------------------------------------------------
export function FloatingGraffitiDock({ items = [], activeId, onSelect }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-3 py-2.5 rounded-3xl bg-[#140d2b]/95 border-2 border-white shadow-[0_12px_35px_rgba(0,0,0,0.85),5px_5px_0px_#CCFF00] backdrop-blur-xl flex items-center gap-2">
      {items.map((item) => {
        const IconComp = item.icon;
        const isActive = activeId === item.id;
        return (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.22, y: -8 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            onClick={() => onSelect(item.id)}
            className={`relative group flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-extrabold text-xs border-2 transition-colors ${
              isActive
                ? `${item.bg || "bg-[#CCFF00]"} text-black border-black shadow-[3px_3px_0px_#000]`
                : "bg-white/5 text-white border-transparent hover:border-white/40"
            }`}
          >
            <IconComp className="w-4 h-4 shrink-0" />
            <span className={`${isActive ? "inline-block" : "hidden xl:inline-block"}`}>
              {item.label}
            </span>
            {item.count > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-code font-extrabold ${
                  isActive ? "bg-black text-[#CCFF00]" : "bg-[#FF007F] text-white"
                }`}
              >
                {item.count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------
// 9. LENIS SMOOTH SCROLL & GSAP 3D STAGGER HOOKS
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
        y: 32,
        rotateX: -16,
        scale: 0.94
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.55,
        stagger: 0.045,
        ease: "back.out(1.4)",
        clearProps: "transform"
      }
    );
  }, triggerDeps);
}

export { motion, AnimatePresence };