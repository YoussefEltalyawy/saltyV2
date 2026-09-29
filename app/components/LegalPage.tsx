import {Fragment, useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router';
import type {RichTextBlock, RichTextSection} from '~/lib/richText';

interface LegalPageProps {
  title: string;
  eyebrow?: string;
  intro?: string;
  blocks: RichTextBlock[];
  sections: RichTextSection[];
  backLink?: {to: string; label: string};
}

/**
 * Breathing room when jumping to a section. The header and announcement bar
 * are fixed, so the real offset is header + announcement + gap; those are
 * published as CSS vars, so read them rather than guessing a pixel value.
 */
const SCROLL_GAP = 24;

function getScrollOffset(): number {
  if (typeof window === 'undefined') return 112;
  const styles = getComputedStyle(document.documentElement);
  const header = parseFloat(styles.getPropertyValue('--header-height')) || 64;
  const announcement =
    parseFloat(styles.getPropertyValue('--announcement-height')) || 0;
  return header + announcement + SCROLL_GAP;
}

export function LegalPage({
  title,
  eyebrow,
  intro,
  blocks,
  sections,
  backLink,
}: LegalPageProps) {
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  const activeId = useActiveSection(sectionIds);
  const progressBarRef = useReadingProgress();

  // Number the top-level sections (01, 02, …) in the editorial header style.
  const sectionNumbers = useMemo(() => {
    const numbers = new Map<number, number>();
    let count = 0;
    blocks.forEach((block, index) => {
      if (block.type === 'heading' && block.level === 2) {
        count += 1;
        numbers.set(index, count);
      }
    });
    return numbers;
  }, [blocks]);

  const hasToc = sections.length > 0;

  const handleJump = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - getScrollOffset();
    window.scrollTo({top, behavior: 'smooth'});
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div className="w-full bg-white">
      {/* Page header band */}
      <section className="border-b border-black/10">
        <div className="mx-auto w-full max-w-6xl px-5 pt-12 pb-12 sm:px-8 sm:pt-16 sm:pb-16">
          <div className="flex flex-col items-center text-center">
            {eyebrow ? (
              <p className="mb-5 text-[11px] font-bold tracking-[0.3em] text-black/35 uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-3xl font-black tracking-tight text-black uppercase sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <div className="my-6 h-1 w-16 bg-black" />
            {intro ? (
              <p className="max-w-xl text-sm font-medium tracking-wide text-black/45 lowercase">
                {intro}
              </p>
            ) : null}
          </div>
        </div>
        {/* Reading progress */}
        <div className="h-px w-full overflow-hidden bg-black/5">
          <div
            ref={progressBarRef}
            className="h-full w-full origin-left bg-black/70 will-change-transform"
            style={{transform: 'scaleX(0)'}}
          />
        </div>
      </section>

      {/* Mobile section list — wraps instead of scrolling so every
          section is visible with proper page padding and no edge-bleed. */}
      {hasToc ? (
        <nav className="border-b border-black/10 lg:hidden">
          <div className="mx-auto w-full max-w-6xl px-5 py-4 sm:px-8">
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(event) => handleJump(event, section.id)}
                  // py-3 keeps the tap target at ~44px, the mobile minimum.
                  className={`flex items-center border px-3.5 py-3 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors ${
                    activeId === section.id
                      ? 'border-black bg-black text-white'
                      : 'border-black/15 text-black/55'
                  }`}
                >
                  {section.text}
                </a>
              ))}
            </div>
          </div>
        </nav>
      ) : null}

      <div className="mx-auto flex w-full max-w-6xl gap-16 px-5 pt-10 pb-20 sm:px-8 sm:pt-14 sm:pb-28">
        {/* On this page */}
        {hasToc ? (
          <aside className="hidden w-60 shrink-0 static lg:block lg:static">
            <div className="sticky top-28">
              <p className="mb-5 text-[11px] font-bold tracking-[0.25em] text-black/35 uppercase">
                On this page
              </p>
              <ul className="border-l border-black/10">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(event) => handleJump(event, section.id)}
                      className={`-ml-px block border-l py-1.5 pl-4 text-[13px] leading-snug transition-colors ${
                        activeId === section.id
                          ? 'border-black font-semibold text-black'
                          : 'border-transparent text-black/45 hover:text-black/80'
                      }`}
                    >
                      {section.text}
                    </a>
                  </li>
                ))}
              </ul>
              {backLink ? (
                <Link
                  to={backLink.to}
                  prefetch="intent"
                  className="mt-8 inline-block text-[11px] font-bold tracking-[0.2em] text-black/40 uppercase transition-colors hover:text-black"
                >
                  ← {backLink.label}
                </Link>
              ) : null}
            </div>
          </aside>
        ) : null}

        {/* Body */}
        <div
          className={`min-w-0 flex-1 ${
            hasToc ? 'max-w-3xl' : 'mx-auto max-w-3xl'
          }`}
        >
          {blocks.length === 0 ? (
            <p className="legal-inline text-base text-black/45">
              This page is empty right now.
            </p>
          ) : null}

          {blocks.map((block, index) => {
            const number = sectionNumbers.get(index);
            return (
              <Fragment key={`${block.type}-${index}`}>
                {number !== undefined && number > 1 ? (
                  <div className="my-12 h-px w-full bg-black/10 sm:my-16" />
                ) : null}
                {renderBlock(block, number)}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderBlock(block: RichTextBlock, number?: number) {
  switch (block.type) {
    case 'heading': {
      if (block.level === 3) {
        return (
          <h3
            id={block.id}
            className="legal-heading mt-10 mb-4 flex items-center gap-3"
          >
            <span aria-hidden className="h-4 w-[2px] shrink-0 bg-[#beb1a1]" />
            <span
              className="text-[13px] font-bold tracking-[0.2em] text-black/60 uppercase"
              dangerouslySetInnerHTML={{__html: block.html}}
            />
          </h3>
        );
      }
      return (
        <h2
          id={block.id}
          className="legal-heading flex items-baseline justify-start gap-4 text-left"
        >
          {number !== undefined ? (
            <span
              aria-hidden
              className="hidden pt-1 text-[11px] font-bold tracking-[0.18em] tabular-nums text-black/25 sm:block"
            >
              {String(number).padStart(2, '0')}
            </span>
          ) : null}
          <span
            className="text-left text-2xl font-black tracking-tight text-black uppercase sm:text-3xl"
            dangerouslySetInnerHTML={{__html: block.html}}
          />
        </h2>
      );
    }

    case 'lead':
      return (
        <p
          className="legal-inline mb-6 max-w-xl text-base tracking-wide text-black/45 sm:text-lg"
          dangerouslySetInnerHTML={{__html: block.html}}
        />
      );

    case 'paragraph':
      return (
        <p
          className="legal-inline mb-5 text-[15px] leading-[1.8] text-black/70 sm:text-base"
          dangerouslySetInnerHTML={{__html: block.html}}
        />
      );

    case 'list':
      return block.ordered ? (
        <ol className="mb-7 space-y-3">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-4">
              <span
                aria-hidden
                className="mt-[0.5em] w-5 shrink-0 text-right text-[11px] font-bold tracking-[0.15em] tabular-nums text-black/35"
              >
                {index + 1}
              </span>
              <span
                className="legal-inline flex-1 text-[15px] leading-[1.8] text-black/70 sm:text-base"
                dangerouslySetInnerHTML={{__html: item}}
              />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mb-7 space-y-3">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-4">
              <span
                aria-hidden
                className="mt-[0.9em] h-px w-4 shrink-0 bg-black/25"
              />
              <span
                className="legal-inline flex-1 text-[15px] leading-[1.8] text-black/70 sm:text-base"
                dangerouslySetInnerHTML={{__html: item}}
              />
            </li>
          ))}
        </ul>
      );

    case 'html':
      return (
        <div
          className="legal-inline legal-html mb-7 text-[15px] leading-[1.8] text-black/70 sm:text-base"
          dangerouslySetInnerHTML={{__html: block.html}}
        />
      );
  }
}

/**
 * Highlights the section currently under the header. `sectionIds` is memoised by
 * the caller so this only re-subscribes when the page actually changes.
 */
function useActiveSection(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(
    sectionIds[0] ?? null,
  );

  useEffect(() => {
    if (!sectionIds.length || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const targets = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // A band just under the header counts as "current". Reads the same CSS
      // vars the layout uses so it stays correct at any header size.
      {
        rootMargin: `-${getScrollOffset()}px 0px -55% 0px`,
        threshold: 0,
      },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

/**
 * Writes scroll progress straight to the DOM via a CSS variable instead of
 * React state. State here would re-render the whole document body on every
 * animation frame while scrolling, which is very costly on mobile.
 */
function useReadingProgress(): React.RefObject<HTMLDivElement> {
  const barRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    const update = () => {
      frame.current = 0;
      const bar = barRef.current;
      if (!bar) return;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio =
        scrollable > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollable))
          : 0;
      bar.style.transform = `scaleX(${ratio})`;
    };

    const schedule = () => {
      if (!frame.current) frame.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return barRef;
}
