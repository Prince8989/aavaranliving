import { cache } from "react";
import { db } from "@/lib/db";

/** Default brand copy (from the AAVARAN brief). Admins can override each block in /admin/content. */
export const DEFAULT_CONTENT = {
  announcement: { text: "Indian Craftsmanship · Worldwide Enquiries Welcome" },
  hero: {
    eyebrow: "आवरण · The Art of Belonging",
    headline: "Where Heritage Finds Home.",
    subheading:
      "An exceptional collection of carpets inspired by India's artistic legacy, thoughtfully curated for the spaces we call our own.",
  },
  philosophy: {
    headline: "Not Simply Made for a Room. Made to Belong.",
    body: [
      "In India, the art of creating beauty for the home has been passed down through generations. Through patterns, textures, colours, and the skilled hands of artisans, everyday objects have become expressions of culture, memory, and belonging.",
      "AAVARAN takes its name from the Sanskrit word आवरण, meaning a covering or an enveloping layer. To us, it represents something deeper: the warmth that makes a space feel personal, the textures that invite us to slow down, and the artistry that turns a house into a home.",
    ],
  },
  craft: {
    headline: "A Story in Every Fibre.",
    body: "A carpet's character is decided long before it reaches a room — in the choice of fibre, the way it is spun and dyed, and the technique used to bring a design to life.",
  },
  bespoke: {
    headline: "A Space as Individual as You Are.",
    body: "Share the dimensions of your room, the colours you live with and the feeling you want to create. We'll explore a carpet made for it.",
  },
  story: {
    paragraphs: [
      "In India, the art of creating beauty for the home has been passed down through generations.",
      "Through patterns, textures, colours, and the skilled hands of artisans, everyday objects have become expressions of culture, memory, and belonging.",
      "AAVARAN takes its name from the Sanskrit word आवरण, meaning a covering or an enveloping layer.",
      "To us, it represents something deeper: the warmth that makes a space feel personal, the textures that invite us to slow down, and the artistry that turns a house into a home.",
      "We believe a beautiful carpet does more than complete a room. It brings together the elements of a space, creating a foundation for conversations, celebrations, quiet mornings, and memories yet to be made.",
      "Inspired by India's rich textile traditions, AAVARAN brings heritage and contemporary design into conversation.",
      "Born from Indian roots and created for homes across the world, AAVARAN is a celebration of beauty that belongs.",
    ],
  },
} as const;

export type ContentKey = keyof typeof DEFAULT_CONTENT;

export const getContent = cache(async <K extends ContentKey>(key: K): Promise<(typeof DEFAULT_CONTENT)[K]> => {
  try {
    const row = await db.contentBlock.findUnique({ where: { key } });
    if (row?.value && typeof row.value === "object") {
      return { ...DEFAULT_CONTENT[key], ...(row.value as object) } as (typeof DEFAULT_CONTENT)[K];
    }
  } catch {
    /* fall back to defaults */
  }
  return DEFAULT_CONTENT[key];
});
