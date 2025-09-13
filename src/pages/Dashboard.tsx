import React, { useState } from "react";
import { useAuth } from "../context/useauth";
import CategorySidebar from "../components/CategorySidebar";
import CategoryView from "../components/CategoryView";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg overflow-y-auto transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <CategorySidebar 
          selectedCategoryId={selectedCategoryId} 
          onSelect={id => {
            setSelectedCategoryId(id);
            setSidebarOpen(false);
          }} 
        />
      </div>

      {/* Overlay for small screens when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden  bg-gradient-to-br from-gray-50 via-white to-gray-100">
        {/* Mobile header with sidebar toggle */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm border-b">
          <button
            aria-label="Toggle Sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          <div className="w-6" /> {/* placeholder for spacing */}
        </header>

        {/* Header */}
        <header className="w-full max-w-3xl mx-auto flex items-center justify-between p-6 mb-4 mt-4 bg-white rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">Welcome, {user?.displayName}</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2 rounded-lg shadow-md hover:from-red-600 hover:to-red-700 active:scale-95 transition-transform duration-150 ease-in-out"
          >
            Logout
          </button>
        </header>

        {/* Content Area */}
        <section className="flex-1 w-full max-w-3xl mx-auto p-4 overflow-auto">
          <div className="relative">
            <div
              key={selectedCategoryId === null ? "tasks" : "category"}
              className="transition-opacity duration-500 ease-in-out"
              style={{ opacity: 1 }}
            >
              {selectedCategoryId === null ? (
                <div className="space-y-6">
                  <TaskForm />
                  <TaskList />
                </div>
              ) : (
                <CategoryView categoryId={selectedCategoryId} />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
