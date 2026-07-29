import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the migrated calendar controls', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => undefined),
    )

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Bro Calendar' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть YML' })).toBeInTheDocument()
    expect(screen.getByLabelText('Диапазон календаря')).toHaveValue('3')
    expect(screen.getByText('Событий пока нет. Загрузите существующий YAML-файл.'))
      .toBeInTheDocument()
  })

  it('changes the visible calendar range', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => undefined),
    )

    render(<App />)

    fireEvent.change(screen.getByLabelText('Диапазон календаря'), {
      target: { value: '12' },
    })

    expect(screen.getByLabelText('Диапазон календаря')).toHaveValue('12')
  })
})
