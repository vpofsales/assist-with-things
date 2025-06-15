
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  text?: string;
}

const FUN_FACTS = [
  "A group of flamingos is called a 'flamboyance'.",
  "The national animal of Scotland is the unicorn.",
  "Honey never spoils.",
  "A single cloud can weigh more than 1 million pounds.",
  "Octopuses have three hearts.",
  "Bananas are berries, but strawberries aren't."
];

const LoadingIndicator = ({ text = "Working, hang tight..." }: LoadingIndicatorProps) => {
  const randomFact = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];

  return (
    <div className="h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto h-12 w-12 text-indigo-400" />
        <p className="mt-4 text-xl font-semibold tracking-wide">{text}</p>
        <p className="mt-2 text-base text-gray-400">{randomFact}</p>
      </div>
    </div>
  );
};

export default LoadingIndicator;
