import { pastelize } from '@/lib/colors';
import type { Category } from '@/types';

interface Props {
  title: string;
  category: Category;
}

export function EventChip({ title, category }: Props) {
  return (
    <div
      className="text-xs px-1.5 py-0.5 rounded truncate"
      style={{
        backgroundColor: pastelize(category.color),
        color: '#111827',
        borderLeft: `3px solid ${category.color}`
      }}
      title={title}
    >
      {title}
    </div>
  );
}
