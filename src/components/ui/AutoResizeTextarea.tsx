import { useEffect, useRef } from 'react'

interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number
}

export function AutoResizeTextarea({ minRows = 3, value, onChange, ...props }: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, el.rows * 24)}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={onChange}
      {...props}
      style={{ overflow: 'hidden', ...props.style }}
    />
  )
}
