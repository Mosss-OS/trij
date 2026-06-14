import { useMemo } from "react";
import { WHOGrowthStandard } from "@/lib/who-standards";

interface Props {
  standards: WHOGrowthStandard[];
  value: number;
  valueType: "weight" | "height";
  ageMonths: number;
  title: string;
}

export function WHOGrowthChart({ standards, value, valueType, ageMonths, title }: Props) {
  const { chartData, childPosition, zScoreLines } = useMemo(() => {
    // Chart dimensions
    const width = 300;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    
    // X-axis range (age in months)
    const maxAge = 60;
    const xScale = (age: number) => padding.left + (age / maxAge) * (width - padding.left - padding.right);
    
    // Y-axis range - calculate based on standards
    const allValues = standards.flatMap(s => [s.M - 3 * s.S, s.M + 3 * s.S]);
    const minY = Math.floor(Math.min(...allValues));
    const maxY = Math.ceil(Math.max(...allValues));
    const yScale = (val: number) => height - padding.bottom - ((val - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);
    
    // Generate chart data points for different Z-scores
    const generateLine = (z: number) => {
      return standards.map(s => {
        const y = s.M + z * s.S;
        return {
          x: xScale(s.ageMonths),
          y: yScale(y)
        };
      });
    };
    
    const zScoreLines = [
      { z: -3, color: "urgency-red", label: "-3 SD" },
      { z: -2, color: "urgency-yellow", label: "-2 SD" },
      { z: -1, color: "amber-500", label: "-1 SD" },
      { z: 0, color: "emerald-500", label: "Median" },
      { z: 1, color: "amber-500", label: "+1 SD" },
      { z: 2, color: "urgency-yellow", label: "+2 SD" },
      { z: 3, color: "urgency-red", label: "+3 SD" },
    ].map(z => ({
      ...z,
      points: generateLine(z.z)
    }));
    
    // Find child's position on the chart
    const childX = xScale(ageMonths);
    const childY = yScale(value);
    
    // Median line for reference
    const medianLine = generateLine(0);
    
    return {
      chartData: { width, height, padding, minY, maxY, maxAge, xScale, yScale },
      childPosition: { x: childX, y: childY },
      zScoreLines,
      medianLine
    };
  }, [standards, value, ageMonths]);
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="rounded-lg border bg-card p-4">
        <svg width={chartData.width} height={chartData.height} className="w-full">
          {/* Background */}
          <rect width={chartData.width} height={chartData.height} fill="transparent" />
          
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <line
              key={ratio}
              x1={chartData.padding.left}
              y1={chartData.padding.top + ratio * (chartData.height - chartData.padding.top - chartData.padding.bottom)}
              x2={chartData.width - chartData.padding.right}
              y2={chartData.padding.top + ratio * (chartData.height - chartData.padding.top - chartData.padding.bottom)}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray="4"
            />
          ))}
          
          {/* Z-score lines */}
          {zScoreLines.map((line, idx) => (
            <polyline
              key={idx}
              points={line.points.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={`var(--${line.color})`}
              strokeWidth={line.z === 0 ? 2 : 1}
              opacity={line.z === 0 ? 1 : 0.6}
            />
          ))}
          
          {/* Child's position */}
          <circle
            cx={childPosition.x}
            cy={childPosition.y}
            r={6}
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={2}
          />
          
          {/* Axes labels */}
          <text x={chartData.width / 2} y={chartData.height - 5} textAnchor="middle" fontSize="10" fill="#64748b">
            Age (months)
          </text>
          
          {/* Y-axis labels */}
          <text x={chartData.padding.left - 5} y={chartData.padding.top} textAnchor="end" fontSize="10" fill="#64748b">
            {chartData.maxY}
          </text>
          <text x={chartData.padding.left - 5} y={chartData.height - chartData.padding.bottom} textAnchor="end" fontSize="10" fill="#64748b">
            {chartData.minY}
          </text>
          
          {/* Legend */}
          <text x={chartData.padding.left + 10} y={chartData.padding.top + 10} fontSize="9" fill="#64748b">
            Red lines: ±3 SD (SAM/obesity)
          </text>
          <text x={chartData.padding.left + 10} y={chartData.padding.top + 22} fontSize="9" fill="#64748b">
            Yellow lines: ±2 SD (MAM/overweight)
          </text>
          <text x={chartData.padding.left + 10} y={chartData.padding.top + 34} fontSize="9" fill="#64748b">
            Green line: Median (0 SD)
          </text>
          
          {/* Child indicator */}
          <text x={childPosition.x + 10} y={childPosition.y} fontSize="10" fill="#ef4444" fontWeight="bold">
            Child: {value.toFixed(1)}
          </text>
        </svg>
      </div>
    </div>
  );
}