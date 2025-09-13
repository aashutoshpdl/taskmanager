export interface Category {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}

export interface Note {
  id: string;
  userId: string;
  categoryId: string;
  text: string;
  createdAt: Date;
  sender?: string;
  date?: string;
  time?: string;
}

export interface LinkItem {
  id: string;
  userId: string;
  categoryId: string;
  url: string;
  title?: string;
  createdAt: Date;
}

export interface ArchiveFileMeta {
  id: string;
  userId: string;
  categoryId: string;
  storagePath: string;
  filename: string;
  createdAt: Date;
}
