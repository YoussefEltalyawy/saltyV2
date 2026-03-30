import React, { useState, useEffect } from 'react';

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    // Initial calculation in case SSR difference
    setTimeLeft(calculateTimeLeft(targetDate));

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  function calculateTimeLeft(target: string) {
    const difference = +new Date(target) - +new Date();
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  // Prevent hydration mismatch by returning a placeholder or identical output before mount
  // However, simple local state is okay. The first render uses calculateTimeLeft which might differ from client.
  // Actually, since targetDate is passed, it might be same for both. But let's just use a standard render.

  return (
    <div className="flex gap-4 md:gap-6 items-baseline text-white" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="flex items-baseline gap-1">
        <span className="text-xl md:text-2xl font-bold">{formatNumber(timeLeft.days)}</span>
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-80">Days</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl md:text-2xl font-bold">{formatNumber(timeLeft.hours)}</span>
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-80">Hours</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl md:text-2xl font-bold">{formatNumber(timeLeft.minutes)}</span>
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-80">Minutes</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl md:text-2xl font-bold">{formatNumber(timeLeft.seconds)}</span>
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider opacity-80">Seconds</span>
      </div>
    </div>
  );
}
