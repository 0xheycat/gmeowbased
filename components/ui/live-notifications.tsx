// Live notifications system - minimal implementation
'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type NotificationTone = 'success' | 'error' | 'info' | 'warning'

interface Notification {
  id: string
  message: string
  tone: NotificationTone
  duration?: number
}

interface NotificationContextType {
  showNotification: (message: string, tone?: NotificationTone, duration?: number) => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((
    message: string,
    tone: NotificationTone = 'info',
    duration: number = 3000
  ) => {
    const id = Math.random().toString(36).substring(7)
    const notification = { id, message, tone, duration }
    
    setNotifications(prev => [...prev, notification])
    
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
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg ${
                notification.tone === 'success' ? 'bg-green-500 text-white' :
                notification.tone === 'error' ? 'bg-red-500 text-white' :
                notification.tone === 'warning' ? 'bg-yellow-500 text-black' :
                'bg-blue-500 text-white'
              }`}
            >
              {notification.message}
            </div>
          ))}
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
    success: (msg: string) => showNotification(msg, 'success'),
    error: (msg: string) => showNotification(msg, 'error'),
    info: (msg: string) => showNotification(msg, 'info'),
    warning: (msg: string) => showNotification(msg, 'warning'),
  }
}
