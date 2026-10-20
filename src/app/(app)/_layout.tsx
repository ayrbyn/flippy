import React from 'react';
import AppTabs from '../../components/app-tabs';
import { CourseProvider } from '../../lib/courses';

export default function AppLayout() {
  return (
    <CourseProvider>
      <AppTabs />
    </CourseProvider>
  );
}
