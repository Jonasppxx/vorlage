import { prisma } from '@/src/lib/prisma/prisma';

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-4xl font-bold mb-4">Next.js Template</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Willkommen bei meinem neuen Projekt!
        </p>
        <p className="mt-2 text-sm text-gray-500 mb-8">
          Auto-Publishing aktiviert! 🚀
        </p>

        {/* Database Status */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-zinc-800">
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
            <p className="mt-4 text-sm text-yellow-600 dark:text-yellow-500">
              ⚠️ Configure DATABASE_URL in .env to connect to MongoDB
            </p>
          )}
        </div>

        {/* API Endpoints */}
        <div className="mt-6 text-sm text-gray-500">
          <p className="mb-2">API Endpoints:</p>
          <div className="flex gap-2 justify-center">
            <code className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">/api/users</code>
            <code className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">/api/posts</code>
          </div>
        </div>
      </div>
    </div>
  );
}
