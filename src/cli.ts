#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net

import { load } from "@std/dotenv";
import { join, dirname, fromFileUrl } from "@std/path";
import { DropboxTokenProvider } from "./auth/dropbox-token-provider.ts";
import { UploadCommand } from "./commands/upload-command.ts";

async function main() {
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

	// Create and execute upload command
	const uploadsDir = Deno.env.get("UPLOADS_DIR") || "/app/uploads";
	const uploadCommand = new UploadCommand(tokenProvider, {
		uploadsDir,
		deleteAfterUpload: true,
	});

	const exitCode = await uploadCommand.execute();
	Deno.exit(exitCode);
}

if (import.meta.main) {
	main();
}
