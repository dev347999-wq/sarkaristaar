"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadFull } from "tsparticles";

export default function ParticleBackground() {
  const [init, setInit] = useState(false);
  const pathname = usePathname();

  // this should be run only once per application lifetime
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      // you can initiate the tsParticles instance (engine) here, adding custom shapes or presets
      // this loads the tsparticles package bundle, it's the easiest method for getting everything ready
      // starting from v2 you can add only the features you need reducing the bundle size
      await loadFull(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) return null;
  
  // Hide on test player route
  if (pathname?.startsWith('/mock-tests/') && pathname !== '/mock-tests') {
     return null;
  }

  return (
    <Particles
      id="tsparticles"
      options={{
        background: { color: { value: "transparent" } },
        fullScreen: { enable: true, zIndex: -1 },
        particles: {
          number: { value: 30 },
          color: { value: ["#f97316", "#22c55e"] }, // Sarkari Star Orange and Green
          move: {
            enable: true,
            speed: 0.5,
            direction: "none",
            outModes: { default: "bounce" }
          },
          links: {
            enable: false
          },
          size: {
            value: 3
          }
        },
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "repulse"
            }
          },
          modes: {
            repulse: {
              distance: 100,
              duration: 0.4
            }
          }
        }
      }}
    />
  );
}