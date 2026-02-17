import { Dropbox } from "dropbox";

export interface DropboxCredentials {
	appKey: string;
	appSecret: string;
	refreshToken: string;
}

export class DropboxTokenProvider {
	private credentials: DropboxCredentials;
	private cachedToken: string | null = null;
	private tokenExpiry: number | null = null;

	constructor(credentials: DropboxCredentials) {
		this.credentials = credentials;
	}

	async getAccessToken(): Promise<string> {
		// Return cached token if it's still valid (with 5 minute buffer)
		if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
			return this.cachedToken;
		}

		// Refresh the access token
		const response = await fetch("https://api.dropbox.com/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: this.credentials.refreshToken,
				client_id: this.credentials.appKey,
				client_secret: this.credentials.appSecret,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to refresh Dropbox token: ${error}`);
		}

		const data = await response.json();
		this.cachedToken = data.access_token;
		// Set expiry (usually 4 hours, but we'll use the expires_in if provided)
		this.tokenExpiry = Date.now() + (data.expires_in || 14400) * 1000;

		return this.cachedToken!;
	}

	async getDropboxClient(): Promise<Dropbox> {
		const accessToken = await this.getAccessToken();
		return new Dropbox({ accessToken });
	}
}
