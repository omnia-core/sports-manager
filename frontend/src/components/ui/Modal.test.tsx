import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

// Exercises the react-dom + jsdom + user-event half of the setup, on the one
// UI primitive that carries real behaviour of its own: the Escape handler.
describe('Modal', () => {
  it('renders its title and children', () => {
    render(
      <Modal title="Opponent score" onClose={() => {}}>
        <p>body content</p>
      </Modal>,
    )
    expect(screen.getByText('Opponent score')).toBeInTheDocument()
    expect(screen.getByText('body content')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Modal title="Opponent score" onClose={onClose}>body</Modal>)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close on any other key', async () => {
    const onClose = vi.fn()
    render(<Modal title="Opponent score" onClose={onClose}>body</Modal>)
    await userEvent.keyboard('a')
    expect(onClose).not.toHaveBeenCalled()
  })
})
