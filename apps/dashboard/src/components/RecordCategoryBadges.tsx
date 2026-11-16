'use client'

import { EmojiIcon } from '@/components/Icon/emoji-icons'
import { getRecordCategories } from '@/lib/records'
import {
  type AnimalRecord,
  record_category_colors,
  record_category_icons,
  record_category_labels,
} from '@/types/animals'

interface RecordCategoryBadgesProps {
  record: Pick<AnimalRecord, 'category' | 'categories'>
  className?: string
}

/** Muestra todas las categorías de un registro como insignias. */
export default function RecordCategoryBadges({
  record,
  className = 'px-2 py-0.5',
}: RecordCategoryBadgesProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {getRecordCategories(record).map((category) => (
        <span
          key={category}
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full text-xs font-medium ${className} ${record_category_colors[category]}`}
        >
          <EmojiIcon emoji={record_category_icons[category]} />
          {record_category_labels[category]}
        </span>
      ))}
    </span>
  )
}
