import { Toaster } from "react-hot-toast";
import tailwindConfig from "../../../tailwind.config.js";

const colors = tailwindConfig.theme.extend.colors;

export default function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "8px",
          background: colors.sidebar.DEFAULT,
          color: colors.sidebar.text,
          fontSize: "14px",
        },
        success: {
          iconTheme: { primary: colors.success.DEFAULT, secondary: colors.success.bg },
        },
        error: {
          iconTheme: { primary: colors.danger.DEFAULT, secondary: colors.danger.bg },
        },
      }}
    />
  );
}

export { toast } from "react-hot-toast";
