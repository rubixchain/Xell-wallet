import TransactionItem from './TransactionItem';

export default function TransactionList({ tarnsactionsFilter }) {
  return (
    <div className=" overflow-y-auto h-[400px]">
      {tarnsactionsFilter?.length > 0 ? tarnsactionsFilter.map((transaction, index) => (
        <TransactionItem key={index} {...transaction} />
      )) : <div className='text-center text-sm text-gray-500'>No history available</div>}
    </div>
  );
}