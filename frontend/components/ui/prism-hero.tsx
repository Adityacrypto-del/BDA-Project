"use client";

/* Adapted from frontend-bitch/01-prism-hero: a scroll-driven glass crystal.
   Here a cloud of "records" orbits the crystal and is pulled into it as the
   page scrolls - the reduce step, visualised. */

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial } from "@react-three/drei";
import { motion, useInView, useScroll, useTransform, type MotionValue } from "motion/react";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

const RECORDS = 260;
// What the glass refracts where there is nothing behind it (the page text is HTML, outside the scene)
const BACKDROP = new THREE.Color("#121829");

export function PrismHero({
  word = "MAPREDUCE",
  intro,
  outro,
  actions,
}: {
  word?: string;
  intro: ReactNode;
  outro: ReactNode;
  actions?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  // Stop rendering the canvas once the hero has scrolled away
  const visible = useInView(containerRef);

  const introOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.25], [0, -60]);
  const outroOpacity = useTransform(scrollYProgress, [0.45, 0.65], [0, 1]);
  const outroY = useTransform(scrollYProgress, [0.45, 0.65], [40, 0]);
  const wordScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);

  return (
    <div ref={containerRef} className="relative h-[260vh] w-full">
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <motion.div
          style={{ scale: wordScale }}
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
        >
          <h1
            className="font-display select-none text-[15vw] font-bold tracking-tighter text-transparent opacity-80"
            style={{ WebkitTextStroke: "2px rgba(237,232,223,0.22)" }}
          >
            {word}
          </h1>
        </motion.div>

        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]} frameloop={visible ? "always" : "never"}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <Crystal progress={scrollYProgress} />
            <Records progress={scrollYProgress} />
            <Environment resolution={256}>
              <Lightformer form="rect" intensity={4} position={[0, 4, -6]} scale={[12, 2, 1]} color="#5b9bff" />
              <Lightformer form="rect" intensity={3} position={[-6, -1, -2]} scale={[2, 8, 1]} color="#2fc7a9" />
              <Lightformer form="rect" intensity={3} position={[6, 1, -2]} scale={[2, 8, 1]} color="#a98bff" />
              <Lightformer form="ring" intensity={2} position={[0, -4, 4]} scale={4} color="#ffffff" />
            </Environment>
          </Canvas>
        </div>

        <motion.div
          style={{ opacity: introOpacity, y: introY }}
          className="pointer-events-none absolute inset-x-0 top-[14vh] z-10 px-6 text-center [text-shadow:0_2px_24px_rgb(7_8_12/0.9)]"
        >
          {intro}
        </motion.div>

        <motion.div
          style={{ opacity: outroOpacity, y: outroY }}
          className="pointer-events-none absolute inset-x-0 top-[14vh] z-10 px-6 text-center [text-shadow:0_2px_24px_rgb(7_8_12/0.9)]"
        >
          {outro}
        </motion.div>

        {actions && <div className="z-10 mt-auto mb-16 flex flex-wrap justify-center gap-3 px-6">{actions}</div>}
      </div>
    </div>
  );
}

function Crystal({ progress }: { progress: MotionValue<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const p = progress.get();
    const t = state.clock.elapsedTime;
    mesh.rotation.y = p * Math.PI * 4 + t * 0.15;
    mesh.rotation.x = p * Math.PI * 2 + Math.sin(t * 0.4) * 0.1;
    const s = 1 + p * 1.2;
    mesh.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.4, 0]} />
      <MeshTransmissionMaterial
        thickness={0.6}
        roughness={0}
        transmission={1}
        ior={1.5}
        chromaticAberration={0.08}
        anisotropy={0.2}
        background={BACKDROP}
        backside
      />
    </mesh>
  );
}

/** Small cubes on random orbits; their radius shrinks to the core as you scroll. */
function Records({ progress }: { progress: MotionValue<number> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: RECORDS }, () => ({
      radius: 2.4 + rand() * 2.2,
      speed: 0.08 + rand() * 0.25,
      phase: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * Math.PI,
      size: 0.03 + rand() * 0.05,
      lag: rand() * 0.25,
    }));
  }, []);
  const colors = useMemo(() => {
    const palette = ["#5b9bff", "#2fc7a9", "#f0b23f", "#a98bff", "#ef739f"].map((c) => new THREE.Color(c));
    return seeds.map((_, i) => palette[i % palette.length]);
  }, [seeds]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    colors.forEach((c, i) => mesh.setColorAt(i, c));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [colors]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const p = progress.get();
    const t = state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      // Each record collapses a little later than the last, so they stream inwards
      const pull = THREE.MathUtils.smoothstep(p, 0.1 + s.lag, 0.55 + s.lag);
      const r = s.radius * (1 - pull * 0.92);
      const a = s.phase + t * s.speed * (1 + pull * 4);
      dummy.position.set(Math.cos(a) * r, Math.sin(a) * r * Math.sin(s.tilt), Math.sin(a) * r * Math.cos(s.tilt));
      dummy.rotation.set(a, a * 0.7, 0);
      dummy.scale.setScalar(s.size * (1 - pull * 0.7) * 10);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, RECORDS]}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial emissiveIntensity={0.6} roughness={0.3} metalness={0.2} toneMapped={false} />
    </instancedMesh>
  );
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
