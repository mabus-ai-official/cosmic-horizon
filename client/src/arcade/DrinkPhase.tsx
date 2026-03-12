import { useState, useEffect } from "react";

interface DrinkPhaseProps {
  menu: { id: string; name: string; flavorText: string }[];
  timeLimit: number;
  round: number;
  onSelect: (drinkId: string) => void;
}

export default function DrinkPhase({
  menu,
  timeLimit,
  round,
  onSelect,
}: DrinkPhaseProps) {
  const [timer, setTimer] = useState(timeLimit);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          // Auto-select first drink if none chosen
          if (!selected) {
            onSelect(menu[0]?.id || "nebula_fizz");
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [menu, onSelect, selected]);

  const handleSelect = (drinkId: string) => {
    if (selected) return;
    setSelected(drinkId);
    onSelect(drinkId);
  };

  return (
    <div className="arcade-drinks">
      <div className="arcade-drinks__header">
        <div className="arcade-drinks__title">BETWEEN ROUNDS</div>
        <div className="arcade-drinks__round">Round {round} complete</div>
        <div className="arcade-drinks__timer">{timer}s</div>
      </div>

      <div className="arcade-drinks__waiter">
        <div className="arcade-drinks__waiter-text">
          "What'll it be, pilot? Something to sharpen those reflexes?"
        </div>
      </div>

      <div className="arcade-drinks__menu">
        {menu.map((drink) => (
          <button
            key={drink.id}
            className={`arcade-drinks__item ${
              selected === drink.id ? "arcade-drinks__item--selected" : ""
            } ${selected && selected !== drink.id ? "arcade-drinks__item--disabled" : ""}`}
            onClick={() => handleSelect(drink.id)}
            disabled={!!selected}
          >
            <div className="arcade-drinks__item-name">{drink.name}</div>
            <div className="arcade-drinks__item-flavor">{drink.flavorText}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="arcade-drinks__chosen">
          Drink ordered. Preparing next round...
        </div>
      )}
    </div>
  );
}
