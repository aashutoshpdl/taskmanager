import React from "react";

interface FiltersProps {
  category: string;
  setCategory: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
}

const TaskFilters: React.FC<FiltersProps> = ({
  category, setCategory, priority, setPriority, dueDate, setDueDate
}) => {
  return (
    <div className="flex gap-6 mb-4">
      <div className="flex flex-col w-40">
        <label htmlFor="category" className="mb-1 text-sm font-medium text-gray-700">Category</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-2 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        >
          <option value="">All Categories</option>
          <option value="Work">Work</option>
          <option value="Personal">Personal</option>
          <option value="Study">Study</option>
        </select>
      </div>

      <div className="flex flex-col w-40">
        <label htmlFor="priority" className="mb-1 text-sm font-medium text-gray-700">Priority</label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border p-2 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="flex flex-col w-40">
        <label htmlFor="dueDate" className="mb-1 text-sm font-medium text-gray-700">Due Date</label>
        <input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border p-2 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        />
      </div>
    </div>
  );
};

export default TaskFilters;