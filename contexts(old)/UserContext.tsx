/**
 * User Context Provider
 * Manages user authentication state and FID
 * For now uses mock data; will integrate with Farcaster auth later
 */

'use client'

import { createContext, useContext, type ReactNode } from 'react'

type UserContextType = {
  fid: number
  address?: string
  username: string
  avatar?: string
  isAuthenticated: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  // Mock user data for development
  // TODO: Replace with Farcaster auth integration
  const mockUser: UserContextType = {
    fid: 12345,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    username: 'TestUser',
    avatar: '/assets/gmeow-illustrations/Avatars/Avatar_001.png',
    isAuthenticated: true,
  }

  return (
    <UserContext.Provider value={mockUser}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
