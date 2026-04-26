/**
 * TemplateThumb — inline SVG mock thumbnail for a template card.
 *
 * Drawing the thumbnail in SVG (rather than rendering the live template
 * scaled-down) keeps the gallery cheap to mount and visually consistent
 * across screen sizes.
 */

"use client";

import type { TemplateId } from "@/types/resume";
import { TEMPLATES_BY_ID } from "@/templates/registry";

export function TemplateThumb({ id }: { id: TemplateId }) {
  const meta = TEMPLATES_BY_ID[id];
  const { primary, bg } = meta.swatch;

  // Each template gets a different SVG layout sketch.
  switch (id) {
    case "scratch":
      return <ScratchThumb primary={primary} bg={bg} />;
    case "berlin":
      return <BerlinThumb primary={primary} bg={bg} />;
    case "helsinki":
      return <HelsinkiThumb primary={primary} bg={bg} />;
    case "tokyo":
      return <TokyoThumb primary={primary} bg={bg} />;
    case "oslo":
      return <OsloThumb primary={primary} bg={bg} />;
    case "madrid":
      return <MadridThumb primary={primary} bg={bg} />;
    case "reykjavik":
      return <ReykjavikThumb primary={primary} bg={bg} />;
    case "aurora":
      return <AuroraThumb primary={primary} bg={bg} />;
  }
}

interface ThumbProps {
  primary: string;
  bg: string;
}

const Frame = ({
  bg,
  children,
}: {
  bg: string;
  children: React.ReactNode;
}) => (
  <svg viewBox="0 0 120 160" className="block h-full w-full">
    <rect width="120" height="160" fill={bg} />
    {children}
  </svg>
);

const Line = ({
  x,
  y,
  w,
  h = 2,
  fill = "#cbd5e1",
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  fill?: string;
  opacity?: number;
}) => (
  <rect x={x} y={y} width={w} height={h} rx={1} fill={fill} opacity={opacity} />
);

function ScratchThumb({ primary, bg }: ThumbProps) {
  return (
    <Frame bg={bg}>
      <Line x={10} y={12} w={50} h={4} fill={primary} />
      <Line x={10} y={20} w={70} h={2} />
      {[34, 42, 50, 58, 66, 74, 82, 90, 98, 106, 114, 122, 130, 138].map((y) => (
        <Line key={y} x={10} y={y} w={100} h={2} />
      ))}
    </Frame>
  );
}

function BerlinThumb({ primary, bg }: ThumbProps) {
  return (
    <Frame bg={bg}>
      <rect x={0} y={0} width={40} height={160} fill={primary} opacity={0.08} />
      <rect x={0} y={0} width={3} height={160} fill={primary} />
      <circle cx={20} cy={20} r={8} fill={primary} opacity={0.3} />
      <Line x={6} y={36} w={28} h={3} fill={primary} />
      {[44, 50, 56].map((y) => (
        <Line key={y} x={6} y={y} w={28} />
      ))}
      <Line x={6} y={70} w={20} h={2} fill={primary} />
      {[78, 84, 90, 96].map((y) => (
        <Line key={y} x={6} y={y} w={28} />
      ))}
      <Line x={50} y={20} w={50} h={3} fill={primary} />
      <Line x={50} y={28} w={30} h={2} />
      {[44, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124, 132, 140].map((y) => (
        <Line key={y} x={50} y={y} w={60} />
      ))}
    </Frame>
  );
}

function HelsinkiThumb({ primary, bg }: ThumbProps) {
  return (
    <Frame bg={bg}>
      <Line x={14} y={16} w={50} h={4} fill={primary} />
      <Line x={14} y={24} w={40} h={2} />
      <line x1={14} y1={32} x2={106} y2={32} stroke="#cbd5e1" strokeWidth={1} />
      {[40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144].map(
        (y) => (
          <Line key={y} x={14} y={y} w={92} />
        ),
      )}
    </Frame>
  );
}

function TokyoThumb({ primary, bg }: ThumbProps) {
  return (
    <Frame bg={bg}>
      <Line x={10} y={14} w={70} h={4} fill={primary} />
      <Line x={10} y={22} w={50} h={2} />
      <line x1={10} y1={30} x2={110} y2={30} stroke={primary} strokeWidth={1.5} />
      {[40, 48, 56, 64].map((y) => (
        <Line key={y} x={10} y={y} w={45} />
      ))}
      {[40, 48, 56, 64].map((y) => (
        <Line key={`r${y}`} x={62} y={y} w={48} />
      ))}
      <Line x={10} y={78} w={20} h={2.5} fill={primary} />
      <Line x={62} y={78} w={20} h={2.5} fill={primary} />
      {[88, 96, 104, 112, 120, 128].map((y) => (
        <Line key={y} x={10} y={y} w={45} />
      ))}
      {[88, 96, 104, 112, 120, 128].map((y) => (
        <Line key={`r${y}`} x={62} y={y} w={48} />
      ))}
    </Frame>
  );
}

function OsloThumb({ primary, bg }: ThumbProps) {
  return (
    <Frame bg={bg}>
      <Line x={30} y={14} w={60} h={5} fill={primary} />
      <Line x={40} y={24} w={40} h={2} />
      <line x1={30} y1={36} x2={90} y2={36} stroke="#94a3b8" strokeWidth={1} />
      {[44, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124, 132, 140].map((y) => (
        <Line key={y} x={14} y={y} w={92} />
      ))}
    </Frame>
  );
}

function MadridThumb({ primary, bg }: ThumbProps) {
  return (
    <Frame bg={bg}>
      <rect x={0} y={0} width={120} height={36} fill={primary} />
      <Line x={10} y={12} w={50} h={4} fill="#ffffff" />
      <Line x={10} y={22} w={40} h={2} fill="#ffffff" />
      {[48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144].map((y) => (
        <Line key={y} x={10} y={y} w={100} />
      ))}
    </Frame>
  );
}

function AuroraThumb({ primary, bg }: ThumbProps) {
  return (
    <Frame bg={bg}>
      <circle cx={100} cy={20} r={9} fill={primary} opacity={0.22} />
      <Line x={10} y={14} w={50} h={5} fill={primary} />
      <Line x={10} y={24} w={36} h={2} fill={primary} />
      <line x1={10} y1={32} x2={110} y2={32} stroke={primary} opacity={0.4} strokeWidth={0.6} />
      <rect x={10} y={42} width={40} height={2} fill={primary} opacity={0.7} />
      {[58, 64, 70].map((y, i) => (
        <rect key={i} x={10} y={y} width={36} height={2} rx={1} fill={primary} opacity={0.45} />
      ))}
      <rect x={10} y={86} width={40} height={2} fill={primary} opacity={0.7} />
      {[10, 28, 18, 32, 22, 26].map((w, i) => (
        <rect key={i} x={10 + (i % 3) * 14} y={94 + Math.floor(i / 3) * 6} width={w * 0.4} height={3} rx={1.5} fill={primary} opacity={0.35} />
      ))}
      <Line x={56} y={48} w={50} h={3} fill={primary} opacity={0.85} />
      {[56, 64, 72, 80, 88, 96, 104, 112].map((y) => (
        <Line key={y} x={56} y={y} w={50} h={2} fill={primary} opacity={0.25} />
      ))}
      {/* "CV" watermark */}
      <text
        x={10}
        y={150}
        fontFamily="Inter, sans-serif"
        fontSize="14"
        fontWeight="800"
        fill={primary}
        opacity={0.85}
      >
        CV
      </text>
    </Frame>
  );
}

function ReykjavikThumb({ primary, bg }: ThumbProps) {
  return (
    <Frame bg={bg}>
      <Line x={14} y={16} w={50} h={4} fill={primary} />
      <Line x={14} y={24} w={40} h={2} />
      <circle cx={16} cy={42} r={1.5} fill={primary} />
      <Line x={22} y={40} w={20} h={3} fill={primary} />
      {[50, 58, 66, 74].map((y) => (
        <Line key={y} x={14} y={y} w={92} />
      ))}
      <circle cx={16} cy={88} r={1.5} fill={primary} />
      <Line x={22} y={86} w={24} h={3} fill={primary} />
      {[96, 104, 112, 120, 128, 136].map((y) => (
        <Line key={y} x={14} y={y} w={92} />
      ))}
    </Frame>
  );
}
