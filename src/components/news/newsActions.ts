export interface NewsRef {
  title: string;
  url: string;
  description?: string;
  source?: string;
}

export interface NewsActions {
  readLater: (ref: NewsRef) => void;
  saveTask: (ref: NewsRef) => void;
  saveJournal: (ref: NewsRef) => void;
}
