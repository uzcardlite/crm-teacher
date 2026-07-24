// Backend returns this exact detail from require_module() when a tenant's tariff
// has the module disabled. Such 403s are an expected state, not a user error.
export const MODULE_DISABLED_DETAIL = "Bu modul sizning tarifingizda yoqilmagan";

export function isModuleDisabledError(error) {
  return (
    error?.response?.status === 403 &&
    error.response.data?.detail === MODULE_DISABLED_DETAIL
  );
}

// FastAPI 422 bodies carry `detail: [{ loc: ["body", "field"], msg }]`. This maps
// them onto form field names so the modal can keep the data and show the error
// under the offending input instead of only firing a toast.
export function getFieldErrors(error) {
  const detail = error?.response?.data?.detail;
  if (error?.response?.status !== 422 || !Array.isArray(detail)) return {};

  const fields = {};
  for (const item of detail) {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    const field = loc.filter((part) => typeof part === "string" && part !== "body").pop();
    if (field && item?.msg && !fields[field]) {
      fields[field] = item.msg;
    }
  }
  return fields;
}

export function getErrorMessage(error, fallback = "Xatolik yuz berdi, qayta urinib ko'ring") {
  if (!error?.response) {
    return "Internet aloqasi yo'q yoki server javob bermayapti. Qayta urinib ko'ring.";
  }

  const { status, data } = error.response;

  if (status >= 500) {
    return "Serverda xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.";
  }

  const detail = data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") return first;
    if (first?.msg) return first.msg;
  }

  return fallback;
}
