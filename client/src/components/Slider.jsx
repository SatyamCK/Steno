import { useEffect, useState } from 'react';

const SLIDES = [
  { src: '/slides/slide-1.svg', caption: 'Practise shorthand dictation at 80 – 120 WPM' },
  { src: '/slides/slide-2.svg', caption: 'Instant, colour-coded mistake analysis' },
  { src: '/slides/slide-3.svg', caption: 'English & Hindi typing tests' },
];

export default function Slider({ interval = 4000 }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), interval);
    return () => clearInterval(t);
  }, [paused, interval]);

  return (
    <div className="slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="slider__track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {SLIDES.map((s) => (
          <figure className="slider__slide" key={s.src}>
            <img src={s.src} alt={s.caption} />
            <figcaption>{s.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="slider__dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            aria-label={`Slide ${i + 1}`}
            className={i === idx ? 'is-active' : ''}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}
