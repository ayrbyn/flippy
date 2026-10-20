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
  // Dipanggil setiap selesai menjawab satu soal
  recordPractice: (xpGained: number) => Promise<void>;
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
  const profileRef = useRef<Profile | null>(null);

  const applyProfile = useCallback((value: Profile | null) => {
    profileRef.current = value;
    setProfile(value);
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('total_xp, current_streak, longest_streak, last_practice_date')
      .eq('id', session.user.id)
      .maybeSingle();
    applyProfile((data as Profile | null) ?? null);
  }, [session, applyProfile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordPractice = useCallback(
    async (xpGained: number) => {
      const current = profileRef.current;
      if (!session || !current) return;

      const today = localDateString();
      let newStreak = current.current_streak;

      if (current.last_practice_date !== today) {
        newStreak =
          current.last_practice_date === yesterdayString()
            ? current.current_streak + 1
            : 1;
      }

      const updated: Profile = {
        total_xp: current.total_xp + xpGained,
        current_streak: newStreak,
        longest_streak: Math.max(current.longest_streak, newStreak),
        last_practice_date: today,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updated)
        .eq('id', session.user.id);

      if (!error) {
        applyProfile(updated);
      }
    },
    [session, applyProfile]
  );

  const streak = useMemo(() => {
    if (!profile || !profile.last_practice_date) return 0;
    const last = profile.last_practice_date;
    if (last === localDateString() || last === yesterdayString()) {
      return profile.current_streak;
    }
    return 0;
  }, [profile]);

  return (
    <ProfileContext.Provider value={{ profile, streak, refresh, recordPractice }}>
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
