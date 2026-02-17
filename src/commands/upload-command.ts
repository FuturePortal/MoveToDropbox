import { join } from "@std/path";
import { exists } from "@std/fs";
import type { Dropbox } from "dropbox";
import { DropboxTokenProvider } from "../auth/dropbox-token-provider.ts";

export interface UploadOptions {
	uploadsDir: string;
	deleteAfterUpload: boolean;
}

export class UploadCommand {
	private tokenProvider: DropboxTokenProvider;
	private options: UploadOptions;

	constructor(tokenProvider: DropboxTokenProvider, options: UploadOptions) {
		this.tokenProvider = tokenProvider;
		this.options = options;
	}

	async execute(): Promise<number> {
		console.log("Checking files to upload...");

		const files = await this.getLocalFiles();

		if (files.length === 0) {
			console.log("No files to upload.");
			return 0;
		}

		const count = files.length;
		console.log(`Found ${count} file${count === 1 ? "" : "s"}.`);

		try {
			await this.uploadFiles(files);
			return 0;
		} catch (error) {
			console.error("Error during upload:", error);
			return 1;
		}
	}

	private async getLocalFiles(): Promise<string[]> {
		const uploadsPath = this.options.uploadsDir;

		if (!(await exists(uploadsPath))) {
			console.error(`Uploads directory not found: ${uploadsPath}`);
			return [];
		}

		const files: string[] = [];
		for await (const entry of Deno.readDir(uploadsPath)) {
			if (entry.isFile) {
				files.push(entry.name);
			}
		}

		return files;
	}

	private async uploadFiles(files: string[]): Promise<void> {
		let dropbox: Dropbox;

		try {
			dropbox = await this.tokenProvider.getDropboxClient();
		} catch (error) {
			console.error("Error setting up Dropbox client:");
			console.error(error);
			throw error;
		}

		console.log("Uploading files to Dropbox...");

		for (const file of files) {
			try {
				const localFile = join(this.options.uploadsDir, file);
				const fileInfo = await Deno.stat(localFile);
				const fileSizeMB = (fileInfo.size / (1024 * 1024)).toFixed(2);

				const timestamp = new Date().toLocaleTimeString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				});

				console.log(`[${timestamp}] Uploading ${file} (${fileSizeMB}MB)...`);
				const startTime = performance.now();

				// Use appropriate upload method based on file size
				const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB - Dropbox's limit for filesUpload

				if (fileInfo.size <= CHUNK_SIZE) {
					// Small file: use simple upload
					await this.uploadSmallFile(dropbox, localFile, file);
				} else {
					// Large file: use chunked upload session
					await this.uploadLargeFile(dropbox, localFile, file, fileInfo.size);
				}

				const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
				console.log(`  ✓ Upload successful (${elapsed}s)`);

				// Delete local file if requested
				if (this.options.deleteAfterUpload) {
					await Deno.remove(localFile);
					console.log("  ✓ Local file deleted");
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(`  ✗ ERROR: ${errorMessage}`);
			}
		}

		console.log("Done uploading!");
	}

	private async uploadSmallFile(
		dropbox: Dropbox,
		localFile: string,
		remoteName: string,
	): Promise<void> {
		const fileContents = await Deno.readFile(localFile);

		await dropbox.filesUpload({
			path: `/${remoteName}`,
			contents: fileContents,
			mode: { ".tag": "overwrite" },
			autorename: false,
			mute: false,
		});
	}

	private async uploadLargeFile(
		dropbox: Dropbox,
		localFile: string,
		remoteName: string,
		fileSize: number,
	): Promise<void> {
		const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks for upload session
		const file = await Deno.open(localFile, { read: true });

		try {
			let sessionId: string | undefined;
			let offset = 0;
			const buffer = new Uint8Array(CHUNK_SIZE);

			while (offset < fileSize) {
				const bytesRead = await file.read(buffer);
				if (bytesRead === null) break;

				const chunk = buffer.subarray(0, bytesRead);

				if (!sessionId) {
					// Start upload session with first chunk
					const response = await dropbox.filesUploadSessionStart({
						contents: chunk,
						close: false,
					});
					sessionId = response.result.session_id;
				} else {
					// Append subsequent chunks
					await dropbox.filesUploadSessionAppendV2({
						cursor: {
							session_id: sessionId,
							offset: offset,
						},
						contents: chunk,
						close: false,
					});
				}

				offset += bytesRead;

				// Show progress for large files
				const progress = ((offset / fileSize) * 100).toFixed(1);
				console.log(`  uploading at ${progress}%`);
			}

			// Finish the upload session
			if (sessionId) {
				await dropbox.filesUploadSessionFinish({
					cursor: {
						session_id: sessionId,
						offset: offset,
					},
					commit: {
						path: `/${remoteName}`,
						mode: { ".tag": "overwrite" },
						autorename: false,
						mute: false,
					},
				});
			}
		} finally {
			file.close();
		}
	}
}
