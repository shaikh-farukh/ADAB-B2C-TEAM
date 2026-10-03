import { create } from 'zustand';

export type UserRole = 'manufacturer' | 'distributor' | 'admin' | 'retailer';

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
  setLoggedIn: (status: boolean) => void;
  initialize: () => void;
}

/**
 * Responsibility: Global state management for user identity and roles.
 * Synced with localStorage for persistence across page refreshes.
 */
export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: !!localStorage.getItem('user_role'),
  role: (localStorage.getItem('user_role') as UserRole) || 'manufacturer',
  setRole: (role: UserRole) => set({ role }),
  setLoggedIn: (isLoggedIn: boolean) => set((state) => {
    if (!isLoggedIn) {
      return { isLoggedIn: false, role: 'manufacturer' };
    }
    return { isLoggedIn };
  }),
  initialize: () => {
    const role = localStorage.getItem('user_role') as UserRole;
    if (role) {
      set({ isLoggedIn: true, role });
    } else {
      set({ isLoggedIn: false });
    }
  }
}));