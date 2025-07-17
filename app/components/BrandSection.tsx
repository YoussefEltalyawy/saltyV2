import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function BrandSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<(HTMLDivElement | null)[]>([]);

  const storyLines = [
    { text: "SALTY.", type: "title", size: "text-4xl md:text-6xl", weight: "font-semibold", spacing: "tracking-tight" },
    { text: "Rooted in timeless elegance. Inspired by the street.", type: "subtitle", size: "text-base md:text-lg", weight: "font-normal", spacing: "tracking-normal" },
    { text: "Where old-money refinement meets contemporary streetwear.", type: "body", size: "text-base md:text-lg", weight: "font-normal", spacing: "tracking-normal" },
    { text: "Minimal essentials and edge pieces designed to last, feel, and evolve with you.", type: "body", size: "text-base md:text-lg", weight: "font-normal", spacing: "tracking-normal" },
    { text: "DESIGNED IN CAIRO. WORN EVERYWHERE.", type: "tagline", size: "text-xs md:text-sm", weight: "font-normal", spacing: "tracking-widest" }
  ];

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Set initial state for all lines
      linesRef.current.forEach((line) => {
        if (line) {
          gsap.set(line, {
            opacity: 0.3,
            y: 20,
            filter: 'blur(2px)',
            willChange: 'opacity, transform, filter',
            force3D: true,
          });
        }
      });

      // Create scroll-triggered animations for each line
      linesRef.current.forEach((line, index) => {
        if (line) {
          ScrollTrigger.create({
            trigger: line,
            start: 'top 85%',
            end: 'bottom 60%',
            onEnter: () => {
              gsap.to(line, {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.8,
                ease: 'power2.out',
              });
            },
            onLeave: () => {
              gsap.to(line, {
                opacity: 0.6,
                duration: 0.4,
                ease: 'power2.out',
              });
            },
            onEnterBack: () => {
              gsap.to(line, {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.6,
                ease: 'power2.out',
              });
            },
            onLeaveBack: () => {
              gsap.to(line, {
                opacity: 0.3,
                duration: 0.4,
                ease: 'power2.out',
              });
            },
          });
        }
      });

      // Background parallax effect
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          if (sectionRef.current) {
            const progress = self.progress;
            const yPos = progress * 50;
            gsap.set(sectionRef.current, {
              backgroundPosition: `center ${50 + yPos}%`,
            });
          }
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const getLineStyles = (line: typeof storyLines[0], index: number) => {
    const baseClasses = `${line.size} ${line.weight} ${line.spacing} transition-all duration-300`;

    switch (line.type) {
      case 'title':
        return `${baseClasses} text-neutral-900 uppercase mb-3 md:mb-4`;
      case 'subtitle':
        return `${baseClasses} text-neutral-700 italic mb-3 md:mb-4`;
      case 'body':
        return `${baseClasses} text-neutral-800 leading-relaxed mb-2 md:mb-3`;
      case 'emphasis':
        return `${baseClasses} text-neutral-900 italic mb-3 md:mb-4`;
      case 'tagline':
        return `${baseClasses} text-neutral-600 uppercase mt-4 md:mt-6`;
      default:
        return baseClasses;
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-gradient-to-br from-[#c4b5a0] via-[#beb1a1] to-[#b8ab9c] overflow-hidden"
      style={{
        minHeight: '60vh',
        backgroundSize: '120% 120%',
        backgroundPosition: 'center 50%'
      }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 border border-neutral-400 rotate-45"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 border border-neutral-400 rotate-12"></div>
        <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-neutral-600 rounded-full"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-neutral-600 rounded-full"></div>
      </div>

      {/* Main content */}
      <div className="relative flex items-center justify-center min-h-full py-20 md:py-32">
        <div
          ref={contentRef}
          className="max-w-4xl w-full px-8 md:px-12 flex flex-col items-start text-left"
        >
          {storyLines.slice(0, -1).map((line, index) => (
            <div
              key={index}
              ref={(el) => (linesRef.current[index] = el)}
              className={getLineStyles(line, index)}
              style={{
                letterSpacing: line.type === 'title' ? '0.02em' : '0.01em'
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#beb1a1] to-transparent"></div>

      {/* Tagline at bottom */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center px-2 md:px-4 z-10">
        <div
          ref={(el) => (linesRef.current[storyLines.length - 1] = el)}
          className={`${getLineStyles(storyLines[storyLines.length - 1], storyLines.length - 1)} text-center whitespace-nowrap`}
          style={{
            letterSpacing: '0.2em'
          }}
        >
          {storyLines[storyLines.length - 1].text}
        </div>
      </div>
    </section>
  );
} 