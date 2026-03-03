"use client";

import { useCallback, useEffect, useState } from "react";

const DB_NAME = "homefinance-offline";
const STORE_NAME = "expenses";
const KEY = "queue";

export interface QueuedExpense {
  tempId: string;
  categoryId: number;
  amount: number;
  note?: string;
  date: string;
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "tempId" });
    };
  });
}

export async function getQueue(): Promise<QueuedExpense[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function addToQueue(entry: QueuedExpense): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearQueue(tempIds: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const id of tempIds) {
      store.delete(id);
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedExpense[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const refreshQueue = useCallback(async () => {
    const q = await getQueue();
    setQueue(q);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsOnline(navigator.onLine);
    refreshQueue();
    const onOnline = () => {
      setIsOnline(true);
      refreshQueue();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshQueue]);

  const syncQueue = useCallback(async () => {
    const q = await getQueue();
    if (q.length === 0) return;
    const res = await fetch("/api/expenses/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: q.map((e) => ({
          tempId: e.tempId,
          categoryId: e.categoryId,
          amount: e.amount,
          note: e.note,
          date: e.date,
        })),
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const syncedIds = (data.synced as Array<{ tempId: string }>).map((s) => s.tempId);
    await clearQueue(syncedIds);
    await refreshQueue();
  }, [refreshQueue]);

  return { queue, isOnline, addToQueue, refreshQueue, syncQueue };
}
