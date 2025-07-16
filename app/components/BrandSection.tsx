import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function BrandSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.set([
        headlineRef.current,
        subheadRef.current,
        bodyRef.current,
        taglineRef.current
      ], {
        filter: 'blur(10px)',
        y: 30,
        opacity: 0,
        willChange: 'filter, transform, opacity',
        force3D: true,
      });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
      tl.to(headlineRef.current, {
        filter: 'blur(0px)',
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
      })
        .to(subheadRef.current, {
          filter: 'blur(0px)',
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
        }, '-=0.4')
        .to(bodyRef.current, {
          filter: 'blur(0px)',
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
        }, '-=0.4')
        .to(taglineRef.current, {
          filter: 'blur(0px)',
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
        }, '-=0.4');
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full bg-[#beb1a1] flex items-center justify-center"
      style={{ minHeight: '40vh' }}
    >
      <div className="max-w-3xl w-full px-6 md:px-0 flex flex-col gap-4 md:gap-6">
        <h2
          ref={headlineRef}
          className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-900 leading-tight uppercase text-left md:text-left"
          style={{ letterSpacing: '0.01em' }}
        >
          SALTY.
        </h2>
        <div
          ref={subheadRef}
          className="text-lg md:text-2xl italic text-neutral-700 font-light text-left md:text-left"
        >
          Rooted in timeless elegance. Inspired by the street.
        </div>
        <p
          ref={bodyRef}
          className="text-base md:text-xl text-neutral-800 font-normal leading-relaxed text-left md:text-left"
          style={{ letterSpacing: '0.02em' }}
        >
          Where old-money refinement meets contemporary streetwear. Minimal essentials and edge pieces designed to last, feel, and evolve with you.
        </p>
        <div
          ref={taglineRef}
          className="text-xs md:text-base text-neutral-500 font-medium tracking-widest mt-2 uppercase text-left md:text-left"
          style={{ letterSpacing: '0.18em' }}
        >
          Designed in Cairo. Worn everywhere.
        </div>
      </div>
    </section>
  );
} 