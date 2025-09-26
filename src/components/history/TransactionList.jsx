import TransactionItem from './TransactionItem';

export default function TransactionList({
  tarnsactionsFilter,
  isInModal = false,
  isSmallScreen = false,
  isSplitMode = false
}) {
  // Dynamic height based on context
  const getHeightClass = () => {
    if (isInModal) {
      // In modal, use remaining space
      return 'h-full';
    }
    // Standalone page - responsive heights
    if (isSmallScreen) return 'h-[350px]';
    if (isSplitMode) return 'h-[500px]';
    return 'h-[400px] sm:h-[450px] lg:h-[500px]';
  };

  return (
    <div className={`overflow-y-auto ${getHeightClass()}`}>
      {tarnsactionsFilter?.length > 0 ? (
        tarnsactionsFilter.map((transaction, index) => (
          <TransactionItem
            key={index}
            {...transaction}
            isSmallScreen={isSmallScreen}
            isSplitMode={isSplitMode}
          />
        ))
      ) : (
        <div className={`
          text-center text-gray-500 dark:text-gray-400
          ${isSmallScreen ? 'text-xs py-8' : 'text-sm py-12'}
        `}>
          No history available
        </div>
      )}
    </div>
  );
}