import type { Card } from '../lib/cards';
import { rankFace, SUIT_NAME, SUIT_SYMBOL } from '../lib/cards';

interface Props {
  card?: Card | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  dim?: boolean;
  deal?: boolean;
  delay?: number;
}

export function PlayingCard({ card, faceDown, size = 'md', highlight, dim, deal, delay = 0 }: Props) {
  const anim = deal ? { animationDelay: `${delay}ms` } : undefined;
  if (faceDown) return <div className={`pcard back ${size} ${deal ? 'deal' : ''}`} style={anim} aria-label="Face-down card" />;
  if (!card) return <div className={`pcard empty ${size}`} aria-hidden />;
  const red = card.suit === 'h' || card.suit === 'd';
  const cls = ['pcard', size, red ? 'red' : '', `suit-${card.suit}`, highlight ? 'hl' : '', dim ? 'dim' : '', deal ? 'deal' : '']
    .filter(Boolean)
    .join(' ');
  const face = rankFace(card.rank);
  return (
    <div className={cls} style={anim} role="img" aria-label={`${face === 'T' ? '10' : face} of ${SUIT_NAME[card.suit]}`}>
      <div className="corner">
        <span>{face}</span>
        <span className="s">{SUIT_SYMBOL[card.suit]}</span>
      </div>
      <div className="pip">{SUIT_SYMBOL[card.suit]}</div>
    </div>
  );
}

interface RowProps {
  cards: (Card | null)[];
  size?: 'sm' | 'md' | 'lg';
  overlap?: boolean;
  center?: boolean;
  highlight?: (c: Card) => boolean;
  dim?: (c: Card) => boolean;
  hideIndex?: number;
  deal?: boolean;
}

export function CardRow({ cards, size = 'md', overlap, center, highlight, dim, hideIndex, deal }: RowProps) {
  return (
    <div className={`cards ${overlap ? 'overlap' : ''} ${center ? 'center' : ''}`}>
      {cards.map((c, i) => (
        <PlayingCard
          key={c ? `${c.rank}${c.suit}${i}` : `e${i}`}
          card={c}
          size={size}
          faceDown={i === hideIndex}
          highlight={!!c && !!highlight?.(c)}
          dim={!!c && !!dim?.(c)}
          deal={deal}
          delay={i * 90}
        />
      ))}
    </div>
  );
}
