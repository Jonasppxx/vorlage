import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Next.js Template</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">Willkommen bei meinem neuen Projekt!</p>
        <p className="mt-2 text-sm text-gray-500">Auto-Publishing aktiviert! 🚀</p>
      </div>        
    </div>
  );
}
