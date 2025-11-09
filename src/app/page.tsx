import { prisma } from '@/src/lib/prisma/prisma';
import UserSession from '@/src/components/auth/UserSession';
import Link from 'next/link';

async function getDbStatus() {
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();
    return { connected: true, userCount, postCount };
  } catch (error) {
    return { connected: false, userCount: 0, postCount: 0 };
  }
}

export default async function Home() {
  const dbStatus = await getDbStatus();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Next.js Template with Subscriptions</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
            MongoDB Replica Set + Better-Auth + Stripe Subscriptions
          </p>
        </div>

        {/* User Session Card */}
        <div className="mb-8">
          <UserSession />
        </div>

        {/* Quick Links Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Subscription Links */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-zinc-800">
            <div className="text-3xl mb-3 text-center">🛍️</div>
            <h3 className="text-xl font-semibold mb-3 text-center">Abonnements</h3>
            <div className="space-y-2">
              <Link
                href="/subscribe"
                className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
              >
                Abonnement-Pläne
              </Link>
              <Link
                href="/subscriptions"
                className="block px-4 py-2 bg-gray-700 dark:bg-zinc-700 text-white rounded hover:bg-gray-600 text-center"
              >
                Meine Abonnements
              </Link>
            </div>
          </div>

          {/* Premium Content */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-zinc-800">
            <div className="text-3xl mb-3 text-center">👑</div>
            <h3 className="text-xl font-semibold mb-3 text-center">Premium</h3>
            <Link
              href="/premium"
              className="block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center"
            >
              Premium Bereich
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              Nur für Abonnenten
            </p>
          </div>

          {/* Admin Panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-zinc-800">
            <div className="text-3xl mb-3 text-center">⚙️</div>
            <h3 className="text-xl font-semibold mb-3 text-center">Admin</h3>
            <div className="space-y-2">
              <Link
                href="/admin"
                className="block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/products"
                className="block px-4 py-2 bg-gray-700 dark:bg-zinc-700 text-white rounded hover:bg-gray-600 text-center"
              >
                Produkte
              </Link>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-zinc-800 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
            <span>🗄️</span> Database Status
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Connection:</span>
              <span className={`font-semibold ${dbStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                {dbStatus.connected ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Users:</span>
              <span className="font-semibold">{dbStatus.userCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Posts:</span>
              <span className="font-semibold">{dbStatus.postCount}</span>
            </div>
          </div>
          
          {!dbStatus.connected && (
            <p className="mt-4 text-sm text-yellow-600 dark:text-yellow-500 text-center">
              ⚠️ Configure DATABASE_URL in .env to connect to MongoDB
            </p>
          )}
        </div>

        {/* Documentation Links */}
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">📚 Dokumentation:</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/STRIPE_SETUP.md"
              className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 rounded hover:bg-gray-300 dark:hover:bg-zinc-700"
            >
              Stripe Setup
            </a>
            <a
              href="/SUBSCRIPTION_GUIDE.md"
              className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 rounded hover:bg-gray-300 dark:hover:bg-zinc-700"
            >
              Subscription Guide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
