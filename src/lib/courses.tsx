import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

export type Course = {
  id: string;
  target_language: string;
  explanation_language: string;
  level: string;
  daily_word_goal: number;
  created_at: string;
};

export type NewCourseInput = {
  target_language: string;
  explanation_language: string;
  level: string;
  daily_word_goal: number;
};

type CourseState = {
  courses: Course[];
  activeCourse: Course | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setActiveCourse: (courseId: string) => void;
  // Mengembalikan pesan error, atau null kalau berhasil
  createCourse: (input: NewCourseInput) => Promise<string | null>;
};

const CourseContext = createContext<CourseState | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const list = (data ?? []) as Course[];
      setCourses(list);
      setActiveCourseId((prev) =>
        prev && list.some((c) => c.id === prev) ? prev : list[0]?.id ?? null
      );
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createCourse = useCallback(
    async (input: NewCourseInput): Promise<string | null> => {
      if (!session) return 'Anda belum login.';

      const { data, error: insertError } = await supabase
        .from('courses')
        .insert({ user_id: session.user.id, ...input })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return 'Kursus dengan pasangan bahasa ini sudah ada.';
        }
        return insertError.message;
      }

      const created = data as Course;
      setCourses((prev) => [...prev, created]);
      setActiveCourseId(created.id);
      return null;
    },
    [session]
  );

  const activeCourse = useMemo(
    () => courses.find((c) => c.id === activeCourseId) ?? null,
    [courses, activeCourseId]
  );

  const setActiveCourse = useCallback((courseId: string) => {
    if (courses.some((course) => course.id === courseId)) {
      setActiveCourseId(courseId);
    }
  }, [courses]);

  const value: CourseState = {
    courses,
    activeCourse,
    loading,
    error,
    refresh,
    setActiveCourse,
    createCourse,
  };

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
}

export function useCourses(): CourseState {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error('useCourses harus dipakai di dalam CourseProvider');
  }
  return ctx;
}
