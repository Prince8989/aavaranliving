"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Motif } from "@/components/ui/Motif";

type Img = { url: string; alt: string; kind: "GALLERY" | "TEXTURE" | "ROOM" };

const KIND_LABEL = { GALLERY: "Product", TEXTURE: "Texture detail", ROOM: "In the room" } as const;

export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const [origin, setOrigin] = useState("50% 50%");
  const [zoomed, setZoomed] = useState(false);
  const lightbox = useRef<HTMLDialogElement>(null);

  if (images.length === 0) {
    return <Motif className="aspect-[3/4] w-full" seed={1} label={`${name} — photography forthcoming`} />;
  }
  const current = images[active];

  return (
    <div className="flex min-w-0 flex-col-reverse gap-4 lg:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto lg:w-20 lg:flex-col" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}: ${KIND_LABEL[img.kind]}`}
                aria-current={i === active}
                className={`relative block h-24 w-20 shrink-0 overflow-hidden border ${i === active ? "border-obsidian" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex-1">
        <button
          type="button"
          className="relative block aspect-[3/4] w-full cursor-zoom-in overflow-hidden bg-sandstone"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => setZoomed(false)}
          onClick={() => lightbox.current?.showModal()}
          aria-label="Open full-screen image"
        >
          <Image
            src={current.url}
            alt={current.alt}
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover transition-transform duration-500 ease-luxe"
            style={{ transformOrigin: origin, transform: zoomed ? "scale(1.8)" : "scale(1)" }}
          />
          <span className="label absolute bottom-3 left-3 bg-ivory/90 px-2 py-1 text-[0.6rem] text-walnut">{KIND_LABEL[current.kind]}</span>
        </button>
      </div>

      <dialog
        ref={lightbox}
        aria-label={`${name} image`}
        className="h-[100dvh] max-h-none w-screen max-w-none bg-obsidian p-0 backdrop:bg-obsidian"
        onClick={(e) => e.target === e.currentTarget && lightbox.current?.close()}
      >
        <button type="button" onClick={() => lightbox.current?.close()} className="absolute right-4 top-4 z-10 p-3 text-3xl text-ivory" aria-label="Close">
          ×
        </button>
        <div className="relative h-full w-full">
          <Image src={current.url} alt={current.alt} fill sizes="100vw" className="object-contain" />
        </div>
      </dialog>
    </div>
  );
}
