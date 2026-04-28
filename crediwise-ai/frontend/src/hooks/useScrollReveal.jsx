import { useEffect, useRef } from 'react'

/**
 * useScrollReveal — attaches IntersectionObserver to a container ref.
 * All direct children with class "reveal" will animate in when 20% visible.
 * Stagger delay added via CSS animation-delay.
 */
export function useScrollReveal(containerRef, stagger = 80) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const items = el.querySelectorAll('.reveal')
    items.forEach((item, i) => {
      item.style.opacity = '0'
      item.style.transform = 'translateY(30px)'
      item.style.transition = `opacity 500ms var(--ease-vault) ${i * stagger}ms, transform 500ms var(--ease-vault) ${i * stagger}ms`
    })

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach(item => {
              item.style.opacity = '1'
              item.style.transform = 'translateY(0)'
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])
}

/**
 * ScrollReveal — wrapper component that auto-reveals children on scroll.
 */
export function ScrollReveal({ children, stagger = 80, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const children = Array.from(el.children)
    children.forEach((child, i) => {
      child.style.opacity = '0'
      child.style.transform = 'translateY(30px)'
      child.style.transition =
        `opacity 500ms var(--ease-vault) ${i * stagger}ms, ` +
        `transform 500ms var(--ease-vault) ${i * stagger}ms`
    })

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          children.forEach(child => {
            child.style.opacity = '1'
            child.style.transform = 'translateY(0)'
          })
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [stagger])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
