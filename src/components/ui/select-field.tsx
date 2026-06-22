import { cn } from "@/lib/utils";

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function SelectField({ label, className, id, children, ...props }: SelectFieldProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
