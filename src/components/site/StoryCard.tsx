import Image from 'next/image'
import Link from 'next/link'

import BookmarkButton from '@/components/site/BookmarkButton'
import type { SiteCard } from '@/lib/site/home'

type StoryCardProps = {
  card: SiteCard
  locale: 'en' | 'am'
  itemType?: 'story' | 'destination'
  priority?: boolean
}

export default function StoryCard({
  card,
  locale,
  itemType = 'story',
  priority = false,
}: StoryCardProps) {
  const saveLabel =
    itemType === 'destination'
      ? locale === 'am'
        ? 'መዳረሻውን አስቀምጥ'
        : 'Save destination'
      : locale === 'am'
        ? 'ታሪኩን አስቀምጥ'
        : 'Save story'
  const removeLabel =
    itemType === 'destination'
      ? locale === 'am'
        ? 'የተቀመጠውን መዳረሻ አስወግድ'
        : 'Remove saved destination'
      : locale === 'am'
        ? 'የተቀመጠውን ታሪክ አስወግድ'
        : 'Remove saved story'

  const media = (
    <div className="media-frame story-card__frame">
      <Image
        src={card.image.url}
        alt={card.image.alt || card.title}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 24vw, 50vw"
        style={{ objectFit: 'cover' }}
      />
    </div>
  )

  const title = <h3 className="headline story-card__title">{card.title}</h3>

  return (
    <article className="story-card group" data-cat={card.kickerColor ?? 'amber'}>
      <div className="story-card__media">
        {card.href ? (
          <Link href={card.href} tabIndex={-1} aria-hidden="true" className="story-card__media-link">
            {media}
          </Link>
        ) : (
          media
        )}

        <span className="story-card__chip">{card.kicker}</span>

        <BookmarkButton
          itemId={card.id}
          itemType={itemType}
          saveLabel={saveLabel}
          removeLabel={removeLabel}
        />
      </div>

      <div className="story-card__body">
        {card.href ? (
          <Link href={card.href} className="story-card__title-link">
            {title}
          </Link>
        ) : (
          title
        )}
        <p className="deck story-card__excerpt">{card.excerpt}</p>
      </div>
    </article>
  )
}
