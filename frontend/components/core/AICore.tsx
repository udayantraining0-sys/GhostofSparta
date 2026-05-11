'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function AICoreMesh({ state = 'idle' }: { state?: 'idle' | 'thinking' | 'speaking' | 'executing' }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const stateColors: Record<string, string> = {
    idle: '#00F0FF',
    thinking: '#1E90FF',
    speaking: '#00FFD1',
    executing: '#FF6B35',
  };

  const color = stateColors[state] || stateColors.idle;

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 200;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.8 + Math.random() * 0.4;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = Math.random() * 0.03 + 0.01;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geometry;
  }, []);

  useFrame((_state3d, delta) => {
    const rotSpeed = state === 'speaking' ? 0.5 : state === 'thinking' ? 0.25 : 0.15;
    const ringSpeed = state === 'speaking' ? 1.2 : state === 'thinking' ? 0.6 : 0.3;

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotSpeed;
      meshRef.current.rotation.x += delta * 0.05;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= delta * rotSpeed * 0.6;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * ringSpeed;
      ringRef.current.rotation.y += delta * ringSpeed * 1.5;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x -= delta * ringSpeed * 1.3;
      ring2Ref.current.rotation.z += delta * ringSpeed;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * rotSpeed * 0.6;
    }

    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      const speakingPulse = state === 'speaking'
        ? 1.3 + Math.sin(Date.now() * 0.015) * 0.4
        : 1.5;
      if (material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = speakingPulse;
      }
    }
  });

  return (
    <group>
      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.15, 64, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={state === 'speaking' ? 0.15 : 0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Energy ring 1 */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.35, 0.02, 16, 100]} />
        <meshBasicMaterial color={color} transparent opacity={state === 'speaking' ? 0.8 : 0.6} />
      </mesh>

      {/* Energy ring 2 */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.5, 0.015, 16, 100]} />
        <meshBasicMaterial color={color} transparent opacity={state === 'speaking' ? 0.5 : 0.3} />
      </mesh>

      {/* Orbiting particles */}
      <points ref={particlesRef}>
        <primitive object={particleGeometry} />
        <pointsMaterial
          color={color}
          size={0.03}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Point light */}
      <pointLight color={color} intensity={3} distance={8} decay={2} />
    </group>
  );
}

interface AICoreProps {
  state?: 'idle' | 'thinking' | 'speaking' | 'executing';
}

export default function AICore({ state = 'idle' }: AICoreProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <AICoreMesh state={state} />
      </Canvas>
    </div>
  );
}
