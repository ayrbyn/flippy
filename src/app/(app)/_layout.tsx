import React from 'react';
import AppTabs from '../../components/app-tabs';
import { CourseProvider } from '../../lib/courses';
import { ProfileProvider } from '../../lib/profile';

export default function AppLayout() {
  return (
    <CourseProvider>
      <ProfileProvider>
        <AppTabs />
      </ProfileProvider>
    </CourseProvider>
  );
}
