// ── Shared Types ──

export interface UserCredential {
  email: string;
  password?: string;
}

export interface AuthResult {
  email: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RUNNING';
  statusCode?: number;
  accessToken?: string;
  refreshToken?: string;
  errorMessage?: string;
  latencyMs?: number;
  timestamp: string;
}

export interface SignedInUser {
  email: string;
  accessToken: string;
  refreshToken?: string;
}

export interface Contest {
  contest_id: string;
  id?: string;
  contest_title: string;
  title?: string;
  description: string;
  contest_image: string;
  thumbnail?: string;
  start_date: string;
  end_date: string;
  announcement_date?: string;
  status: string;
  prize: any;
  prizes?: any;
  prizes_config?: any;
  participant_count: number;
  has_joined?: boolean;
  top_participants?: { id?: string; user_id?: string; profile_picture_url: string }[];
}

export interface ContestJoinResult {
  email: string;
  status: 'PENDING' | 'INITIATING' | 'UPLOADING' | 'COMPLETING' | 'SUCCESS' | 'FAILED';
  progress?: number; // 0-100 for upload
  entryId?: string;
  errorMessage?: string;
  latencyMs?: number;
  assignedImage?: string; // file name
  memeTitle?: string;
  timestamp: string;
}

export interface MemeMetadata {
  meme_title: string;
  description?: string;
  meme_type?: 'meme' | 'flash' | 'contest';
  tags?: string;
  categories?: string;
  meme_status?: 'active' | 'draft' | 'queued';
}

export interface LogEntry {
  text: string;
  type: 'info' | 'success' | 'error' | 'warn';
  time: string;
}

export type ModuleTab = 'bulk-signin' | 'contest-join';
