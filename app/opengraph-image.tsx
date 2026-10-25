import { ImageResponse } from "next/og";

export const alt = "AAVARAN — The Art of Belonging";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#241C18",
          color: "#F6F0E7",
          border: "24px solid #241C18",
          outline: "2px solid #B89B70",
        }}
      >
        <div style={{ fontSize: 104, letterSpacing: 28, fontFamily: "serif" }}>AAVARAN</div>
        <div style={{ marginTop: 24, fontSize: 34, color: "#B89B70", fontFamily: "serif" }}>The Art of Belonging.</div>
        <div style={{ marginTop: 36, fontSize: 20, letterSpacing: 6, color: "#E7D7C1" }}>A HOUSE OF MATRIKAVA GLOBAL</div>
      </div>
    ),
    size
  );
}
