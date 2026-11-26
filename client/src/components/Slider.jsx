import { useEffect, useState } from 'react';

const SLIDES = [
  { src: '/slides/slide-1.svg', alt: 'Shorthand dictation practice at 80 to 120 WPM' },
  { src: '/slides/slide-2.svg', alt: 'Instant colour-coded result analysis' },
  { src: '/slides/slide-3.svg', alt: 'English and Hindi typing tests' },
];

export default function Slider({ interval = 4500 }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), interval);
    return () => clearInterval(t);
  }, [paused, interval]);

  return (
    <div className="slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
      <div className="slider__track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {SLIDES.map((s, i) => (
          <figure className="slider__slide" key={s.src} aria-hidden={i !== idx}>
            <img src={s.src} alt={s.alt} />
          </figure>
        ))}
      </div>
      <div className="slider__dots">
        {SLIDES.map((s, i) => (
          <button key={s.src} type="button" aria-label={`Show slide ${i + 1}`} className={i === idx ? 'is-active' : ''} onClick={() => setIdx(i)} />
        ))}
      </div>
    </div>
  );
}
