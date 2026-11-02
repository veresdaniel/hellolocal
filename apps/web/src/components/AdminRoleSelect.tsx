import type { MouseEvent } from "react";

type AdminRoleOption = {
  value: string;
  label: string;
};

type AdminRoleSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: AdminRoleOption[];
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLSelectElement>) => void;
};

export function AdminRoleSelect({
  value,
  onChange,
  options,
  disabled,
  onClick,
}: AdminRoleSelectProps) {
  return (
    <select
      className="admin-role-select"
      data-role={value}
      value={value}
      disabled={disabled}
      onClick={onClick}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
