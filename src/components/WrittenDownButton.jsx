import Button from './Button';

export default function WrittenDownButton({ onClick }) {
  return (
    <Button 
      onClick={onClick}
      className="mt-6"
    >
      I've Written It Down
    </Button>
  );
}