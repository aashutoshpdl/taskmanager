import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  getDocs,
  limit,
  QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/useauth";
import type { Note, LinkItem } from "../types";
import ArchiveUploader from "./ArchiveUploader";
import { fetchPageTitle } from "../utils/fetchTitle";

interface Props {
  categoryId: string; // required
}

const CategoryView: React.FC<Props> = ({ categoryId }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"text" | "links">("text");
  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [linkDraft, setLinkDraft] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;

    const nq = query(
      collection(db, "notes"),
      where("userId", "==", user.uid),
      where("categoryId", "==", categoryId),
      orderBy("createdAt", "desc")
    );
    const lq = query(
      collection(db, "links"),
      where("userId", "==", user.uid),
      where("categoryId", "==", categoryId),
      orderBy("createdAt", "desc")
    );

    // Subscribe to notes snapshot
    const un1 = onSnapshot(nq, (snap: QuerySnapshot<DocumentData>) => {
      setNotes(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            userId: x.userId,
            categoryId: x.categoryId,
            text: x.text,
            createdAt: x.createdAt?.toDate?.() ?? new Date(),
            sender: x.sender ?? "",
            date: x.date ?? "",
            time: x.time ?? "",
          } as Note;
        })
      );
    });

    // Subscribe to links snapshot
    const un2 = onSnapshot(lq, (snap: QuerySnapshot<DocumentData>) => {
      setLinks(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            userId: x.userId,
            categoryId: x.categoryId,
            url: x.url,
            title: x.title,
            createdAt: x.createdAt?.toDate?.() ?? new Date(),
          };
        })
      );
    });

    return () => {
      un1();
      un2();
    };
  }, [user, categoryId]);

  // Add new note handler with error handling and useCallback
  const addNote = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      const trimmedNote = noteDraft.trim();
      if (!trimmedNote) return;

      try {
        await addDoc(collection(db, "notes"), {
          userId: user.uid,
          categoryId,
          text: trimmedNote,
          createdAt: serverTimestamp(),
        });
        setNoteDraft("");
      } catch (error) {
        console.error("Failed to add note:", error);
        alert("Failed to add note. Please try again.");
      }
    },
    [user, categoryId, noteDraft]
  );

  // Add new link handler with error handling and useCallback
  const addLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      const trimmedUrl = linkDraft.trim();
      if (!trimmedUrl) return;

      try {
        // Check for duplicate URL in current category for this user
        const duplicateQuery = query(
          collection(db, "links"),
          where("userId", "==", user.uid),
          where("categoryId", "==", categoryId),
          where("url", "==", trimmedUrl),
          limit(1)
        );
        const duplicateSnap: QuerySnapshot<DocumentData> = await getDocs(duplicateQuery);
        if (!duplicateSnap.empty) {
          alert("This link already exists in this category.");
          return;
        }

        let title = trimmedUrl;
        try {
          // Fetch page title via Supabase Edge Function
          const fetchedTitle = await fetchPageTitle(trimmedUrl);
          if (fetchedTitle) {
            title = fetchedTitle;
          }
        } catch {
          // Fallback to raw URL if fetching title fails
          title = trimmedUrl;
        }

        await addDoc(collection(db, "links"), {
          userId: user.uid,
          categoryId,
          url: trimmedUrl,
          title,
          createdAt: serverTimestamp(),
        });
        setLinkDraft("");
      } catch (error) {
        console.error("Failed to add link:", error);
        alert("Failed to add link. Please try again.");
      }
    },
    [user, categoryId, linkDraft]
  );

  // Delete single item handler with useCallback
  const handleDelete = useCallback(
    async (col: "notes" | "links", id: string) => {
      if (window.confirm("Are you sure you want to delete this item?")) {
        try {
          await deleteDoc(doc(db, col, id));
        } catch (error) {
          console.error(`Failed to delete ${col} item:`, error);
          alert("Failed to delete item. Please try again.");
        }
      }
    },
    []
  );

  // Delete all items in a collection handler with useCallback
  const handleDeleteAll = useCallback(
    async (col: "notes" | "links") => {
      if (
        window.confirm(
          `This will permanently delete ALL ${col} in this category. Continue?`
        )
      ) {
        try {
          const qRef = query(
            collection(db, col),
            where("userId", "==", user?.uid),
            where("categoryId", "==", categoryId)
          );
          const snap = await getDocs(qRef);
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        } catch (error) {
          console.error(`Failed to delete all ${col}:`, error);
          alert("Failed to delete all items. Please try again.");
        }
      }
    },
    [user, categoryId]
  );

  // Memoized filtered notes with early return for empty query
  const filteredNotes = useMemo(() => {
    if (!q.trim()) return notes;
    const lowerQ = q.toLowerCase();
    return notes.filter((n) => n.text.toLowerCase().includes(lowerQ));
  }, [notes, q]);

  // Memoized filtered links with early return for empty query
  const filteredLinks = useMemo(() => {
    if (!q.trim()) return links;
    const lowerQ = q.toLowerCase();
    return links.filter((l) =>
      (l.url + " " + (l.title ?? "")).toLowerCase().includes(lowerQ)
    );
  }, [links, q]);

  // Export category data as JSON and TXT file
  const exportCategory = () => {
    const exportedAt = new Date().toISOString();

    // JSON export
    const payload = {
      categoryId,
      exportedAt,
      notes: notes.map((n) => ({
        text: n.text,
        sender: n.sender || "",
        date: n.date || "",
        time: n.time || "",
        createdAt: n.createdAt.toISOString(),
      })),
      links: links.map((l) => ({
        url: l.url,
        title: l.title || l.url,
        createdAt: l.createdAt.toISOString(),
      })),
    };
    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonA = document.createElement("a");
    jsonA.href = jsonUrl;
    jsonA.download = `collection_${categoryId}.json`;
    jsonA.click();
    URL.revokeObjectURL(jsonUrl);

    // TXT export
    const lines: string[] = [];

    notes.forEach((n) => {
      const dateStr = n.date || n.createdAt.toLocaleDateString();
      const timeStr = n.time || n.createdAt.toLocaleTimeString();
      const sender = n.sender || "Me";
      lines.push(`[${dateStr}, ${timeStr}] ${sender}: ${n.text}`);
    });

    links.forEach((l) => {
      const dateStr = l.createdAt.toLocaleDateString();
      const timeStr = l.createdAt.toLocaleTimeString();
      const title = l.title || "";
      lines.push(`[${dateStr}, ${timeStr}] ${title}: ${l.url}`);
    });

    const txtBlob = new Blob([lines.join("\n")], { type: "text/plain" });
    const txtUrl = URL.createObjectURL(txtBlob);
    const txtA = document.createElement("a");
    txtA.href = txtUrl;
    txtA.download = `collection_${categoryId}.txt`;
    txtA.click();
    URL.revokeObjectURL(txtUrl);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="inline-flex bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Category Tabs">
          <button
            type="button"
            aria-selected={tab === "text"}
            aria-controls="text-tab"
            className={`px-3 py-1 rounded-xl ${
              tab === "text" ? "bg-white shadow" : ""
            }`}
            onClick={() => setTab("text")}
          >
            Text
          </button>
          <button
            type="button"
            aria-selected={tab === "links"}
            aria-controls="links-tab"
            className={`px-3 py-1 rounded-xl ${
              tab === "links" ? "bg-white shadow" : ""
            }`}
            onClick={() => setTab("links")}
          >
            Links
          </button>
        </div>
        <input
          type="search"
          aria-label="Search in this collection"
          className="border rounded px-3 py-2 flex-1"
          placeholder="Search in this collection..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ArchiveUploader categoryId={categoryId} />
        <button
          type="button"
          onClick={exportCategory}
          aria-label="Export collection as JSON"
          className="border px-3 py-2 rounded hover:bg-gray-50"
        >
          Export JSON/TXT
        </button>
      </div>

      {tab === "text" ? (
        <>
          <form onSubmit={addNote} className="mb-3" aria-label="Add text note form">
            <textarea
              aria-label="Write or paste text"
              className="w-full border rounded p-2"
              rows={4}
              placeholder="Write or paste text…"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <div className="flex justify-between mt-2">
              <button
                type="button"
                onClick={() => handleDeleteAll("notes")}
                className="text-red-500 text-sm"
                aria-label="Delete all text notes"
              >
                Delete All Texts
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded"
                aria-label="Add text note"
              >
                Add Text
              </button>
            </div>
          </form>
          <div
            id="text-tab"
            role="tabpanel"
            className="flex-1 overflow-y-auto space-y-3"
          >
            {filteredNotes.length === 0 && (
              <div className="text-gray-500 text-sm">No text found.</div>
            )}
            {filteredNotes.map((n) => (
              <article
                key={n.id}
                className="bg-gray-50 border rounded-xl p-3 relative"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {n.createdAt.toLocaleString()}
                </div>
                <pre className="whitespace-pre-wrap break-words text-sm">
                  {n.text}
                </pre>
                <button
                  type="button"
                  onClick={() => handleDelete("notes", n.id)}
                  className="absolute top-2 right-2 text-red-500 text-xs"
                  aria-label="Delete this text note"
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={addLink} className="mb-3 flex gap-2" aria-label="Add link form">
            <input
              type="url"
              aria-label="Add new link URL"
              className="flex-1 border rounded p-2"
              placeholder="https://example.com/…"
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 rounded"
              aria-label="Add link"
            >
              Add Link
            </button>
          </form>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600" aria-live="polite" aria-atomic="true">
              {filteredLinks.length} links
            </span>
            <button
              type="button"
              onClick={() => handleDeleteAll("links")}
              className="text-red-500 text-sm"
              aria-label="Delete all links"
            >
              Delete All Links
            </button>
          </div>
          <div
            id="links-tab"
            role="tabpanel"
            className="flex-1 overflow-y-auto space-y-2"
          >
            {filteredLinks.length === 0 && (
              <div className="text-gray-500 text-sm">No links found.</div>
            )}
            {filteredLinks.map((l) => (
              <div
                key={l.id}
                className="bg-gray-50 border rounded-xl p-3 flex items-center justify-between"
              >
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate underline"
                >
                  {l.title ?? l.url}
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete("links", l.id)}
                  className="text-red-500 text-sm"
                  aria-label={`Delete link to ${l.title ?? l.url}`}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryView;