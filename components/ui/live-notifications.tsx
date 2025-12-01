// Live notifications system - Enhanced for all event types
'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { saveNotification } from '@/lib/notification-history'

export type NotificationTone = 'success' | 'error' | 'info' | 'warning'
export type NotificationCategory = 'gm' | 'quest' | 'badge' | 'level' | 'streak' | 'tip' | 'achievement' | 'reward' | 'guild'

interface Notification {
  id: string
  message: string
  tone: NotificationTone
  category?: NotificationCategory
  duration?: number
}

interface NotificationContextType {
  showNotification: (
    message: string, 
    tone?: NotificationTone, 
    duration?: number,
    category?: NotificationCategory,
    metadata?: Record<string, any>
  ) => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((
    message: string,
    tone: NotificationTone = 'info',
    duration: number = 3000,
    category?: NotificationCategory,
    metadata?: Record<string, any>
  ) => {
    const id = Math.random().toString(36).substring(7)
    const notification = { id, message, tone, category, duration }
    
    setNotifications(prev => [...prev, notification])
    
    // Save to history (non-blocking)
    if (category) {
      saveNotification({
        category,
        title: message,
        tone,
        metadata,
      }).catch(() => {
        // Silent fail - don't block UI
      })
    }
    
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotifications }}>
      {children}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {notifications.map(notification => {
            // Determine icon based on tone
            const icon = 
              notification.tone === 'success' ? '✅' :
              notification.tone === 'error' ? '❌' :
              notification.tone === 'warning' ? '⚠️' : 'ℹ️'
            
            // Tailwind classes based on tone (no inline styles)
            const toneClasses = 
              notification.tone === 'success' ? 'bg-green-500 text-white border-green-600' :
              notification.tone === 'error' ? 'bg-red-500 text-white border-red-600' :
              notification.tone === 'warning' ? 'bg-yellow-500 text-black border-yellow-600' :
              'bg-blue-500 text-white border-blue-600'
            
            return (
              <div
                key={notification.id}
                className={`
                  px-4 py-3 rounded-lg shadow-lg border-2
                  animate-in slide-in-from-right-5 fade-in
                  duration-300 ease-out
                  ${toneClasses}
                `}
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">{icon}</span>
                  <span className="font-medium">{notification.message}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

// Legacy adapter for old notification system
export function useLegacyNotificationAdapter() {
  const { showNotification } = useNotifications()
  return {
    notify: showNotification,
    success: (msg: string, category?: NotificationCategory, metadata?: Record<string, any>) => 
      showNotification(msg, 'success', 3000, category, metadata),
    error: (msg: string, category?: NotificationCategory, metadata?: Record<string, any>) => 
      showNotification(msg, 'error', 5000, category, metadata),
    info: (msg: string, category?: NotificationCategory, metadata?: Record<string, any>) => 
      showNotification(msg, 'info', 3000, category, metadata),
    warning: (msg: string, category?: NotificationCategory, metadata?: Record<string, any>) => 
      showNotification(msg, 'warning', 4000, category, metadata),
  }
}

