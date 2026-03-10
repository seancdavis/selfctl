import { useEffect, useRef } from 'react'
import { Editor } from '@rocktree/ash'
import type { EditorProps } from '@rocktree/ash'

interface AutoResizeTextareaProps extends Omit<EditorProps, 'onChange'> {
  onChange: (value: string) => void
  minRows?: number
}

export function AutoResizeTextarea({
  minRows = 3,
  value,
  onChange,
  onKeyDown,
  ...props
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, minRows * 24)}px`
  }, [value, minRows])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const form = (e.target as HTMLElement).closest('form')
      form?.requestSubmit()
    }
    onKeyDown?.(e)
  }

  return (
    <Editor
      ref={ref}
      rows={minRows}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      {...props}
      style={{ overflow: 'hidden', ...props.style }}
    />
  )
}
