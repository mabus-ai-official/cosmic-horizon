import { useRef, useEffect, useState } from "react";
import type { TerminalLine } from "../hooks/useGameState";

interface NotificationLogProps {
  lines: TerminalLine[];
  onClear: () => void;
}

const PREFIX_MAP: Record<string, { icon: string; cls: string }> = {
  error: { icon: "[!]", cls: "log-prefix--error" },
  warning: { icon: "[⚠]", cls: "log-prefix--warning" },
  info: { icon: "[i]", cls: "log-prefix--info" },
  success: { icon: "[✓]", cls: "log-prefix--success" },
  system: { icon: "[★]", cls: "log-prefix--system" },
  combat: { icon: "[⚔]", cls: "log-prefix--combat" },
  trade: { icon: "[$]", cls: "log-prefix--trade" },
  npc: { icon: "[>]", cls: "log-prefix--npc" },
  ai: { icon: "[◈]", cls: "log-prefix--ai" },
};

function renderLine(line: TerminalLine) {
  const prefix = PREFIX_MAP[line.type] || PREFIX_MAP.info;
  const prefixDur = 5 + (line.id % 5) * 2;
  const prefixDelay = (line.id * 1.3) % 8;
  return (
    <div key={line.id} className={`log-line log-line--${line.type}`}>
      <span
        className={`log-prefix ${prefix.cls} log-prefix--animated`}
        style={
          {
            "--prefix-dur": `${prefixDur}s`,
            "--prefix-delay": `${prefixDelay}s`,
          } as React.CSSProperties
        }
      >
        {prefix.icon}
      </span>
      {line.text}
    </div>
  );
}

export default function NotificationLog({
  lines,
  onClear,
}: NotificationLogProps) {
  const [expanded, setExpanded] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines, expanded]);

  const visibleLines = expanded ? lines : lines.slice(-1);

  return (
    <div
      className={`notification-bar${expanded ? " notification-bar--expanded" : ""}`}
    >
      <div className="notification-bar__header">
        <button
          className="notification-bar__toggle"
          onClick={() => setExpanded((e) => !e)}
          title={expanded ? "Collapse log" : "Expand log"}
        >
          [{expanded ? "-" : "+"}]
        </button>
        <span className="notification-bar__label">LOG</span>
        <button className="log-clear-btn" onClick={onClear}>
          CLEAR
        </button>
      </div>
      <div className="notification-bar__lines" ref={outputRef}>
        {visibleLines.map(renderLine)}
      </div>
    </div>
  );
}
