import React from "react";

interface PillBadgeProps {
  label: string;
  variant?: "primary" | "cyan" | "orange" | "neutral" | "success" | "warning";
  className?: string;
}

export const PillBadge: React.FC<PillBadgeProps> = ({
  label,
  variant = "neutral",
  className = "",
}) => {
  const variantStyles = {
    primary: "bg-[#7C5CFC]/15 text-[#A58FFF] border-[#7C5CFC]/30",
    cyan: "bg-[#00F2FE]/15 text-[#00F2FE] border-[#00F2FE]/30",
    orange: "bg-[#FF9100]/15 text-[#FFB74D] border-[#FF9100]/30",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    neutral: "bg-slate-800/80 text-slate-300 border-slate-700/50",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${variantStyles[variant]} ${className}`}
    >
      {label}
    </span>
  );
};
