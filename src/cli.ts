#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net

import { load } from "@std/dotenv";
import { join, dirname, fromFileUrl } from "@std/path";
import { DropboxTokenProvider } from "./auth/dropbox-token-provider.ts";
import { UploadCommand } from "./commands/upload-command.ts";
import { CleanCommand } from "./commands/clean-command.ts";

async function main() {
	// Get command from arguments (default to upload for backward compatibility)
	const command = Deno.args[0] || "upload";

	if (!["upload", "clean"].includes(command)) {
		console.error(`Error: Unknown command '${command}'`);
		console.error("Available commands: upload, clean");
		Deno.exit(1);
	}

	// Load environment variables from .env file
	const moduleDir = dirname(fromFileUrl(import.meta.url));
	const projectRoot = join(moduleDir, "..");

	try {
		await load({ envPath: join(projectRoot, ".env"), export: true });
	} catch {
		// .env file not found, continue with existing environment variables
	}

	// Validate required environment variables
	const requiredVars = ["DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN"];
	const missing = requiredVars.filter((v) => !Deno.env.get(v));

	if (missing.length > 0) {
		console.error("Error: Missing required environment variables:");
		missing.forEach((v) => console.error(`  - ${v}`));
		console.error("\nPlease set these in your .env file or environment.");
		Deno.exit(1);
	}

	// Create token provider
	const tokenProvider = new DropboxTokenProvider({
		appKey: Deno.env.get("DROPBOX_APP_KEY")!,
		appSecret: Deno.env.get("DROPBOX_APP_SECRET")!,
		refreshToken: Deno.env.get("DROPBOX_REFRESH_TOKEN")!,
	});

	let exitCode: number;

	switch (command) {
		case "upload": {
			// Create and execute upload command
			const uploadsDir = Deno.env.get("UPLOADS_DIR") || "/app/uploads";
			const uploadCommand = new UploadCommand(tokenProvider, {
				uploadsDir,
				deleteAfterUpload: true,
			});

			exitCode = await uploadCommand.execute();
			break;
		}

		case "clean": {
			// Create and execute clean command
			const keepCount = parseInt(Deno.env.get("DROPBOX_KEEP_FILES") || "10", 10);

			if (isNaN(keepCount) || keepCount < 1) {
				console.error(
					`Error: Invalid DROPBOX_KEEP_FILES value. Must be a positive number, got: ${Deno.env.get("DROPBOX_KEEP_FILES")}`,
				);
				Deno.exit(1);
			}

			const cleanCommand = new CleanCommand(tokenProvider, { keepCount });
			exitCode = await cleanCommand.execute();
			break;
		}

		default:
			console.error(`Error: Unknown command '${command}'`);
			console.error("Available commands: upload, clean");
			exitCode = 1;
	}

	Deno.exit(exitCode);
}

if (import.meta.main) {
	main();
}
