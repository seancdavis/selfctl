import { useEffect } from 'react'

const SITE_TITLE = 'selfctl'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_TITLE}` : SITE_TITLE
  }, [title])
}
