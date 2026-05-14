export interface ChatMessage {
  role: 'bot' | 'user' | string;
  content: string;
  html?: string;
}

export interface ChatIndexStatus {
  is_indexed?: boolean;
}
