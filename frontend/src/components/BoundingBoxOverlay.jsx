import React from 'react';

/**
 * Draws bounding boxes over a preview image using an SVG whose viewBox matches
 * the original image's natural pixel dimensions, so coordinates never need
 * manual rescaling to the rendered <img> size.
 *
 * @param {Object} props
 * @param {Array<{bbox:[number,number,number,number], name?:string, similarity?:number, matched:boolean}>} props.faces
 * @param {{w:number,h:number}} props.imageDims - Natural (original) image dimensions.
 * @param {string} [props.matchColor] - Stroke/fill color for matched faces (default cyan).
 * @param {string} [props.unknownColor] - Stroke/fill color for unmatched faces (default red).
 */
export default function BoundingBoxOverlay({ faces, imageDims, matchColor = '#06b6d4', unknownColor = '#f87171' }) {
  if (!faces?.length || !imageDims?.w) return null;

  return (
    <svg
      viewBox={`0 0 ${imageDims.w} ${imageDims.h}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="glow-match" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-unknown" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {faces.map((face, idx) => {
        const [x1, y1, x2, y2] = face.bbox;
        const width = Math.max(x2 - x1, 0);
        const height = Math.max(y2 - y1, 0);
        const isMatch = face.matched;
        const boxColor = isMatch ? matchColor : unknownColor;
        const glowFilter = isMatch ? 'url(#glow-match)' : 'url(#glow-unknown)';
        const label = isMatch ? face.name || 'Match' : 'Unknown';
        const simScore =
          typeof face.similarity === 'number' ? ` (${(face.similarity * 100).toFixed(0)}%)` : '';
        const labelHeight = Math.max(imageDims.h * 0.035, 28);
        const fontSize = Math.max(imageDims.h * 0.02, 14);

        return (
          <g key={idx}>
            <rect
              x={x1}
              y={y1}
              width={width}
              height={height}
              fill="none"
              stroke={boxColor}
              strokeWidth={Math.max(imageDims.w * 0.003, 2)}
              rx={Math.max(imageDims.w * 0.005, 4)}
              filter={glowFilter}
            />
            <rect
              x={x1}
              y={Math.max(y1 - labelHeight, 0)}
              width={Math.max(width, 90)}
              height={labelHeight}
              fill={boxColor}
              rx={Math.max(imageDims.w * 0.005, 4)}
              opacity="0.85"
            />
            <text
              x={x1 + 10}
              y={Math.max(y1 - labelHeight, 0) + labelHeight * 0.7}
              fill="#ffffff"
              fontSize={fontSize}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="600"
            >
              {label}
              {simScore}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
