import { render } from '@testing-library/react'
import {
  animal_icon,
  animal_stage_config,
  animal_status_icons,
  expense_category_icons,
  record_category_icons,
  record_event_type_icons,
  record_type_icons,
} from '@mi-granja/shared'
import {
  EmojiIcon,
  getEmojiIcon,
  IconLabel,
  splitLeadingEmoji,
  stripLeadingEmoji,
} from '@/components/Icon/emoji-icons'

describe('emoji-icons', () => {
  it('separa el emoji inicial del texto', () => {
    expect(splitLeadingEmoji('🐄 Animales')).toEqual({ emoji: '🐄', text: 'Animales' })
    expect(splitLeadingEmoji('⚖️ Peso')).toEqual({ emoji: '⚖️', text: 'Peso' })
    expect(splitLeadingEmoji('Etapas')).toEqual({ emoji: null, text: 'Etapas' })
    expect(stripLeadingEmoji('📍 Áreas')).toBe('Áreas')
    expect(splitLeadingEmoji('👨‍🌾 Cuidador')).toEqual({ emoji: '👨‍🌾', text: 'Cuidador' })
  })

  it('reconoce emojis con y sin variation selector', () => {
    expect(getEmojiIcon('⚖️')).toBeDefined()
    expect(getEmojiIcon('⚖')).toBe(getEmojiIcon('⚖️'))
  })

  it('cubre todos los iconos de las configs de dominio', () => {
    const domainEmojis = [
      ...Object.values(animal_icon),
      ...Object.values(record_type_icons),
      ...Object.values(record_category_icons),
      ...Object.values(record_event_type_icons),
      ...Object.values(expense_category_icons),
      ...Object.values(animal_status_icons),
      ...Object.values(animal_stage_config).map((s) => s.icon),
    ]
    const missing = domainEmojis.filter((e) => !getEmojiIcon(e))
    expect(missing).toEqual([])
  })

  it('dibuja svg para emojis conocidos y cae al emoji si no hay equivalente', () => {
    const { container, rerender } = render(<EmojiIcon emoji="🐄" />)
    expect(container.querySelector('svg')).not.toBeNull()
    rerender(<EmojiIcon emoji="🦄" />)
    expect(container.textContent).toBe('🦄')
  })

  it('IconLabel conserva el texto y quita el emoji', () => {
    const { container } = render(<IconLabel label="🐑 Oveja" />)
    expect(container.textContent).toBe('Oveja')
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
