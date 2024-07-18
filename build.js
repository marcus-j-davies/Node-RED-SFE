const esbuild = require('esbuild');
const { cp, readFile, writeFile, unlink } = require('fs/promises');
const { existsSync } = require('fs');
const path = require('path');

const userDir = './NRUserDir';
const outputDir = './build';
const inputFile = './node-red.js';
const outputName = 'node-red-bundle.js';
const outputFile = path.join(outputDir, outputName);
const finalPkg = path.join(outputDir, 'package.json');
const nrPackageFile = path.join(
	__dirname,
	'node_modules/node-red/package.json'
);
const requestSourceFile = path.join(
	__dirname,
	'node_modules/@node-red/nodes/core/network/21-httprequest.js'
);

const projectName = path.dirname(__filename).split(path.sep).pop();

/* Updated Later */
let isFlowBeingEmbedded = false;

/* Things to not include during bundling */
const externals = [
	'@node-red/nodes',
	'@node-red/editor-client',
	'@node-rs',
	'oauth2orize',
	'got',
	'./resources'
];

/* Native Binding Handling */
const nativeNodeModulesPlugin = {
	name: 'native-node-modules',
	setup(build) {
		build.onResolve({ filter: /\.node$/, namespace: 'file' }, (args) => ({
			path: require.resolve(args.path, { paths: [args.resolveDir] }),
			namespace: 'node-file'
		}));

		build.onLoad({ filter: /.*/, namespace: 'node-file' }, (args) => ({
			contents: `
                import path from ${JSON.stringify(args.path)}
                try { module.exports = require(path) }
                catch {}
            `
		}));

		build.onResolve({ filter: /\.node$/, namespace: 'node-file' }, (args) => ({
			path: args.path,
			namespace: 'file'
		}));

		const opts = build.initialOptions;
		opts.loader = opts.loader || {};
		opts.loader['.node'] = 'file';
		opts.loader['.sh'] = 'binary';
	}
};

// File exists
const fileExists = (path) => {
	return existsSync(path);
};

/* Utility Functions */
const patchFile = async (filePath, replacements) => {
	let content = await readFile(filePath, 'utf-8');
	replacements.forEach(([searchValue, replaceValue]) => {
		content = content.replace(searchValue, replaceValue);
	});
	await writeFile(filePath, content);
};

const copyExternalDependencies = async (externals, outputDir) => {
	const copyTasks = externals.map(async (ext) => {
		const extPath = ext.startsWith('./') ? ext : path.join('node_modules', ext);
		if (fileExists(extPath)) {
			await cp(extPath, path.join(outputDir, extPath), { recursive: true });
		}
	});
	await Promise.all(copyTasks);
};

const esBuildPackage = async (file) => {
	const config = {
		entryPoints: [file],
		bundle: true,
		platform: 'node',
		target: 'node20',
		allowOverwrite: true,
		outfile: file
	};

	await esbuild.build(config);

	const pathSplit = file.split('/');
	const packageFile = `${pathSplit[0]}/${pathSplit[1]}/package.json`;
	const packageJson = require(path.join(__dirname, packageFile));
	packageJson.type = 'commonjs';
	await writeFile(packageFile, JSON.stringify(packageJson, null, 2));
};

/* Main */
const run = async () => {
	// Check if flow is being embedded
	isFlowBeingEmbedded = fileExists(userDir);

	// Build to CJS
	await esBuildPackage('node_modules/got/dist/source/index.js');
	await esBuildPackage('node_modules/form-data-encoder/lib/index.js');
	await esBuildPackage('node_modules/lowercase-keys/index.js');
	await esBuildPackage('node_modules/p-cancelable/index.js');
	await esBuildPackage('node_modules/responselike/index.js');
	await esBuildPackage('node_modules/normalize-url/index.js');
	await esBuildPackage('node_modules/mimic-response/index.js');

	// Bundle main source file
	const config = {
		entryPoints: [inputFile],
		plugins: [nativeNodeModulesPlugin],
		bundle: true,
		platform: 'node',
		target: 'node20',
		outfile: outputFile,
		external: externals
	};

	await esbuild.build(config);

	// Patch the output file with Node-RED version and embedded flow modifications
	const nrVersion = require(nrPackageFile).version;
	const replacements = [
		['= getVersion()', `= "${nrVersion}"`],
		['{SFE_PROJECT_DIR}', projectName]
	];

	await patchFile(outputFile, replacements);

	// Patch request source file to use require instead of import for 'got'
	await patchFile(requestSourceFile, [
		["const { got } = await import('got')", "const { got } = require('got')"]
	]);

	// Copy external dependencies to the output directory
	await copyExternalDependencies(externals, outputDir);

	// Create final package.json
	const pkg = {
		name: 'node-red-sfe',
		bin: outputName,
		pkg: {
			assets: ['./node_modules/**', './resources/**']
		}
	};

	if (isFlowBeingEmbedded) {
		pkg.pkg.assets.push(`${userDir}/**`);

		const sessionsPath = path.join(userDir, '.sessions.json');
		if (existsSync(sessionsPath)) {
			await unlink(sessionsPath);
		}

		await cp(userDir, path.join(outputDir, userDir), {
			recursive: true
		});
	}

	await writeFile(finalPkg, JSON.stringify(pkg, null, 2));
};

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
