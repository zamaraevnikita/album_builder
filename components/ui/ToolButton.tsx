import React from 'react';

type ToolButtonProps = {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  tooltip?: string;
  disabled?: boolean;
  variant?: 'ghost' | 'solid';
};

export const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  active,
  onClick,
  tooltip,
  disabled,
  variant = 'ghost',
}) => {
  const baseClasses =
    'p-2 rounded-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';
  const solidClasses = active
    ? 'bg-monolith-black text-white shadow-md'
    : 'bg-white text-gray-700 hover:text-black shadow-sm hover:shadow-md';
  const ghostClasses = active
    ? 'bg-white text-monolith-black shadow-sm'
    : 'text-current hover:bg-white/20';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`${baseClasses} ${variant === 'solid' ? solidClasses : ghostClasses}`}
    >
      {icon}
    </button>
  );
};