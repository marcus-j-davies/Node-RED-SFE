const http = require('http');
const express = require('express');
const RED = require('node-red');
const fs = require('fs');
const { join, dirname } = require('path');
const nrRuntimeSettings = require('./settings');
const open = require('open');
const AdmZip = require('adm-zip');
const args = require('args-parser')(process.argv);
const {
	userDir,
	noLoadUserDir,
	localesDir,
	ns,
	flowsFile
} = require('./constants');

/* ------  Don't mess with anything below - unless you're a nerd ;-) ------ */

console.clear();

// OS Volume Prefix
const pathPrefix = process.platform === 'win32' ? 'c:/' : '/';

// Important paths
const embeddedUserDirSnapshot = `${pathPrefix}snapshot/${ns}/build/${userDir}.dat`;
const embeddedLocalsDirSnapshot = `${pathPrefix}snapshot/${ns}/build/${localesDir}.dat`;
const embeddedUserFlowFile = `${pathPrefix}snapshot/${ns}/build/${flowsFile}`;

// In develop mode?
const developMode = args.develop;
let noLoad = developMode !== true && args.noload;

if (!developMode && !fs.existsSync(embeddedUserFlowFile)) {
	noLoad = true;
}

// Get Locals Path
const getLocalesPath = () => {
	return join(dirname(process.execPath), localesDir);
};

// Get User Dir
const getUserDirPath = () => {
	if (developMode) {
		return join(__dirname, userDir);
	}
	if (noLoad) {
		return join(dirname(process.execPath), noLoadUserDir);
	}
	return join(dirname(process.execPath), userDir);
};

// Get Flow File
const getFlowFile = () => {
	if (developMode) {
		return join(__dirname, flowsFile);
	}
	if (noLoad) {
		return join(getUserDirPath(), flowsFile);
	}

	return embeddedUserFlowFile;
};

const getRunModeTextInt = (usenumber) => {
	if (developMode) {
		return usenumber ? 1 : 'Design Time';
	}

	if (!developMode && !noLoad) {
		return usenumber ? 2 : 'Production (Embedded Flow)';
	}

	if (!developMode && noLoad) {
		return usenumber ? 3 : 'Production (Clean)';
	}
};

const runMode = getRunModeTextInt(true);
process.env['SFE'] = runMode;
let Title;
switch (runMode) {
	case 1:
	case 3:
		Title = `Node RED SFE: ${getRunModeTextInt()}`;
		break;

	case 2:
		Title = nrRuntimeSettings.consoleTitle || 'Node RED SFE';
		break;
}
process.stdout.write(
	`${String.fromCharCode(27)}]0;${Title}${String.fromCharCode(7)}`
);

// Main
const run = async () => {
	if (args.reset) {
		if (fs.existsSync(getUserDirPath())) {
			fs.rmSync(getUserDirPath(), { recursive: true, force: true });
		}
	}

	const app = express();
	const server = http.createServer(app);

	delete nrRuntimeSettings.userDir;
	delete nrRuntimeSettings.editorTheme;
	delete nrRuntimeSettings.flowFile;
	delete nrRuntimeSettings.readOnly;

	if (args.port) {
		nrRuntimeSettings.uiPort = args.port;
	}

	const nrSettings = {
		userDir: getUserDirPath(),
		flowFile: getFlowFile(),
		editorTheme: {
			header: {
				title: `Node-RED SFE [${getRunModeTextInt()}]`
			},
			page: {
				title: `Node-RED SFE [${getRunModeTextInt()}]`
			},
			projects: {
				enabled: false
			},
			tours: false
		},
		nodesDir: `${pathPrefix}snapshot/${ns}/build/resources/nodes`,
		...nrRuntimeSettings
	};

	if (developMode) {
		nrSettings.disableEditor = false;
	}

	if (!developMode && !noLoad) {
		nrSettings.editorTheme.header.image = `${pathPrefix}snapshot/${ns}/build/resources/node-red.png`;
		nrSettings.editorTheme.page.css = `${pathPrefix}snapshot/${ns}/build/resources/sfe.css`;
		nrSettings.readOnly = true;
		nrSettings.editorTheme.login = {
			image: `${pathPrefix}snapshot/${ns}/build/resources/node-red-256-embedded.png`
		};
	} else {
		nrSettings.editorTheme.login = {
			image: join(__dirname, 'resources', 'node-red-256-external.png')
		};
	}

	// Initialize Node-RED with the given settings
	RED.init(server, nrSettings);
	app.use(nrSettings.httpAdminRoot, RED.httpAdmin);
	app.use(nrSettings.httpNodeRoot, RED.httpNode);

	if (!developMode && !noLoad) {
		if (!fs.existsSync(getUserDirPath())) {
			const zip = new AdmZip(embeddedUserDirSnapshot);
			zip.extractAllTo(getUserDirPath(), true);
		}
	}

	if (!developMode) {
		if (!fs.existsSync(getLocalesPath())) {
			const zip = new AdmZip(embeddedLocalsDirSnapshot);
			zip.extractAllTo(getLocalesPath(), true);
		}
	}

	const baseURL = `http://127.0.0.1:${nrSettings.uiPort}${nrSettings.httpAdminRoot}`;
	const getAutoLoad = () => {
		const ALFile = join(dirname(process.argv0), 'AUTOLOAD');
		if (fs.existsSync(ALFile)) {
			const URL = fs.readFileSync(ALFile, 'utf8');
			if (URL.startsWith('/')) {
				return `${baseURL}${URL.replace('/', '')}`;
			} else {
				return URL;
			}
		} else {
			return undefined;
		}
	};

	// Start the HTTP server
	server.on('listening', (e) => {
		RED.start()
			.catch((err) => {})
			.then(() => {
				RED.log.info(`SFE Run Mode  :  ${getRunModeTextInt()}`);
				const AL = getAutoLoad();
				if (AL) {
					RED.log.info(`Opening  :  ${AL}`);
					open(AL);
				} else {
					if (developMode) {
						RED.log.info(`Opening  :  ${baseURL}`);
						open(baseURL);
					}
				}
			});
	});
	server.listen(nrSettings.uiPort);
};

// Run the main function and handle any errors
run().catch((err) => {
	process.exit(1);
});
