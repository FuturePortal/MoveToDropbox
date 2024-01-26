<?php

namespace FuturePortal\DropboxUploader;

require __DIR__ . '/vendor/autoload.php';

use FuturePortal\DropboxUploader\Command\UploadCommand;
use Symfony\Component\Console\Application;

$application = new Application(
	name: 'FuturePortal/DropboxUploader',
);

$application->add(new UploadCommand());

$application->run();
