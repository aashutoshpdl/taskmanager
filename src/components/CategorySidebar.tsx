/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/CategorySidebar.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  QuerySnapshot,
  type DocumentData,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/useauth";

interface Category {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  color?: string; // hex
  icon?: string; // emoji or short string
}

export default function CategorySidebar({
  selectedCategoryId,
  onSelect,
}: {
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { user } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [newCat, setNewCat] = useState("");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Load categories for current user, ordered by createdAt ascending, sorted alphabetically by name
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "categories"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const rows: Category[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          name: x.name,
          userId: x.userId,
          createdAt: x.createdAt?.toDate?.() ?? new Date(),
          color: x.color ?? "#60a5fa",
          icon: x.icon ?? "📁",
        };
      });
      // Sort categories alphabetically by name (case insensitive)
      rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      setCats(rows);
    });
  }, [user]);

  // Fetch counts of notes and links per category using Promise.all for aggregation
  useEffect(() => {
    if (!user) return;
    if (cats.length === 0) {
      setCategoryCounts({});
      return;
    }

    // Helper to get count of documents in a collection for a given category
    const getCount = async (colName: string, categoryId: string): Promise<number> => {
      const q = query(collection(db, colName), where("categoryId", "==", categoryId));
      return new Promise<number>((resolve) => {
        const unsub = onSnapshot(q, (snap) => {
          resolve(snap.size);
          unsub();
        });
      });
    };

    let isActive = true; // To prevent state update if component unmounted

    (async () => {
      const countsMap: Record<string, number> = {};
      await Promise.all(
        cats.map(async (cat) => {
          const [notesCount, linksCount] = await Promise.all([
            getCount("notes", cat.id),
            getCount("links", cat.id),
          ]);
          countsMap[cat.id] = notesCount + linksCount;
        })
      );
      if (isActive) setCategoryCounts(countsMap);
    })();

    return () => {
      isActive = false;
    };
  }, [cats, user]);

  // Add new category
  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCat.trim()) return;
    await addDoc(collection(db, "categories"), {
      name: newCat.trim(),
      userId: user.uid,
      createdAt: serverTimestamp(),
    });
    setNewCat("");
  };

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Start editing a category name
  const startEditing = useCallback((cat: Category) => {
    setEditingId(cat.id);
    setEditingValue(cat.name);
  }, []);

  // Save edited category name to Firestore
  const saveEdit = useCallback(
    async (cat: Category) => {
      const trimmed = editingValue.trim();
      if (!user || !trimmed || trimmed === cat.name) {
        setEditingId(null);
        setEditingValue("");
        return;
      }
      try {
        await updateDoc(doc(db, "categories", cat.id), { name: trimmed });
      } catch {
        // Optionally handle error here
      }
      setEditingId(null);
      setEditingValue("");
    },
    [editingValue, user]
  );

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingValue("");
  }, []);

  // Delete category with confirmation
  const deleteCategory = useCallback(
    async (cat: Category) => {
      if (!user) return;
      const confirmed = window.confirm(
        "Are you sure you want to delete this collection? All data inside will also be deleted."
      );
      if (!confirmed) return;
      try {
        await deleteDoc(doc(db, "categories", cat.id));
      } catch {
        // Optionally handle error here
      }
    },
    [user]
  );

  return (
    <aside className="w-64 border-r h-full flex flex-col" aria-label="Category sidebar">
      <div className="p-3">
        <button
          className={`w-full text-left px-3 py-2 rounded ${
            selectedCategoryId === null ? "bg-blue-100" : "hover:bg-gray-100"
          }`}
          onClick={() => onSelect(null)}
          title="View your Task Manager"
          aria-current={selectedCategoryId === null ? "page" : undefined}
          aria-label="View current tasks"
        >
          🗂️ Current Tasks
        </button>
      </div>
      <div className="px-3 text-xs uppercase text-gray-500" aria-label="Collections header">
        Collections
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1" role="list" aria-label="Category collections">
        {cats.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-2 group rounded px-3 py-2 ${
              selectedCategoryId === c.id ? "bg-blue-50" : "hover:bg-gray-100"
            }`}
            role="listitem"
          >
            <button
              className="flex items-center gap-3 w-full text-left"
              onClick={() => onSelect(c.id)}
              title={c.name}
              tabIndex={editingId === c.id ? -1 : 0}
              aria-current={selectedCategoryId === c.id ? "page" : undefined}
              aria-label={`Select collection ${c.name}, ${categoryCounts[c.id] ?? 0} items`}
              style={editingId === c.id ? { pointerEvents: "none", opacity: 0.5 } : undefined}
            >
              <span
                style={{ background: `linear-gradient(135deg, ${c.color}33, ${c.color}99)` }}
                className="flex items-center justify-center rounded-full p-1 w-9 h-9 border border-gray-200 shadow-sm"
                aria-hidden="true"
              >
                <span className="text-lg">{c.icon}</span>
              </span>
              {editingId === c.id ? (
                <input
                  className="truncate border rounded px-1 py-0.5 flex-1"
                  value={editingValue}
                  autoFocus
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => saveEdit(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveEdit(c);
                    } else if (e.key === "Escape") {
                      cancelEdit();
                    }
                  }}
                  style={{ minWidth: 0, width: "100%" }}
                  aria-label={`Edit collection name for ${c.name}`}
                />
              ) : (
                <span
                  className="truncate max-w-full transition-colors duration-200 hover:text-blue-600"
                  onDoubleClick={() => startEditing(c)}
                  title="Double-click to edit name"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && document.activeElement === e.currentTarget) {
                      startEditing(c);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                  role="button"
                  aria-label={`Edit collection name ${c.name}`}
                >
                  {c.name}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteCategory(c);
              }}
              title="Delete collection"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-2 py-1 text-lg select-none"
              aria-label={`Delete collection ${c.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={addCategory} className="p-2 border-t flex gap-1 items-center" aria-label="Add new collection form">
        <input
          className="truncate flex-1 rounded border px-1 py-2"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="New collection name"
          aria-label="New collection name"
        />
        <button
          type="submit"
          className="px-2 py-2 rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-md text-white hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 transition-colors duration-200"
          aria-label="Add new collection"
        >
          Add
        </button>
      </form>
    </aside>
  );
}