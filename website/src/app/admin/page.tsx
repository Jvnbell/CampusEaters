import type { Metadata } from 'next';

import AdminDashboard from '@/components/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | CampusEats',
  description: 'Real-time monitoring for CampusEats delivery fleet.',
};

export default function AdminPage() {
  return <AdminDashboard />;
}

