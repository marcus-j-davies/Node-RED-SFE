const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const {
	userDir,
	outputDir,
	localesDir,
	localesSource,
	inputFile,
	outputName,
	flowsFile
} = require('./constants');

const outputFile = path.join(outputDir, outputName);
const finalPkg = path.join(outputDir, 'package.json');
const projectName = path.dirname(__filename).split(path.sep).pop();

const requestSourceFile = path.join(
	__dirname,
	'node_modules/@node-red/nodes/core/network/21-httprequest.js'
);

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

/* Things to not include during bundling */
const externals = [
	'@node-red/runtime/package.json',
	'@node-red/nodes',
	'@node-red/editor-client',
	'@node-rs',
	'oauth2orize',
	'got',
	'./resources'
];

/* Utility Functions */
const patchFile = (filePath, replacements) => {
	let content = fs.readFileSync(filePath, 'utf-8');
	replacements.forEach(([searchValue, replaceValue]) => {
		content = content.replace(searchValue, replaceValue);
	});
	fs.writeFileSync(filePath, content);
};

const copyExternalDependencies = (externals, outputDir) => {
	externals.map(async (ext) => {
		const extPath = ext.startsWith('./') ? ext : path.join('node_modules', ext);
		if (fs.existsSync(extPath)) {
			fs.cpSync(extPath, path.join(outputDir, extPath), { recursive: true });
		}
	});
};

const findPackageJson = (startDir) => {
	let dir = path.resolve(startDir);

	while (dir !== path.parse(dir).root) {
		const candidate = path.join(dir, 'package.json');
		if (fs.existsSync(candidate)) return candidate;
		dir = path.dirname(dir);
	}

	return null;
};

const esBuildPackage = async (file) => {
	const absFile = path.resolve(file);

	try {
		await esbuild.build({
			entryPoints: [absFile],
			bundle: true,
			platform: 'node',
			target: 'node22',
			allowOverwrite: true,
			keepNames: true,
			outfile: absFile
		});
	} catch {}

	const packageFile = findPackageJson(path.dirname(absFile));
	if (!packageFile) return;

	try {
		const packageJsonRaw = fs.readFileSync(packageFile, 'utf8');
		const packageJson = JSON.parse(packageJsonRaw);

		if (packageJson.type !== 'commonjs') {
			packageJson.type = 'commonjs';
			fs.writeFileSync(packageFile, JSON.stringify(packageJson, null, 2));
		}
	} catch {}
};

/* Main */
const run = async () => {
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
		keepNames: true,
		bundle: true,
		platform: 'node',
		target: 'node22',
		outfile: outputFile,
		external: externals
	};

	await esbuild.build(config);

	// Patch the output file, to address path resolution
	const replacements = [
		[
			'path.join(__dirname, "..", "package.json")',
			'"./node_modules/@node-red/runtime/package.json"'
		],
		['{SFE_PROJECT_DIR}', projectName],
		[
			'path.resolve(path.join(__dirname, "..", "locales"))',
			'path.resolve(path.join(dirname(process.execPath), ".locales"))'
		]
	];

	await patchFile(outputFile, replacements);

	// Patch request source file to use require instead of import for 'got'
	await patchFile(requestSourceFile, [
		["const { got } = await import('got')", "const { got } = require('got')"]
	]);

	// Copy external dependencies to the output directory
	copyExternalDependencies(externals, outputDir);

	// Create final package.json
	const pkg = {
		name: 'node-red-sfe',
		bin: outputName,
		pkg: {
			assets: [
				'./node_modules/**',
				'./resources/**',
				`${userDir}.dat`,
				`${localesDir}.dat`,
				`./${flowsFile}`
			]
		}
	};

	const sessionsPath = path.join(userDir, '.sessions.json');
	if (fs.existsSync(sessionsPath)) {
		fs.unlinkSync(sessionsPath);
	}

	const packUserDir = () => {
		if (fs.existsSync(userDir)) {
			const output = fs.createWriteStream(`${userDir}.dat`);
			output.on('close', function () {
				fs.copyFileSync(
					`${userDir}.dat`,
					path.join(outputDir, `${userDir}.dat`)
				);
				moveFlows();
				packLocales();
			});

			const Archiver = archiver('zip');

			Archiver.pipe(output);
			Archiver.directory(userDir, false);
			Archiver.finalize();
		} else {
			moveFlows();
			packLocales();
		}
	};

	const packLocales = () => {
		const output = fs.createWriteStream(`${localesDir}.dat`);
		output.on('close', function () {
			fs.copyFileSync(
				`${localesDir}.dat`,
				path.join(outputDir, `${localesDir}.dat`)
			);
		});

		const Archiver = archiver('zip');

		Archiver.pipe(output);
		Archiver.directory(localesSource, false);
		Archiver.finalize();
	};

	const moveFlows = () => {
		if (fs.existsSync(`./${flowsFile}`)) {
			fs.copyFileSync(`./${flowsFile}`, path.join(outputDir, flowsFile));
		}
	};

	packUserDir();

	fs.writeFileSync(finalPkg, JSON.stringify(pkg, null, 2));
};

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
