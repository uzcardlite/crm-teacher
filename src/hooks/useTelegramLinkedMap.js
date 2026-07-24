import { useEffect, useState } from "react";
import { listParents } from "../api/parents";
import { toast } from "../components/ui/Toast";
import { useTenantModules } from "../context/TenantModulesContext";
import { getErrorMessage } from "../utils/apiError";

export function useTelegramLinkedMap() {
  const { hasModule } = useTenantModules();
  const enabled = hasModule("telegram_bot");
  const [map, setMap] = useState({});

  useEffect(() => {
    if (!enabled) return;
    listParents({ page: 1, size: 100 })
      .then((data) => {
        const next = {};
        data.items.forEach((p) => {
          if (p.telegram_linked) {
            next[p.student_id] = true;
          } else if (next[p.student_id] === undefined) {
            next[p.student_id] = false;
          }
        });
        setMap(next);
      })
      .catch((error) => toast.error(getErrorMessage(error, "Bot holatini yuklab bo'lmadi")));
  }, [enabled]);

  return { telegramLinkedMap: map, telegramBotEnabled: enabled };
}
