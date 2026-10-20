import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

export type Profile = {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
};

type ProfileState = {
  profile: Profile | null;
  // Streak yang ditampilkan: jadi 0 kalau kemarin tidak latihan
  streak: number;
  refresh: () => Promise<void>;
  // Sinkronkan hasil profil yang dikembalikan oleh transaksi jawaban.
  syncPracticeResult: (value: Profile) => void;
};

const ProfileContext = createContext<ProfileState | null>(null);

function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileRevision = useRef(0);

  const applyProfile = useCallback((value: Profile | null) => {
    setProfile(value);
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    const revision = profileRevision.current;
    const { data } = await supabase
      .from('profiles')
      .select('total_xp, current_streak, longest_streak, last_practice_date')
      .eq('id', session.user.id)
      .maybeSingle();
    if (revision === profileRevision.current) {
      applyProfile((data as Profile | null) ?? null);
    }
  }, [session, applyProfile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const syncPracticeResult = useCallback((value: Profile) => {
    profileRevision.current += 1;
    applyProfile(value);
  }, [applyProfile]);

  const streak = useMemo(() => {
    if (!profile || !profile.last_practice_date) return 0;
    const last = profile.last_practice_date;
    if (last === localDateString() || last === yesterdayString()) {
      return profile.current_streak;
    }
    return 0;
  }, [profile]);

  return (
    <ProfileContext.Provider value={{ profile, streak, refresh, syncPracticeResult }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile harus dipakai di dalam ProfileProvider');
  }
  return ctx;
}
