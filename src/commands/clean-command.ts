import type { Dropbox } from "dropbox";
import { DropboxTokenProvider } from "../auth/dropbox-token-provider.ts";

export interface CleanOptions {
	keepCount: number;
}

interface DropboxFileMetadata {
	name: string;
	path_display: string;
	client_modified: string;
	server_modified: string;
}

export class CleanCommand {
	private tokenProvider: DropboxTokenProvider;
	private options: CleanOptions;

	constructor(tokenProvider: DropboxTokenProvider, options: CleanOptions) {
		this.tokenProvider = tokenProvider;
		this.options = options;
	}

	async execute(): Promise<number> {
		console.log("Checking Dropbox folder for files to clean...");

		try {
			const dropbox = await this.tokenProvider.getDropboxClient();
			const files = await this.getDropboxFiles(dropbox);

			if (files.length === 0) {
				console.log("No files found in Dropbox.");
				return 0;
			}

			const count = files.length;
			console.log(`Found ${count} file${count === 1 ? "" : "s"} in Dropbox.`);

			if (files.length <= this.options.keepCount) {
				console.log(
					`No files to clean. Keeping all ${files.length} file${files.length === 1 ? "" : "s"}.`,
				);
				return 0;
			}

			// Sort by server_modified date (newest first)
			const sortedFiles = files.sort((a, b) => {
				const dateA = new Date(a.server_modified).getTime();
				const dateB = new Date(b.server_modified).getTime();
				return dateB - dateA;
			});

			// Keep the newest files, delete the rest
			const filesToKeep = sortedFiles.slice(0, this.options.keepCount);
			const filesToDelete = sortedFiles.slice(this.options.keepCount);

			console.log(`\nKeeping ${this.options.keepCount} newest file${this.options.keepCount === 1 ? "" : "s"}:`);
			filesToKeep.forEach((file, idx) => {
				const date = new Date(file.server_modified).toLocaleString();
				console.log(`  ${idx + 1}. ${file.name} (${date})`);
			});

			if (filesToDelete.length > 0) {
				console.log(`\nDeleting ${filesToDelete.length} older file${filesToDelete.length === 1 ? "" : "s"}:`);
				await this.deleteFiles(dropbox, filesToDelete);
			}

			console.log("\nClean operation completed!");
			return 0;
		} catch (error) {
			console.error("Error during clean operation:", error);
			return 1;
		}
	}

	private async getDropboxFiles(dropbox: Dropbox): Promise<DropboxFileMetadata[]> {
		const files: DropboxFileMetadata[] = [];

		try {
			// List all files in the root folder
			const response = await dropbox.filesListFolder({
				path: "",
				recursive: false,
				include_deleted: false,
			});

			// Filter for files only (not folders)
			for (const entry of response.result.entries) {
				if (entry[".tag"] === "file") {
					files.push({
						name: entry.name,
						path_display: entry.path_display || entry.path_lower || "",
						client_modified: (entry as any).client_modified || "",
						server_modified: (entry as any).server_modified || "",
					});
				}
			}

			// Handle pagination if there are more files
			let cursor = response.result.cursor;
			let hasMore = response.result.has_more;

			while (hasMore) {
				const continueResponse = await dropbox.filesListFolderContinue({
					cursor: cursor,
				});

				for (const entry of continueResponse.result.entries) {
					if (entry[".tag"] === "file") {
						files.push({
							name: entry.name,
							path_display: entry.path_display || entry.path_lower || "",
							client_modified: (entry as any).client_modified || "",
							server_modified: (entry as any).server_modified || "",
						});
					}
				}

				cursor = continueResponse.result.cursor;
				hasMore = continueResponse.result.has_more;
			}
		} catch (error) {
			console.error("Error listing Dropbox files:");
			throw error;
		}

		return files;
	}

	private async deleteFiles(
		dropbox: Dropbox,
		files: DropboxFileMetadata[],
	): Promise<void> {
		for (const file of files) {
			try {
				const timestamp = new Date().toLocaleTimeString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				});

				console.log(`[${timestamp}] Deleting ${file.name}...`);
				const startTime = performance.now();

				await dropbox.filesDeleteV2({
					path: file.path_display,
				});

				const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
				console.log(`  ✓ Deleted successfully (${elapsed}s)`);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(`  ✗ ERROR: ${errorMessage}`);
			}
		}
	}
}
