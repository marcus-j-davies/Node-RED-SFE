const http = require('http');
const express = require('express');
const RED = require('node-red');
const { existsSync } = require('fs');
const { join, dirname } = require('path');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { combine, timestamp, printf } = format;
const nrRuntimeSettings = require('./settings');

/* ------  Don't mess with anything below - unless you're a nerd ;-) ------ */

const logFormat = printf(({ level, message, label, timestamp }) => {
	switch (typeof message) {
		case 'object':
			message = JSON.stringify(message);
			break;
	}
	return `[${timestamp}] ${level}\t${label?.padEnd(23, ' ')}: ${message}`;
});

const consoleLogger = createLogger({
	format: combine(
		format.colorize(),
		timestamp({ format: 'YYYY-MM-DD hh:mm:ss' }),
		logFormat
	),
	transports: [new transports.Console()]
});

let flowLogger;

if (process.pkg !== undefined) {
	const transport = new DailyRotateFile({
		filename: join(dirname(process.argv0), 'sfe-%DATE%.log'),
		datePattern: 'YYYY-MM-DD-HH',
		zippedArchive: true,
		maxSize: '20m',
		maxFiles: '7d'
	});

	flowLogger = createLogger({
		format: combine(timestamp({ format: 'YYYY-MM-DD hh:mm:ss' }), logFormat),
		transports: [transport]
	});
}

// In develop mode?
const develop = process.argv[2] === '--develop';

// The embedded path of the userDir (don't mess)
const ns = '{SFE_PROJECT_DIR}';
const userDir = 'NRUserDir';
const userDirPath = `/snapshot/${ns}/build/${userDir}`;

// File exists?
const checkFileExists = (path) => {
	return existsSync(path);
};

const isEmbedded = checkFileExists(userDirPath);

// Get userDir
const getUserDir = () => {
	if (develop) {
		return join(__dirname, userDir);
	}

	if (process.pkg !== undefined) {
		if (isEmbedded) {
			return userDirPath;
		} else {
			return join(dirname(process.argv0), userDir);
		}
	}
};

// Node-RED log
const nrLog = (level, label, message) => {
	if (process.pkg !== undefined && flowLogger !== undefined) {
		flowLogger.log({ level, label: label, message });
	}
	consoleLogger.log({ level, label: `FLOW:${label}`, message });
};

// Main
const run = async () => {
	console.clear();
	consoleLogger.info({ label: 'Node Version', message: process.versions.node });
	const app = express();
	const server = http.createServer(app);

	delete nrRuntimeSettings.userDir;
	delete nrRuntimeSettings.functionGlobalContext;
	delete nrRuntimeSettings.logging;
	delete nrRuntimeSettings.editorTheme;
	delete nrRuntimeSettings.readOnly;
	delete nrRuntimeSettings.contextStorage.file.config?.dir;

	const nrSettings = {
		userDir: getUserDir(),
		functionGlobalContext: {
			SFELOG: nrLog
		},
		logging: {
			console: {
				level: 'off',
				metrics: false,
				audit: false
			}
		},
		editorTheme: {
			header: {
				title: `Node-RED SFE ${develop ? '[Design Time]' : '[Run Time]'}`
			},
			page: {
				title: `Node-RED SFE ${develop ? '[Design Time]' : '[Run Time]'}`
			},
			projects: {
				enabled: false
			},
			tours: false
		},
		...nrRuntimeSettings
	};

	if (develop) {
		nrSettings.disableEditor = false;
	}

	if (isEmbedded) {
		nrSettings.editorTheme.header.image = `/snapshot/${ns}/build/resources/node-red.png`;
		nrSettings.editorTheme.page.css = `/snapshot/${ns}/build/resources/sfe.css`;
		nrSettings.readOnly = true;

		nrSettings.editorTheme.login = {
			image: `/snapshot/${ns}/build/resources/node-red-256-embedded.png`
		};

		/* Re-configure file context store */
		if (nrSettings.contextStorage.file.config === undefined) {
			nrSettings.contextStorage.file.config = {};
		}
		nrSettings.contextStorage.file.config.dir = join(
			dirname(process.argv0),
			'./'
		);
	} else {
		nrSettings.editorTheme.login = {
			image: `/snapshot/${ns}/build/resources/node-red-256-external.png`
		};
	}

	// Initialize Node-RED with the given settings
	RED.init(server, nrSettings);
	app.use(nrSettings.httpAdminRoot, RED.httpAdmin);
	app.use(nrSettings.httpNodeRoot, RED.httpNode);

	consoleLogger.info({
		label: 'Node-RED Version',
		message: RED.settings.version
	});
	consoleLogger.info({
		label: 'Mode',
		message: develop
			? 'Design Time'
			: isEmbedded
				? 'Run Time (Embedded)'
				: 'Run Time'
	});
	consoleLogger.info({ label: 'Namespace', message: ns });
	consoleLogger.info({
		label: 'Embedded UserDir Found',
		message: isEmbedded.toString()
	});
	consoleLogger.info({ label: 'UserDir', message: getUserDir() });
	consoleLogger.info({ label: 'Flow File', message: nrSettings.flowFile });
	consoleLogger.info({
		label: 'UI Enabled',
		message: (!nrSettings.disableEditor).toString()
	});

	// Start the HTTP server

	server.on('error', (e) => {
		consoleLogger.error({
			label: 'Could Not Start Server',
			message: e.message
		});
	});
	server.on('listening', (e) => {
		RED.start()
			.catch((err) => {
				consoleLogger.error({ label: 'Could not start', message: err.message });
			})
			.then(() => {
				if (!nrSettings.disableEditor) {
					consoleLogger.info({
						label: 'UI Endpoint',
						message: `http://127.0.0.1:${nrSettings.uiPort}${nrSettings.httpAdminRoot}`
					});
				}
			});
	});
	server.listen(nrSettings.uiPort);
};

// Run the main function and handle any errors
run().catch((err) => {
	consoleLogger.error({ label: 'Could not start', message: err.message });
	process.exit(1);
});
