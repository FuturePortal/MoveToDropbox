<?php

namespace FuturePortal\DropboxUploader\Auth;

use Spatie\Dropbox\TokenProvider;
use Stevenmaguire\OAuth2\Client\Provider\Dropbox;

class DropboxTokenProvider implements TokenProvider
{
	public function getToken(): string
	{
		$authClient = new Dropbox([
			'clientId' => $_ENV['DROPBOX_APP_KEY'],
			'clientSecret' => $_ENV['DROPBOX_APP_SECRET'],
			// 'redirectUri' => '' // no redirect, we want a long-lasting offline token
		]);

		// Try to get an access token (using the authorization code grant)
		$token = $authClient->getAccessToken('refresh_token', [
			'refresh_token' => $_ENV['DROPBOX_REFRESH_TOKEN']
		]);

		return $token->getToken();
	}
}
