import BackButton from './BackButton';

export default function RecoveryPhraseHeader() {
  return (
    <>
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your Recovery Phrase
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Write down these 12 words in order and store them securely
        </p>
      </div>
    </>
  );
}