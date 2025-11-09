'use client';

import { AuthCard } from '@/components/auth/AuthCard';

const AdminLogin = () => {
  return <AuthCard variant="admin" redirectPath="/admin" />;
};

export default AdminLogin;
