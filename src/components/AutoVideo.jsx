import { useEffect, useRef } from "react";

// Muted looping video, no controls, plays only while visible.
export default function AutoVideo({ src }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  const box = "block aspect-[4/3] w-full bg-[#222] object-cover";
  if (!src) return <div className={`${box} grid place-items-center text-[0.9rem] text-[#aaa]`}>No footage yet</div>;

  return <video ref={ref} className={box} src={src} muted loop playsInline preload="metadata" disablePictureInPicture />;
}
