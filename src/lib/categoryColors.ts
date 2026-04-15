const colorMap: Record<string, string> = {};
const palette = [
  'bg-toy-blue text-primary-foreground',
  'bg-toy-red text-primary-foreground',
  'bg-toy-green text-primary-foreground',
  'bg-toy-purple text-primary-foreground',
  'bg-toy-orange text-primary-foreground',
  'bg-toy-pink text-primary-foreground',
  'bg-toy-teal text-primary-foreground',
  'bg-toy-yellow text-secondary-foreground',
];

let index = 0;

export function getCategoryColor(category: string): string {
  if (!colorMap[category]) {
    colorMap[category] = palette[index % palette.length];
    index++;
  }
  return colorMap[category];
}
