export default function Card({ children, className = '' }) {
  return (
    <div style={{ width: 390, height: 600 }} className={`flex flex-col px-6 ${className}`}>
      {children}
    </div>
  );
}