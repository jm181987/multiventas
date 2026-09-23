import { Star } from 'lucide-react';

export function ReviewStars({
  rating,
  size = 'sm',
  showValue = false,
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}) {
  const className = size === 'lg' ? 'size-6' : size === 'md' ? 'size-5' : 'size-4';

  return (
    <span className="inline-flex items-center gap-1" aria-label={rating.toFixed(1) + ' de 5 estrellas'}>
      <span className="inline-flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = rating >= index + 0.5;
          return <Star key={index} className={className + ' ' + (filled ? 'fill-current' : 'text-slate-300')} />;
        })}
      </span>
      {showValue && <span className="ml-1 font-bold text-foreground">{rating.toFixed(1)}</span>}
    </span>
  );
}
