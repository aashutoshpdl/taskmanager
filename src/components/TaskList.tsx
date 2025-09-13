import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/useauth";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { format } from "date-fns";
import TaskFilters from "./TaskFilters";

interface Task {
  id: string;
  title: string;
  category: string;
  priority: string;
  dueDate: Date | null;
  completed: boolean;
}

const priorities = ["High", "Medium", "Low"];
const categories = ["Work", "Personal", "Study", "Other"]; // static categories

const priorityColors: Record<string, string> = {
  High: "bg-red-500",
  Medium: "bg-yellow-400",
  Low: "bg-green-500",
};

const categoryColors: Record<string, string> = {
  Work: "bg-blue-200 text-blue-800",
  Personal: "bg-purple-200 text-purple-800",
  Study: "bg-indigo-200 text-indigo-800",
  Other: "bg-gray-200 text-gray-800",
};

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useAuth();

  // filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterDueDate, setFilterDueDate] = useState("");

  // inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"title" | "category" | "priority" | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Task[] = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          dueDate: docData.dueDate ? docData.dueDate.toDate() : null,
        } as Task;
      });
      setTasks(data);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleComplete = async (id: string, completed: boolean) => {
    await updateDoc(doc(db, "tasks", id), { completed: !completed });
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(tasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setTasks(reordered);

    const newPriority = priorities[result.destination.index] || "Low";
    await updateDoc(doc(db, "tasks", moved.id), { priority: newPriority });
  };

  const startEditing = (taskId: string, field: "title" | "category" | "priority", currentValue: string) => {
    setEditingTaskId(taskId);
    setEditField(field);
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (!editingTaskId || !editField) return;

    await updateDoc(doc(db, "tasks", editingTaskId), {
      [editField]: editValue,
    });

    setEditingTaskId(null);
    setEditField(null);
    setEditValue("");
  };

  // filtering
  const filteredTasks = tasks.filter((task) => {
    return (
      (filterCategory ? task.category === filterCategory : true) &&
      (filterPriority ? task.priority === filterPriority : true) &&
      (filterDueDate
        ? format(task.dueDate as Date, "yyyy-MM-dd") === filterDueDate
        : true)
    );
  });

  return (
    <div>
      <TaskFilters
        category={filterCategory}
        setCategory={setFilterCategory}
        priority={filterPriority}
        setPriority={setFilterPriority}
        dueDate={filterDueDate}
        setDueDate={setFilterDueDate}
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="taskList">
          {(provided) => (
            <ul
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex flex-col gap-4"
            >
              {filteredTasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex justify-between items-center bg-gray-100 p-4 rounded-xl shadow-sm transform transition duration-300 ease-in-out cursor-pointer 
                        hover:shadow-md hover:scale-[1.02] 
                        ${snapshot.isDragging ? "shadow-lg scale-[1.03]" : ""}
                      `}
                    >
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        {/* Title editing */}
                        {editingTaskId === task.id && editField === "title" ? (
                          <input
                            type="text"
                            value={editValue}
                            autoFocus
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            className="border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 font-semibold"
                          />
                        ) : (
                          <h3
                            className={`font-semibold text-lg ${
                              task.completed
                                ? "line-through text-gray-400"
                                : "text-gray-900"
                            }`}
                            onClick={() => startEditing(task.id, "title", task.title)}
                          >
                            {task.title}
                          </h3>
                        )}

                        <p className="text-sm flex items-center gap-3 text-gray-700 font-medium">
                          {/* Category editing */}
                          {editingTaskId === task.id &&
                          editField === "category" ? (
                            <select
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              className="border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`cursor-pointer rounded-full px-3 py-0.5 text-xs font-semibold select-none ${
                                categoryColors[task.category] || "bg-gray-200 text-gray-800"
                              }`}
                              onClick={() =>
                                startEditing(task.id, "category", task.category)
                              }
                            >
                              {task.category}
                            </span>
                          )}

                          •

                          {/* Priority editing */}
                          {editingTaskId === task.id &&
                          editField === "priority" ? (
                            <select
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              className="border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                            >
                              {priorities.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`cursor-pointer rounded-full px-3 py-0.5 text-xs font-semibold select-none text-white ${
                                priorityColors[task.priority] || "bg-green-500"
                              }`}
                              onClick={() =>
                                startEditing(task.id, "priority", task.priority)
                              }
                            >
                              {task.priority}
                            </span>
                          )}

                          •

                          <span className="select-none">
                            {task.dueDate
                              ? format(task.dueDate, "MMM d, yyyy")
                              : "No due date"}
                          </span>
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleComplete(task.id, task.completed)}
                          className="px-3 py-1 bg-green-500 text-white rounded-md font-semibold shadow-sm transition duration-200 hover:bg-green-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                          {task.completed ? "Undo" : "Done"}
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded-md font-semibold shadow-sm transition duration-200 hover:bg-red-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default TaskList;