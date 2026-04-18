"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

interface DecadeData {
  decade: number;
  missing_count: number;
}

interface TimelineData {
  year: number;
  count: number;
}

// ── Animated decade bar chart ─────────────────────────────────────────────────

export function DecadeChart({ data }: { data: DecadeData[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const max = Math.max(...data.map((d) => d.missing_count));

  const getColor = (decade: number) => {
    if (decade < 1940)
      return {
        bar: "bg-amber-300",
        text: "text-amber-700",
        label: "Colonial ancien",
      };
    if (decade < 1977)
      return {
        bar: "bg-amber-400",
        text: "text-amber-800",
        label: "Colonial tardif",
      };
    if (decade < 1990)
      return {
        bar: "bg-violet-400",
        text: "text-violet-700",
        label: "Post-indép.",
      };
    return { bar: "bg-[#1A3A5C]/60", text: "text-[#1A3A5C]", label: "Moderne" };
  };

  return (
    <div ref={ref} className="space-y-2.5">
      {data.map((d, i) => {
        const pct = Math.round((d.missing_count / max) * 100);
        const { bar, text } = getColor(d.decade);
        return (
          <div key={d.decade} className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#555] w-14 shrink-0 tabular-nums text-right">
              {d.decade}s
            </span>
            <div className="flex-1 h-7 bg-black/[0.03] rounded-lg overflow-hidden relative">
              <motion.div
                className={`h-full ${bar} rounded-lg flex items-center`}
                initial={{ width: 0 }}
                animate={inView ? { width: `${pct}%` } : { width: 0 }}
                transition={{
                  duration: 0.9,
                  delay: i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {pct > 20 && (
                  <span className="text-[11px] text-white font-semibold pl-3 tabular-nums">
                    {d.missing_count.toLocaleString("fr-FR")}
                  </span>
                )}
              </motion.div>
              {pct <= 20 && (
                <span
                  className={`absolute left-[${pct}%] top-1/2 -translate-y-1/2 ml-2 text-[11px] font-semibold ${text} tabular-nums`}
                  style={{ left: `${pct}%`, marginLeft: 8 }}
                >
                  {d.missing_count.toLocaleString("fr-FR")}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-3 border-t border-black/[0.05]">
        {[
          { color: "bg-amber-300", label: "Période coloniale" },
          { color: "bg-violet-400", label: "Post-indépendance" },
          { color: "bg-[#1A3A5C]/60", label: "Période moderne" },
        ].map((l) => (
          <span
            key={l.label}
            className="flex items-center gap-1.5 text-xs text-[#888]"
          >
            <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Animated KPI counter ──────────────────────────────────────────────────────

export function AnimatedKPI({
  value,
  label,
  sublabel,
  icon,
  color,
  barPct,
}: {
  value: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  barPct?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white border border-black/[0.07] rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-medium text-[#888] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-3xl font-semibold text-[#111] tabular-nums">
        {value.toLocaleString("fr-FR")}
      </p>
      <p className="text-xs text-[#AAA] mt-1">{sublabel}</p>
      {barPct !== undefined && (
        <div className="mt-3 h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${color}`}
            initial={{ width: 0 }}
            animate={inView ? { width: `${barPct}%` } : {}}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Publication timeline sparkline ────────────────────────────────────────────

export function TimelineSpark({ data }: { data: TimelineData[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  if (!data.length) return null;

  const W = 600;
  const H = 72;
  const max = Math.max(...data.map((d) => d.count));

  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W;
    const y = H - Math.round((d.count / max) * H * 0.9) - 4;
    return [x, y] as [number, number];
  });

  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M0,${H} ` +
    pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") +
    ` L${W},${H} Z`;

  const idx1977 = data.findIndex((d) => d.year === 1977);
  const x1977 =
    idx1977 >= 0 ? (idx1977 / Math.max(data.length - 1, 1)) * W : null;

  const labelYears = [
    data[0],
    data[Math.floor(data.length * 0.33)],
    data[Math.floor(data.length * 0.66)],
    data[data.length - 1],
  ].filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 72 }}>
        <defs>
          <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#sg)"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={inView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* 1977 marker */}
        {x1977 !== null && (
          <g>
            <motion.line
              x1={x1977}
              y1={0}
              x2={x1977}
              y2={H}
              stroke="#FCD34D"
              strokeWidth="1"
              strokeDasharray="3,3"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 0.8 } : {}}
              transition={{ delay: 1.5 }}
            />
            <motion.text
              x={x1977 + 4}
              y={14}
              fontSize="9"
              fill="#FCD34D"
              fontFamily="monospace"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 0.9 } : {}}
              transition={{ delay: 1.6 }}
            >
              Indépendance
            </motion.text>
          </g>
        )}
      </svg>

      {/* Year labels */}
      <div className="flex justify-between mt-1">
        {labelYears.map((d) => (
          <span key={d.year} className="text-[10px] text-white/30 tabular-nums">
            {d.year}
          </span>
        ))}
      </div>
    </div>
  );
}
