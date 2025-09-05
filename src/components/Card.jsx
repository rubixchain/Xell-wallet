export default function Card({ children, className = '' }) {
  return (
    <div style={{ width: 390, height: 600 }} className={` px-6   ${className}`}>
      {/* <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors"> */}
      {children}
      {/* </div> */}
    </div>
  );
}