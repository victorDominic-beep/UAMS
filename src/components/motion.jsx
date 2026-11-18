import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { Card } from "./ui"

export const easeOut = [0.22, 1, 0.36, 1]

export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export function MotionCard({ children, delay = 0, className }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: easeOut }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className="h-full"
    >
      <Card
        className={`h-full transition-shadow duration-200 hover:shadow-lg ${className || ""}`}
      >
        {children}
      </Card>
    </motion.div>
  )
}

export function AnimatedNumber({ value }) {
  const reduceMotion = useReducedMotion()
  const parsed = useMemo(() => {
    const normalized = String(value).replace(/,/g, "")
    const match = normalized.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/)
    if (!match) return null
    return {
      prefix: match[1],
      number: Number(match[2]),
      suffix: match[3],
      decimals: match[2].includes(".") ? match[2].split(".")[1].length : 0,
    }
  }, [value])
  const number = useMotionValue(reduceMotion ? parsed?.number || 0 : 0)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (!parsed || reduceMotion) {
      setDisplay(value)
      return
    }
    const controls = animate(number, parsed.number, {
      duration: 0.75,
      ease: easeOut,
      onUpdate: (latest) => {
        const numeric = latest.toFixed(parsed.decimals)
        const formatted =
          parsed.decimals === 0 ? Number(numeric).toLocaleString() : numeric
        setDisplay(`${parsed.prefix}${formatted}${parsed.suffix}`)
      },
    })
    return () => controls.stop()
  }, [number, parsed, reduceMotion, value])

  return <>{display}</>
}

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted motion-reduce:animate-none ${className}`}
    />
  )
}
