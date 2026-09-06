import React from "react";

interface TechCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  highlight?: boolean;
}

export const TechCard: React.FC<TechCardProps> = ({
  children,
  className = "",
  onClick,
  highlight = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative bg-[#131A2A] rounded-2xl border transition-all duration-200 ${
        highlight
          ? "border-[#00F2FE]/50 shadow-[0_0_20px_rgba(0,242,254,0.15)]"
          : "border-[#7C5CFC]/20 hover:border-[#7C5CFC]/40 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
      } ${onClick ? "cursor-pointer active:scale-[0.99]" : ""} ${className}`}
    >
      {children}
    </div>
  );
};
