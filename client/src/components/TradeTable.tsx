import { useState, useEffect } from 'react';
import { getOutpost } from '../services/api';
import CollapsiblePanel from './CollapsiblePanel';
import PixelSprite from './PixelSprite';

interface TradeTableProps {
  outpostId: string | null;
  onBuy: (outpostId: string, commodity: string, quantity: number) => void;
  onSell: (outpostId: string, commodity: string, quantity: number) => void;
  bare?: boolean;
}

interface OutpostData {
  outpostId: string;
  name: string;
  treasury: number;
  prices: Record<string, {
    price: number;
    stock: number;
    capacity: number;
    mode: string;
  }>;
}

export default function TradeTable({ outpostId, onBuy, onSell, bare }: TradeTableProps) {
  const [data, setData] = useState<OutpostData | null>(null);
  const [qty, setQty] = useState(10);

  useEffect(() => {
    if (!outpostId) { setData(null); return; }
    getOutpost(outpostId).then(res => setData(res.data)).catch(() => setData(null));
  }, [outpostId]);

  if (!data) {
    const empty = <div>Dock at an outpost to trade</div>;
    if (bare) return <div className="panel-content">{empty}</div>;
    return <CollapsiblePanel title="TRADE">{empty}</CollapsiblePanel>;
  }

  const content = (
    <>
      <table className="trade-table">
        <thead>
          <tr>
            <th>Commodity</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Mode</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.prices).map(([commodity, info]) => (
            <tr key={commodity}>
              <td className="commodity-name"><span className="commodity-cell"><PixelSprite spriteKey={`commodity_${commodity}`} size={14} />{commodity}</span></td>
              <td className="text-trade">{info.price} cr</td>
              <td>{info.stock}/{info.capacity}</td>
              <td className={info.mode === 'buy' ? 'text-success' : info.mode === 'sell' ? 'text-combat' : ''}>
                {info.mode === 'buy' ? 'Buying' : info.mode === 'sell' ? 'Selling' : info.mode}
              </td>
              <td>
                {info.mode === 'sell' && (
                  <button className="btn-sm btn-buy" onClick={() => onBuy(data.outpostId, commodity, qty)}>
                    Buy
                  </button>
                )}
                {info.mode === 'buy' && (
                  <button className="btn-sm btn-sell" onClick={() => onSell(data.outpostId, commodity, qty)}>
                    Sell
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="trade-controls">
        <label>Qty:</label>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="qty-input"
        />
      </div>
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <CollapsiblePanel title={`TRADE - ${data.name}`}>{content}</CollapsiblePanel>;
}
