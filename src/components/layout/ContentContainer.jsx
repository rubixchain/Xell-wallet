export default function ContentContainer({ children, className = '' }) {
  return (
    <div style={{ width: 390 }} className={` px-4  w-full ${className}`}>
      {children}
    </div>
  );
}