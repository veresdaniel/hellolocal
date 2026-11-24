import { AdminAutocomplete } from "./AdminAutocomplete";

type AdminRoleOption = {
  value: string;
  label: string;
};

type AdminRoleSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: AdminRoleOption[];
  disabled?: boolean;
};

export function AdminRoleSelect({ value, onChange, options, disabled }: AdminRoleSelectProps) {
  return (
    <AdminAutocomplete
      className="admin-role-select"
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      fullWidth={false}
      style={{ minWidth: 160 }}
      inputStyle={{ padding: "8px 12px", minHeight: 40 }}
    />
  );
}
