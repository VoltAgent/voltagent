import type { Agent } from "../../../agent/agent";
import type { OperationContext } from "../../../agent/types";

export type MaybePromise<T> = T | Promise<T>;

export interface FileInfo {
  path: string;
  is_dir?: boolean;
  size?: number;
  modified_at?: string;
  created_at?: string;
}

export interface GrepMatch {
  path: string;
  line: number;
  text: string;
}

export interface FileData {
  content: string[];
  created_at: string;
  modified_at: string;
}

export interface WriteResult {
  error?: string;
  path?: string;
  filesUpdate?: Record<string, FileData | null> | null;
  metadata?: Record<string, unknown>;
}

export interface WriteOptions {
  overwrite?: boolean;
}

export interface EditResult {
  error?: string;
  path?: string;
  filesUpdate?: Record<string, FileData | null> | null;
  occurrences?: number;
  metadata?: Record<string, unknown>;
}

export interface DeleteResult {
  error?: string;
  path?: string;
  filesUpdate?: Record<string, FileData | null> | null;
  metadata?: Record<string, unknown>;
}

export interface DeleteOptions {
  recursive?: boolean;
}

export interface MkdirResult {
  error?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

export interface RmdirResult {
  error?: string;
  path?: string;
  filesUpdate?: Record<string, FileData | null> | null;
  metadata?: Record<string, unknown>;
}

export interface FilesystemBackend {
  lsInfo(path: string): MaybePromise<FileInfo[]>;
  read(filePath: string, offset?: number, limit?: number): MaybePromise<string>;
  readRaw(filePath: string): MaybePromise<FileData>;
  stat?(filePath: string): MaybePromise<FileInfo | null>;
  exists?(filePath: string): MaybePromise<boolean>;
  grepRaw(
    pattern: string,
    path?: string | null,
    glob?: string | null,
  ): MaybePromise<GrepMatch[] | string>;
  globInfo(pattern: string, path?: string): MaybePromise<FileInfo[]>;
  write(filePath: string, content: string, options?: WriteOptions): MaybePromise<WriteResult>;
  edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean,
  ): MaybePromise<EditResult>;
  delete?(filePath: string, options?: DeleteOptions): MaybePromise<DeleteResult>;
  mkdir?(path: string, recursive?: boolean): MaybePromise<MkdirResult>;
  rmdir?(path: string, recursive?: boolean): MaybePromise<RmdirResult>;
}

export type FilesystemBackendContext = {
  agent?: Agent;
  operationContext?: OperationContext;
  state: {
    files?: Record<string, FileData>;
    directories?: Set<string>;
  };
};

export type FilesystemBackendFactory = (context: FilesystemBackendContext) => FilesystemBackend;
