import { memo, useState, useCallback } from "react";

interface CollapsiblePanelProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string | number | null;
  className?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

function CollapsiblePanel({
  title,
  defaultOpen = false,
  badge,
  className,
  headerExtra,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <div
      className={`panel collapsible-panel ${open ? "collapsible-panel--open" : ""} ${className || ""}`}
    >
      <div className="panel-header collapsible-panel__header" onClick={toggle}>
        <span className="collapsible-panel__toggle">{open ? "▾" : "▸"}</span>
        <span className="collapsible-panel__title">{title}</span>
        {badge != null && (
          <span className="collapsible-panel__badge">{badge}</span>
        )}
        {headerExtra && (
          <span
            className="collapsible-panel__extra"
            onClick={(e) => e.stopPropagation()}
          >
            {headerExtra}
          </span>
        )}
      </div>
      {open && <div className="panel-body">{children}</div>}
    </div>
  );
}

export default memo(CollapsiblePanel);
