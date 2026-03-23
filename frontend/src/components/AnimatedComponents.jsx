/**
 * Componentes de animación con Framer Motion
 * 
 * INSTALACIÓN REQUERIDA:
 * npm install framer-motion
 * 
 * Estos componentes proporcionan animaciones suaves y reutilizables
 * para mejorar la UX en toda la aplicación.
 */

import { motion, AnimatePresence } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════
// Fade In - Aparición con fade
// ═══════════════════════════════════════════════════════════════════════

export function FadeIn({ children, delay = 0, duration = 0.3, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Slide In - Deslizamiento desde arriba/abajo/izquierda/derecha
// ═══════════════════════════════════════════════════════════════════════

export function SlideIn({
  children,
  direction = 'up', // up, down, left, right
  delay = 0,
  duration = 0.4,
  distance = 20,
  className = '',
}) {
  const variants = {
    up: { y: distance, opacity: 0 },
    down: { y: -distance, opacity: 0 },
    left: { x: distance, opacity: 0 },
    right: { x: -distance, opacity: 0 },
  }

  return (
    <motion.div
      initial={variants[direction]}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={variants[direction]}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Scale In - Aparición con escalado
// ═══════════════════════════════════════════════════════════════════════

export function ScaleIn({
  children,
  delay = 0,
  duration = 0.3,
  initialScale = 0.9,
  className = '',
}) {
  return (
    <motion.div
      initial={{ scale: initialScale, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: initialScale, opacity: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Modal Animation - Animación para modales
// ═══════════════════════════════════════════════════════════════════════

export function AnimatedModal({ children, isOpen, onClose, className = '' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Stagger Children - Animación secuencial de elementos hijos
// ═══════════════════════════════════════════════════════════════════════

export function StaggerContainer({ children, staggerDelay = 0.1, className = '' }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Card Animation - Animación para tarjetas/cards
// ═══════════════════════════════════════════════════════════════════════

export function AnimatedCard({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Button Animation - Animación para botones
// ═══════════════════════════════════════════════════════════════════════

export function AnimatedButton({ children, onClick, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// List Animation - Animación para listas
// ═══════════════════════════════════════════════════════════════════════

export function AnimatedList({ children, className = '' }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function AnimatedListItem({ children, className = '', layoutId }) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Page Transition - Animación para transiciones de página
// ═══════════════════════════════════════════════════════════════════════

export function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Collapse/Expand - Animación para contenido plegable
// ═══════════════════════════════════════════════════════════════════════

export function Collapse({ isOpen, children, className = '' }) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Spinner Animation - Loading spinner animado
// ═══════════════════════════════════════════════════════════════════════

export function AnimatedSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`rounded-full border-2 border-gray-300 border-t-brand ${sizes[size]} ${className}`}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Notification Toast - Animación para notificaciones
// ═══════════════════════════════════════════════════════════════════════

export function AnimatedToast({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Presence Wrapper - Wrapper para AnimatePresence
// ═══════════════════════════════════════════════════════════════════════

export function PresenceWrapper({ children, mode = 'wait' }) {
  return <AnimatePresence mode={mode}>{children}</AnimatePresence>
}
