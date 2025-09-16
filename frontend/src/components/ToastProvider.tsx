import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      richColors
      position="bottom-right"
      toastOptions={{
        className: "shadow-lg shadow-black/40 border border-white/10",
        style: {
          background: "rgba(21, 24, 42, 0.95)",
          color: "#f8fafc",
          backdropFilter: "blur(10px)",
        },
      }}
    />
  );
}
