import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "./Button";
import { cn } from "../../utils/cn";

// Filter row above a table. `children` = the fields themselves (each one an
// Input/Select with its own label). `actions` sits on the far right
// (export, bulk actions). `onClear` adds the standard "Clear" ghost button.
export default function FilterBar({ children, onClear, actions, className }) {
  const { t } = useTranslation();

  return (
    <div className={cn("mb-4 flex flex-wrap items-end gap-3", className)}>
      {children}
      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X size={16} />
          {t("common.clear")}
        </Button>
      )}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
