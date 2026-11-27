import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, setCsrfToken } from '../api/client';
import type { User } from '../types';

interface RegisterResult {
  pendingApproval: boolean;
  message: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authModalOpen: boolean;
  authModalNotice: string | null;
  openAuthModal: (options?: { notice?: string; onAuthenticated?: (u: User) => void }) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalNotice, setAuthModalNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<((u: User) => void) | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: User | null; csrfToken?: string }>('/auth/me');
      if (data.csrfToken) setCsrfToken(data.csrfToken);
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const openAuthModal = useCallback(
    (options?: { notice?: string; onAuthenticated?: (u: User) => void }) => {
      setAuthModalNotice(options?.notice ?? null);
      setPendingAction(() => options?.onAuthenticated ?? null);
      setAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalNotice(null);
    setPendingAction(null);
  }, []);

  const handleSuccess = useCallback(
    (loggedInUser: User) => {
      setUser(loggedInUser);
      setAuthModalOpen(false);
      setAuthModalNotice(null);
      if (pendingAction) {
        const fn = pendingAction;
        setPendingAction(null);
        fn(loggedInUser);
      }
    },
    [pendingAction]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ user: User; csrfToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setCsrfToken(data.csrfToken);
      handleSuccess(data.user);
      return data.user;
    },
    [handleSuccess]
  );

  const register = useCallback(
    async (input: { fullName: string; email: string; phone: string; password: string }) => {
      const data = await apiFetch<{
        pendingApproval?: boolean;
        message?: string;
        user: User;
        csrfToken?: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      if (!data.pendingApproval) {
        handleSuccess(data.user);
      }
      return {
        pendingApproval: Boolean(data.pendingApproval),
        message:
          data.message ||
          'Registration details saved! Awaiting administrator approval.',
        user: data.user,
      };
    },
    [handleSuccess]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setCsrfToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authModalOpen,
        authModalNotice,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
