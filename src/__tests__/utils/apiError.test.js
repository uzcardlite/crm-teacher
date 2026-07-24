import { describe, expect, it } from "vitest";
import {
  getErrorMessage,
  getFieldErrors,
  isModuleDisabledError,
  MODULE_DISABLED_DETAIL,
} from "../../utils/apiError";

describe("isModuleDisabledError", () => {
  it("is true only for a 403 carrying the exact module-disabled detail", () => {
    expect(
      isModuleDisabledError({
        response: { status: 403, data: { detail: MODULE_DISABLED_DETAIL } },
      }),
    ).toBe(true);
  });

  it("is false for a 403 with a different detail", () => {
    expect(
      isModuleDisabledError({
        response: { status: 403, data: { detail: "Ruxsat yo'q" } },
      }),
    ).toBe(false);
  });

  it("is false for a non-403 status and for a missing response", () => {
    expect(
      isModuleDisabledError({
        response: { status: 404, data: { detail: MODULE_DISABLED_DETAIL } },
      }),
    ).toBe(false);
    expect(isModuleDisabledError({})).toBe(false);
    expect(isModuleDisabledError(null)).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("reports no connection when there is no response at all (network error)", () => {
    expect(getErrorMessage({})).toBe(
      "Internet aloqasi yo'q yoki server javob bermayapti. Qayta urinib ko'ring.",
    );
  });

  it("reports a generic server error for any 5xx", () => {
    expect(getErrorMessage({ response: { status: 500, data: {} } })).toBe(
      "Serverda xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.",
    );
    expect(getErrorMessage({ response: { status: 503, data: {} } })).toBe(
      "Serverda xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.",
    );
  });

  it("surfaces a string detail verbatim", () => {
    expect(
      getErrorMessage({ response: { status: 400, data: { detail: "Telefon band" } } }),
    ).toBe("Telefon band");
  });

  it("ignores a blank string detail and falls back", () => {
    expect(
      getErrorMessage({ response: { status: 400, data: { detail: "   " } } }, "fallback"),
    ).toBe("fallback");
  });

  it("takes the first message out of a FastAPI 422 detail array", () => {
    expect(
      getErrorMessage({
        response: {
          status: 422,
          data: { detail: [{ loc: ["body", "full_name"], msg: "Ismini kiriting" }] },
        },
      }),
    ).toBe("Ismini kiriting");
  });

  it("accepts a detail array of plain strings", () => {
    expect(
      getErrorMessage({ response: { status: 422, data: { detail: ["Xatolik"] } } }),
    ).toBe("Xatolik");
  });

  it("falls back when the detail array is empty", () => {
    expect(
      getErrorMessage({ response: { status: 422, data: { detail: [] } } }, "fallback"),
    ).toBe("fallback");
  });

  it("uses the caller-provided fallback text, defaulting when none is given", () => {
    expect(getErrorMessage({ response: { status: 400, data: {} } })).toBe(
      "Xatolik yuz berdi, qayta urinib ko'ring",
    );
    expect(getErrorMessage({ response: { status: 400, data: {} } }, "Custom")).toBe(
      "Custom",
    );
  });
});

describe("getFieldErrors", () => {
  it("returns an empty object when the status isn't 422", () => {
    expect(
      getFieldErrors({ response: { status: 400, data: { detail: [] } } }),
    ).toEqual({});
  });

  it("returns an empty object when detail isn't an array", () => {
    expect(
      getFieldErrors({ response: { status: 422, data: { detail: "oops" } } }),
    ).toEqual({});
  });

  it("maps loc paths to field names, dropping the leading 'body' segment", () => {
    expect(
      getFieldErrors({
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ["body", "full_name"], msg: "Ismini kiriting" },
              { loc: ["body", "filial_id"], msg: "Filialni tanlang" },
            ],
          },
        },
      }),
    ).toEqual({ full_name: "Ismini kiriting", filial_id: "Filialni tanlang" });
  });

  it("keeps only the first message per field when duplicates are present", () => {
    expect(
      getFieldErrors({
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ["body", "phone"], msg: "First error" },
              { loc: ["body", "phone"], msg: "Second error" },
            ],
          },
        },
      }),
    ).toEqual({ phone: "First error" });
  });

  it("skips entries missing a usable loc or msg", () => {
    expect(
      getFieldErrors({
        response: {
          status: 422,
          data: { detail: [{ loc: [], msg: "no field" }, { loc: ["body", "x"] }] },
        },
      }),
    ).toEqual({});
  });
});
