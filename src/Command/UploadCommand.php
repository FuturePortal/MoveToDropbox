<?php

namespace FuturePortal\DropboxUploader\Command;

use Dotenv\Dotenv;
use FuturePortal\DropboxUploader\Auth\DropboxTokenProvider;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Spatie\Dropbox\Client;

#[AsCommand(
	name: 'upload',
	description: 'Uploads all files to the cloud.',
)]
class UploadCommand extends Command
{
	protected function execute(InputInterface $input, OutputInterface $output): int
	{
		$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
		if (file_exists(__DIR__ . '/../.env')) {
			$dotenv->load();
		}

		$dotenv->required('DROPBOX_APP_KEY');
		$dotenv->required('DROPBOX_APP_SECRET');
		$dotenv->required('DROPBOX_REFRESH_TOKEN');

		$files = $this->getLocalFiles($output);

		if (count($files) === 0) {
			$output->writeln('No files to upload.');
			return Command::SUCCESS;
		}

		try {
			$this->uploadFiles($files, $output);
		} catch (\Exception $exception) {
			return Command::FAILURE;
		}

		return Command::SUCCESS;
	}

	private function getLocalFiles(OutputInterface $output): array
	{
		$output->writeln('Checking files to upload...');

		$files = scandir(__DIR__ . '/../uploads');

		$files = array_filter($files, function($file) {
			return $file !== '.' && $file !== '..';
		});

		$count = count($files);
		$output->writeln('Found ' . $count . ' file' . ($count === 1 ? '' : 's') . '.');

		return $files;
	}

	private function uploadFiles(array $files, OutputInterface $output): void
	{
		try {
			$tokenProvider = new DropboxTokenProvider();
			$client = new Client($tokenProvider);
		} catch (\Exception $exception) {
			$output->writeln("Error setting up dropbox client.");
			$output->writeln($exception->getMessage());
			throw $exception;
		}

		$output->writeln('Uploading files to the cloud...');

		foreach ($files as $file) {
			$output->write("Uploading $file... ");
			try {
				$localFile = __DIR__ . '/../uploads/' . $file;

				$client->upload($file, file_get_contents($localFile));

				$output->write("OK");
				unlink($localFile);
				$output->writeln(".");
			}
			catch (\Exception $exception) {
				$output->writeln("ERROR");
				$output->writeln($exception->getMessage());
			}
		}

		$output->writeln('Done uploading!');
	}

	// private function getOnlineFiles(OutputInterface $output): array
	// {
	// 	$output->writeln('Checking files in the cloud...');
	//
	// 	$tokenProvider = new DropboxTokenProvider();
	// 	$client = new Client($tokenProvider);
	//
	// 	$files = $client->listFolder()['entries'];
	//
	// 	foreach ($files as $file) {
	// 		$output->writeln(' - ' . $file['name']);
	// 	}
	//
	// 	// [.tag] => file
	// 	// [name] => 2024-01-13-home-assistant.tar
	// 	// [path_lower] => /2024-01-13-home-assistant.tar
	// 	// [path_display] => /2024-01-13-home-assistant.tar
	// 	// [id] => id:e7tN9Yj6WMIAAAAAAAAAGQ
	// 	// [client_modified] => 2024-01-13T04:00:01Z
	// 	// [server_modified] => 2024-01-13T04:00:04Z
	// 	// [rev] => 60ecbd0c8efc0854ab923
	// 	// [size] => 9881600
	// 	// [is_downloadable] => 1
	// 	// [content_hash] => 4fda9fbf698cd7e42d2f3e1dae29738fd63ae291a85b377c3880e27ca540036
	//
	// 	return [];
	// }
}
