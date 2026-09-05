// Magnetic Button with Cursor Attraction
'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, MouseEvent } from 'react'
import { Button } from './button'
import { ButtonProps } from './button'

export default function MagneticButton({ children, className, ...props }: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { damping: 15, stiffness: 150 }
  const xSpring = useSpring(x, springConfig)
  const ySpring = useSpring(y, springConfig)

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distanceX = e.clientX - centerX
    const distanceY = e.clientY - centerY

    // Limit the movement to a certain range
    const maxMove = 20
    const moveX = Math.max(Math.min(distanceX * 0.3, maxMove), -maxMove)
    const moveY = Math.max(Math.min(distanceY * 0.3, maxMove), -maxMove)

    x.set(moveX)
    y.set(moveY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      style={{
        x: xSpring,
        y: ySpring,
      }}
    >
      <Button
        {...props}
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`${className}`}
      >
        {children}
      </Button>
    </motion.div>
  )
}
