type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  color?: BadgeColor; // Badge color
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium";

  // Define size styles
  const sizeStyles = {
    sm: "text-theme-xs", // Smaller padding and font size
    md: "text-sm", // Default padding and font size
  };

  // Define color styles for variants
  const variants = {
    light: {
      primary:
        "bg-admin-brand-50 text-admin-brand-500 dark:bg-admin-brand-500/15 dark:text-admin-brand-400",
      success:
        "bg-admin-success-50 text-admin-success-600 dark:bg-admin-success-500/15 dark:text-admin-success-500",
      error:
        "bg-admin-error-50 text-admin-error-600 dark:bg-admin-error-500/15 dark:text-admin-error-500",
      warning:
        "bg-admin-warning-50 text-admin-warning-600 dark:bg-admin-warning-500/15 dark:text-orange-400",
      info: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500",
      light: "bg-admin-gray-100 text-admin-gray-700 dark:bg-white/5 dark:text-white/80",
      dark: "bg-admin-gray-500 text-white dark:bg-white/5 dark:text-white",
    },
    solid: {
      primary: "bg-admin-brand-500 text-white dark:text-white",
      success: "bg-admin-success-500 text-white dark:text-white",
      error: "bg-admin-error-500 text-white dark:text-white",
      warning: "bg-admin-warning-500 text-white dark:text-white",
      info: "bg-blue-light-500 text-white dark:text-white",
      light: "bg-admin-gray-400 dark:bg-white/5 text-white dark:text-white/80",
      dark: "bg-admin-gray-700 text-white dark:text-white",
    },
  };

  // Get styles based on size and color variant
  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
