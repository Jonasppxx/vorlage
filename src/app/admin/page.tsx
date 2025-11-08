'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/src/lib/auth-client';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!session) {
      router.push('/');
      return;
    }

    if (session.user.role !== 'admin') {
      console.error('Access denied: Not an admin');
      router.push('/');
      return;
    }

    fetchUsers();
  }, [session, router]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      
      if (!res.ok) {
        throw new Error(`Failed to fetch users: ${res.statusText}`);
      }

      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (session.user.role !== 'admin') {
    return (
      <div className="p-4 text-center text-red-600">
        ❌ Access Denied: You are not an admin
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">Manage all users in the system</p>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-indigo-600 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {user.name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
              Total users: {users.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
