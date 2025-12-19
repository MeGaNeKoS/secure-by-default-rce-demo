import ConnectionTester from './components/ConnectionTester';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
          Secure Node.js Environment
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Distroless Container & Server Action Demo
        </p>
      </div>
      
      <ConnectionTester />
      
      <footer className="mt-16 text-gray-500 dark:text-gray-500 text-sm">
        Protected by Distroless & Node.js Permissions
      </footer>
    </main>
  );
}