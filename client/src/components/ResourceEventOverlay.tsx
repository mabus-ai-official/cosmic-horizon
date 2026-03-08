import { useEffect } from "react";

interface ResourceEventOverlayProps {
  events: Array<{ type: string; id?: string }>;
  onInvestigate: () => void;
  onDismiss: () => void;
}

const EVENT_INFO: Record<string, { label: string; description: string }> = {
  asteroid_field: {
    label: "Asteroid Field Detected",
    description:
      "Rich mineral deposits drift through this sector. Harvestable resources await.",
  },
  derelict: {
    label: "Derelict Vessel Found",
    description:
      "An abandoned ship floats silently nearby. Salvage may yield valuable cargo.",
  },
  anomaly: {
    label: "Spatial Anomaly Detected",
    description:
      "Strange energy readings emanate from an unstable region of space.",
  },
  alien_cache: {
    label: "Alien Cache Located",
    description:
      "A guarded alien structure has been detected. Valuable technology may lie within.",
  },
};

export default function ResourceEventOverlay({
  events,
  onInvestigate,
  onDismiss,
}: ResourceEventOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (events.length === 0) return null;

  return (
    <div className="resource-event-overlay" onClick={onDismiss}>
      <div
        className="resource-event-overlay__content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="resource-event-overlay__burst" />
        <div className="resource-event-overlay__header">DISCOVERY</div>
        <div className="resource-event-overlay__events">
          {events.map((ev, i) => {
            const info = EVENT_INFO[ev.type] ?? {
              label: ev.type.replace(/_/g, " ").toUpperCase(),
              description:
                "Something unusual has been detected in this sector.",
            };
            return (
              <div key={ev.id ?? i} className="resource-event-overlay__event">
                <div
                  className={`resource-event-overlay__label resource-event-overlay__label--${ev.type}`}
                >
                  {info.label}
                </div>
                <div className="resource-event-overlay__desc">
                  {info.description}
                </div>
              </div>
            );
          })}
        </div>
        <button className="resource-event-overlay__btn" onClick={onInvestigate}>
          INVESTIGATE
        </button>
        <div className="resource-event-overlay__hint">
          Click backdrop to dismiss
        </div>
      </div>
    </div>
  );
}
