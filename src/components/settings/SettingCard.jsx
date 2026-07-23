export default function SettingCard({ children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-md border border-gray-200 dark:border-gray-700">
      {children}
    </div>
  );
}