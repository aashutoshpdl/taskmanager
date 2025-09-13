/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchPageTitle } from "../utils/fetchTitle";
// Helper: mapWithConcurrency with error handling
async function mapWithConcurrency<T, U>(
  items: T[],
  mapper: (item: T, idx: number) => Promise<U>,
  concurrency = 5
): Promise<U[]> {
  const results: U[] = [];
  let i = 0;
  const workers = Array(concurrency)
    .fill(null)
    .map(async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          results[idx] = await mapper(items[idx], idx);
        } catch (error) {
          console.error(`Error processing item at index ${idx}:`, error);
          results[idx] = null as unknown as U; // preserve array length, assign null for failed
        }
      }
    });
  await Promise.all(workers);
  return results;
}


import React, { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/useauth";
import { extractLinks } from "../utils/extract";
import { parseChatGPTJson } from "../utils/parseChatGPT";
import { parseWhatsAppStructured } from "../utils/parseWhatsAppStructured";
import { supabase } from "../supabaseClient";

interface Props {
  categoryId: string;
}

interface Message {
  date: string;
  time: string;
  sender: string;
  content: string;
}

interface UrlTitlePair {
  url: string;
  title: string;
}

const ArchiveUploader: React.FC<Props> = ({ categoryId }) => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setBusy(true);
    try {
      // 1) Read file content as text
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder().decode(buffer);

      // 2) Detect format and parse messages
      let parsedMessages: Message[] | null = null;

      if (file.name.toLowerCase().endsWith(".json")) {
        const merged = parseChatGPTJson(text);
        parsedMessages = merged
          ? [{ date: "", time: "", sender: "ChatGPT", content: merged }]
          : null;
      }

      if (!parsedMessages && file.name.toLowerCase().endsWith(".txt")) {
        parsedMessages = parseWhatsAppStructured(text);
        if (!parsedMessages?.length) {
          parsedMessages = [{ date: "", time: "", sender: "unknown", content: text }];
        }
      }

      if (!parsedMessages) {
        parsedMessages = [{ date: "", time: "", sender: "unknown", content: text }];
      }

      // 3) Upload file to Supabase storage
      const filePath = `archives/${user.uid}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("archives")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 4) Write archive metadata to Firestore
      await addDoc(collection(db, "archives"), {
        userId: user.uid,
        categoryId,
        storagePath: filePath,
        filename: file.name,
        createdAt: serverTimestamp(),
      });

      // 5) Insert messages and links asynchronously with rate limiting and error handling
      for (const msg of parsedMessages) {
        if (!msg.content.trim()) {
          // Skip empty content
          continue;
        }

        // Insert text message with metadata
        await addDoc(collection(db, "notes"), {
          userId: user.uid,
          categoryId,
          sender: msg.sender,
          text: msg.content,
          date: msg.date,
          time: msg.time,
          createdAt: serverTimestamp(),
        });

        // Extract links from message content
        const links = extractLinks(msg.content);
        if (links.length === 0) {
          continue; // no links to process
        }

        // Fetch titles for all links with concurrency limit 5
        const urlTitlePairs: UrlTitlePair[] = await mapWithConcurrency(
          links,
          async (url) => {
            const title = await fetchPageTitle(url);
            return { url, title: title || url };
          },
          5
        );

        // Save each link with its title in Firestore sequentially to avoid write spikes
        for (const { url, title } of urlTitlePairs) {
          if (!url) continue;
          await addDoc(collection(db, "links"), {
            userId: user.uid,
            categoryId,
            url,
            title,
            createdAt: serverTimestamp(),
          });
          // Optional: uncomment to add gentle rate limiting
          // await sleep(100);
        }
      }

      alert("Imported & appended ✅ (notes + simple links)");
    } catch (err) {
      console.error(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert("Upload failed: " + (err as any).message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="bg-gray-100 border px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
        {busy ? "Uploading..." : "Upload Export (.txt/.json)"}
        <input
          type="file"
          className="hidden"
          accept=".txt,.json"
          onChange={handleFile}
          disabled={busy}
        />
      </label>
    </div>
  );
};

export default ArchiveUploader;
// Optional: Update links with missing titles (gentle rate-limiting)
/*
import { getDocs, query, where, updateDoc, doc } from "firebase/firestore";

interface LinkDoc {
  url: string;
  title: string | null;
}

async function updateMissingTitles(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(db, "links"),
      where("userId", "==", userId),
      where("title", "==", null)
    )
  );

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as LinkDoc;
    const url = data.url;
    const title = await fetchPageTitle(url);
    if (title) await updateDoc(doc(db, "links", docSnap.id), { title });
    await new Promise((res) => setTimeout(res, 500)); // gentle rate limit
  }
}
*/