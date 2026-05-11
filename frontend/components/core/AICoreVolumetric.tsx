'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying float vNoise;
  
  uniform float uTime;
  
  // Simplex-like noise for surface displacement
  float noise3D(vec3 p) {
    float n = sin(p.x * 12.9898 + p.y * 78.233 + p.z * 45.164) * 43758.5453;
    return fract(n) * 2.0 - 1.0;
  }
  
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
      value += amplitude * noise3D(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vec3 pos = position;
    float displacement = fbm(pos * 3.0 + uTime * 0.3) * 0.08;
    pos += normal * displacement;
    
    vNormal = normalize(normalMatrix * normal);
    vPosition = pos;
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    vNoise = displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying float vNoise;
  
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uState;
  
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    fresnel = pow(fresnel, 2.5);
    
    // Core glow (inner brightness)
    float coreGlow = 0.3 + fresnel * 0.7;
    
    // Energy pulse
    float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
    float energyBoost = mix(0.0, pulse * 0.3, uEnergy);
    
    // Noise edge detail
    float edgeDetail = abs(vNoise) * 3.0;
    
    // Combine
    float alpha = coreGlow + energyBoost + edgeDetail * 0.15;
    alpha = clamp(alpha, 0.0, 1.0);
    
    // Color gradient from center to edge
    vec3 innerColor = uColor * 1.5;
    vec3 outerColor = uColor * 0.3;
    vec3 color = mix(innerColor, outerColor, fresnel);
    
    // Add bright rim
    float rim = pow(1.0 - fresnel, 3.0) * 0.4;
    color += uColor * rim;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

function ShaderCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#00F0FF') },
    uEnergy: { value: 0.5 },
    uState: { value: 0.0 },
  }), []);

  useFrame((_state, delta) => {
    uniforms.uTime.value += delta;

    if (materialRef.current) {
      materialRef.current.uniforms.uEnergy.value =
        0.3 + Math.sin(uniforms.uTime.value * 1.5) * 0.15;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
      meshRef.current.rotation.x += delta * 0.04;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function OrbitalRing({ radius = 1.4, speed = 0.3, color = '#00F0FF', opacity = 0.4 }: {
  radius?: number; speed?: number; color?: string; opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * speed;
      ref.current.rotation.z += delta * speed * 0.7;
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.015, 16, 120]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function ParticleCloud() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.6 + Math.random() * 0.8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = Math.random() * 0.04 + 0.008;
    }
    return { positions: pos, sizes: sz };
  }, []);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.08;
      ref.current.rotation.x += delta * 0.03;
    }
  });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [positions, sizes]);

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#00F0FF"
        size={0.03}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

interface Props {
  state?: 'idle' | 'thinking' | 'speaking' | 'executing';
  size?: number;
}

export default function AICoreVolumetric({ state = 'idle', size = 300 }: Props) {
  const stateColors: Record<string, string> = {
    idle: '#00F0FF',
    thinking: '#1E90FF',
    speaking: '#00FFD1',
    executing: '#FF6B35',
  };

  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <ShaderCore />
        <OrbitalRing radius={1.25} speed={0.4} color={stateColors[state]} opacity={0.5} />
        <OrbitalRing radius={1.4} speed={-0.25} color={stateColors[state]} opacity={0.3} />
        <OrbitalRing radius={1.55} speed={0.18} color={stateColors[state]} opacity={0.15} />
        <ParticleCloud />
        <pointLight color={stateColors[state]} intensity={2} distance={6} decay={2} />
      </Canvas>
    </div>
  );
}
