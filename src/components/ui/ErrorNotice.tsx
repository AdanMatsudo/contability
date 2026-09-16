interface ErrorNoticeProps {
  message: string;
  code?: string;
  tone?: "error" | "warning";
  className?: string;
}

// Every failure the screen shows goes through here: a plain sentence plus the
// code, so the cause can be found in the server log without guessing.
export function ErrorNotice({ message, code, tone = "error", className }: ErrorNoticeProps) {
  const palette =
    tone === "warning"
      ? "bg-[#fff8e6] text-[#7a5a00] border-[#f2e3b3]"
      : "bg-[#fff4e8] text-[#a14d13] border-[#f5d9c4]";
  return (
    <p
      role="alert"
      className={`flex items-baseline justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${palette} ${className ?? ""}`}
    >
      <span>{message}</span>
      {code && <span className="shrink-0 font-mono text-[11px] opacity-70">[{code}]</span>}
    </p>
  );
}
