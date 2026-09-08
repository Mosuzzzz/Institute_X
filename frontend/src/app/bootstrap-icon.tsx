type BootstrapIconProps = {
  name: string;
  className?: string;
  label?: string;
};

export default function BootstrapIcon({ name, className = '', label }: BootstrapIconProps) {
  return (
    <i
      className={`bi bi-${name} ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
