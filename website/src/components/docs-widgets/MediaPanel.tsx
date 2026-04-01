import React from "react";

type MediaPanelProps = {
  src: string;
  alt: string;
  width?: number | string;
};

const MediaPanel = ({ src, alt, width = "100%" }: MediaPanelProps) => (
  <div className="my-6 w-full">
    <div
      className="w-full rounded-2xl p-5"
      style={{
        background: "linear-gradient(180deg, #15161a 0%, #0f1013 100%)",
        border: "1px solid #2b2d2f",
        boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: typeof width === "number" ? `${width}px` : width }}
        className="mx-auto block max-w-full rounded-xl"
      />
    </div>
  </div>
);

export default MediaPanel;
