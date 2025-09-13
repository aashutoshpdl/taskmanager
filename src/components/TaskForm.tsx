import React, { useState } from "react";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/useauth";
import { fetchPageTitle } from "../utils/fetchTitle";

const categories = ["Work", "Personal", "Study"];
const priorities = ["Low", "Medium", "High"];

const TaskForm: React.FC = () => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Work");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [linkDraft, setLinkDraft] = useState("");
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    await addDoc(collection(db, "tasks"), {
      title,
      category,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      completed: false,
      createdAt: serverTimestamp(),
      userId: user.uid,
    });

    setTitle("");
    setDueDate("");
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !linkDraft.trim()) return;

    const linksRef = collection(db, "links");
    const q = query(linksRef, where("userId", "==", user.uid), where("url", "==", linkDraft.trim()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) return;

    const pageTitle = await fetchPageTitle(linkDraft.trim());
    console.log("Fetched page title:", pageTitle);

    await addDoc(linksRef, {
      url: linkDraft.trim(),
      title: pageTitle || linkDraft.trim(), // fallback to URL if no title
      createdAt: serverTimestamp(),
      userId: user.uid,
    });

    setLinkDraft("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-6 rounded-3xl shadow-lg mb-6"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        className="border border-gray-300 rounded-lg p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition duration-300"
      />

      <div className="flex gap-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition duration-300"
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border border-gray-300 rounded-lg p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition duration-300"
        >
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border border-gray-300 rounded-lg p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition duration-300"
        />
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={linkDraft}
          onChange={(e) => setLinkDraft(e.target.value)}
          placeholder="Add link..."
          className="border border-gray-300 rounded-lg p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition duration-300 flex-grow"
        />
        <button
          onClick={handleAddLink}
          className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg p-3 shadow-md hover:from-green-500 hover:to-green-700 transition duration-300"
          type="button"
        >
          Add Link
        </button>
      </div>

      <button
        type="submit"
        className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg p-3 shadow-md hover:from-blue-600 hover:to-blue-800 transition duration-300"
      >
        Add Task
      </button>
    </form>
  );
};

export default TaskForm;