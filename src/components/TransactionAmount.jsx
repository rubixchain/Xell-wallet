import { FiChevronDown } from 'react-icons/fi';

const fmt = (n) => parseFloat(parseFloat(n).toFixed(3));

const toList = (assets, amount, symbol, fallbackSymbol) =>
  Array.isArray(assets) && assets.length
    ? assets
    : [{ symbol: symbol || fallbackSymbol, amount }];

// Received -> credited (green); anything else -> debited (red).
const isCredit = (type) => type === 'Received';
const amountColor = (type) => (isCredit(type) ? 'text-emerald-600' : 'text-red-500');

// True when a transaction moved more than one asset (so the row should render
// the expandable breakdown below it).
export const hasMultipleAssets = (assets, amount, symbol, fallbackSymbol) =>
  toList(assets, amount, symbol, fallbackSymbol).length > 1;

// Summary line shown in the row's amount column. Amount is coloured by
// direction (green credit / red debit).
// - Single asset    -> "<amount> <symbol>".
// - Multiple assets -> "<amount> <symbol> + more" with a chevron that toggles
//   the breakdown panel (TransactionAssets, rendered below the row).
export function TransactionAmount({ assets, amount, symbol, fallbackSymbol, type, expanded, onToggle }) {
  const list = toList(assets, amount, symbol, fallbackSymbol);
  const color = amountColor(type);

  if (list.length <= 1) {
    const a = list[0] || {};
    return (
      <div className={`font-semibold text-xl flex items-baseline justify-end gap-1 max-w-[180px] ml-auto ${color}`}>
        <span className="shrink-0">{fmt(a.amount)}</span>
        <span title={a.symbol} className="truncate">{a.symbol}</span>
      </div>
    );
  }

  const first = list[0];
  return (
    <button
      type="button"
      onClick={onToggle}
      className="ml-auto max-w-[200px] font-semibold text-xl flex items-baseline justify-end gap-1"
    >
      <span className={`shrink-0 ${color}`}>{fmt(first.amount)}</span>
      <span title={first.symbol} className={`truncate max-w-[80px] ${color}`}>{first.symbol}</span>
      <span className="text-sm font-medium text-gray-400 shrink-0">+ more</span>
      <FiChevronDown
        className={`w-4 h-4 shrink-0 self-center text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

// Per-asset breakdown, rendered below the row when expanded. Each asset is a
// box showing its full name (neutral) alongside its colour-coded amount. Boxes
// wrap naturally (flex-wrap): each grows to fit its own name (never truncated),
// capped to the panel width so a very long name wraps inside its box instead of
// overflowing. The min-width + panel max-width mean a row holds up to three
// short-name boxes, but fewer (down to one) when a wide name needs the room.
// Returns null for single-asset transactions.
export function TransactionAssets({ assets, amount, symbol, fallbackSymbol, type }) {
  const list = toList(assets, amount, symbol, fallbackSymbol);
  if (list.length <= 1) return null;

  const color = amountColor(type);

  return (
    <div className="mt-2 rounded-lg bg-[#E5E5E540] dark:bg-gray-700/40 p-3 flex justify-center">
      <div className="flex flex-wrap justify-center gap-2 max-w-[500px]">
        {list.map((a, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-3 min-w-[140px] max-w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-base shadow-md hover:shadow-lg transition-shadow"
          >
            <span className="font-medium text-gray-600 dark:text-gray-300 break-words min-w-0">
              {a.symbol}
            </span>
            <span className={`font-semibold shrink-0 ${color}`}>
              {fmt(a.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
