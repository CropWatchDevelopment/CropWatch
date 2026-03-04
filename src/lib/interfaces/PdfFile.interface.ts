export interface FileMetadata {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string; // ISO datetime
    contentLength: number;
    httpStatusCode: number;
}

export interface PdfFile {
    name: string;
    id: string; // UUID
    updated_at: string; // ISO datetime
    created_at: string; // ISO datetime
    last_accessed_at: string; // ISO datetime
    metadata: FileMetadata;
}