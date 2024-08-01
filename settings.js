const memory = require('@node-red/runtime/lib/nodes/context/memory');
const localfilesystem = require('@node-red/runtime/lib/nodes/context/localfilesystem');

/* Node-RED Settings
 *
 * Note : The following properties/objects will be ignored as they are integral to the running of Node-RED SFE
 *  - userDir
 *  - logging
 *  - editorTheme
 *  - readOnly
 *  - contextStorage.file.config.dir
 */

module.exports = {
	uiPort: 1880,
	flowFile: 'flows.json',
	flowFilePretty: true,
	httpAdminRoot: '/',
	httpNodeRoot: '/',

	/* Change me */
	credentialSecret: '#########################',

	/* This should be set to true, JUST BEFORE compiling to an SFE */
	/* But it will be ignored (forcibly set to false) during the development stage */
	disableEditor: false,

	/* Vital! IF NOT disabling the editor */
	/* Default : admin:admin */
	adminAuth: {
		type: 'credentials',
		users: [
			{
				username: 'admin',
				password:
					'$2a$12$J0TtWc6Newz3DuC1nbScoee1jXS/hSuHQ2KeMRRD58Wxp7ZNk6uo6',
				permissions: '*'
			}
		]
	},
	contextStorage: {
		default: 'memory',
		memory: { module: memory },
		/* Don't remove this store, as it gets re-configured */
		file: { module: localfilesystem }
	},

	/* Do what you want */
	/* Note : SFELOG will get added to this */
	functionGlobalContext: {}
};
