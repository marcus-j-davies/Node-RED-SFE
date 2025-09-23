# Node-RED SFE

A Single File Executable toolkit for Node-RED.

## Precursor

Node-RED is an insanely capable Visual Automation and Data Processing platform built around Node JS.
It's been used in the following environments:

 - Home IoT Automation
 - Data Processing
 - Enterprise Business Automation
 - Plant & Manufacturing Automation
 - Bespoke Application Design
 - Fun

 And so much more.

 It is typically installed on a server:

  - Raspberry Pi
  - Windows Servers
  - Linux Servers
  - Virtual Machines

  And many more SBC's

  ## The Problem

  The simplicity of Node-RED means it's been used as a core piece of the puzzle in application design, say to automate actions, process data, and so on and so forth.
  
  This presents a few problems/hurdles:

  As Node-RED is based on Node JS, the code for an application, automation, or process is easily viewed and can be messed with, let alone exposing IP, which should not be made easily accessible.

  Example: You're tasked by your client to design a dashboard that takes input from a user, and it gets processed with your magic sauce/IP. There will be some level of code (or all of it), that you don't want to reveal or be messed with.

  While Node-RED can require authentication to access the Editor, gaining access to the code/flow data requires very little effort.

  There are other hurdles at play, such as the requirement to have Node JS installed.

  ## Introducing Node-RED SFE

  Node-RED SFE is a toolkit that brings a solution to the aforementioned hurdles.
  It is a system that can package up your Node-RED project into a Single File Executable.

   - One Executable File
   - No need to install Node JS on the target server
   - Your Code/IP is not easily accessed
   - Portable Application

   Using APIs from https://esbuild.github.io and https://github.com/yao-pkg/pkg

   This toolkit allows you to design a flow, an application, a dashboard, or whatever you like. ESBuilds it all and outputs a Single File Executable
   that starts up your flow as if it were a compiled/native application, without the need for Node JS to be installed.

   This results in the code/flow data not being easily accessible, and the ability to 'modify' or 'play' with the end result is severely inhibited.

## Sold! Sold! Sold!
So let's get started.

Node-RED SFE currently uses Node-RED 4.

 - Clone this repo
 - Issue `npm install`
 - Issue `npm run develop`

 You're now in 'Design Time'

 - Install Extra Nodes
 - Create Your Flows
 - Deploy
 - ect etc 

 Once you're happy, terminate Node-RED SFE

 - Issue `npm run build`

 You will now have an SFE in `./build/dist` - Congratulations!

 ## Configuration

 Node-RED employs a configuration for itself, and this can be found in `settings.js`

 ```js
const memory = require('@node-red/runtime/lib/nodes/context/memory');
const localfilesystem = require('@node-red/runtime/lib/nodes/context/localfilesystem');

/* Node-RED Settings
 *
 * Note : The following properties/objects will be ignored as they are integral to the running of Node-RED SFE
 *  - userDir
 *  - flowFile
 *  - editorTheme
 *  - readOnly
 *  - nodesDir
 */

module.exports = {
	/* Node RED SFE Console Title */
	/* This property is not related to Node RED, but SFE itself */
	consoleTitle: 'Node RED SFE',

	uiPort: 1880,
	flowFilePretty: true,
	httpAdminRoot: '/',
	httpNodeRoot: '/',

	/* Change me */
	credentialSecret: '#########################',

	/* This should be set to true, JUST BEFORE compiling to an SFE */
	/* But it will be ignored (forcibly set to false) during the development stage */
	disableEditor: false,

	/* Logging options */
	logging: {
		console: {
			level: 'info',
			metrics: false,
			audit: false
		}
	},

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
		file: { module: localfilesystem }
	},

	/* Do what you want */
	functionGlobalContext: {}
}
```

 There are a few important things to change here.

  - `credentialSecret` - The encryption key for credentials that might be used in your flow
  - `disableEditor` - If the editor should be disabled in the final output executable
  - And of course, the credentials for the editor, if you choose to keep them active

  You are free to add anything in here that is supported by Node-RED, but pay attention to the stuff that is overwritten.

 It should be noted: if the editor is left open, changes are not persisted the next time you restart the SFE, and of course you open the ability for your flows to be exported, however, efforts are made to stop this, but it is not foolproof 

 ## What is this magic?

The final executable will contain an embedded file system, and this contains

 - An embedded NodeJS Runtime
 - Node RED itself
 - It's Modules (which I ESBuild some of them)
 - An embedded flows file (your flows)

 The Node RED Home Directory however, is compressed, and embedded into the final executable.  
 During runtime, this packaged Home Directory is expanded into a hidden folder, where the execuatble is run from (`.node-red-sfe`) - The flows file, remains embedded of course.

 This ~~allows~~ should allow full support for the Nodes available in the catalogue.  
 During the packaging stage, it is normal to see a few warnings
 
 Further more, a directory of `.locales` is expanded - this so Node RED can correctly reference strings used by `i18n` for its internal use

 So all in, 3 directories are created, next to the executable

  - `.node-red-sfe` : Anything that was snapshotted in what is refered to as the Node RED Home Directory (except the flowsfile)
  - `.node-red` : The home directory created when `--noload` is used  - see below 
  - `.locales` : strings for the runtime

 
 ## Context Stores.

 There are 2 configured context stores.

  - `memory` (default)
  - `file`

## Disable Loading Embedded Flows.
After your SFE has been built, you can also use the executable as a standard Node RED application.
this will:

 - Switch the Home Directory to `.node-red` (Next to the executable)
 - Switch to using a modifiable flows file (`.node-red/flows.json`)

 Note: The settings that your baked in will still be used

 To do this, call your SFE with the following arg

 ```sh
 MySFEApp --noload
 ```
 Note: If you did not develop a flow, before building (skipping `npm run develop`) - the `noload` run mode, is the default, and in effect - you have built a portable Node RED executable.

 ## Override default port.
The port that your SFE is using, is defined in the `settings.js` file, but you can override this during runtime.

 ```sh
 MySFEApp --port=1880
 ```

## Purge the Home Directory(s).
If you want to clear either of the Home Directories, you can pass the following argument:
 ```sh
 MySFEApp --reset
 ```

 This will wipe the Home Directory based on the current running mode (embedded, noload)  
 If you have an embdded flow (and its being used), this will result in the captured Home Ditectory being restored.

 ## Baked In Nodes
The executable, of course, includes the standard core nodes that come with Node-RED. However, you can also bake in third-party nodes.

To do this, install Node-RED nodes into the `./resources/nodes` directory.  
It's important to use the `--prefix` command-line argument when installing:

```
cd ./resources/nodes
npm --prefix ./ install node-red-contrib-mssql-plus
```

**Note**: The `--prefix ./` ensures that the installation path is relative to `./resources/nodes`, rather than:
 - Your global npm directory
 - Your user-level npm directory
 - Or even the root project directory (e.g., node-red-sfe)


This feature is not the same as installing nodes using the standard palette manager during flow design.
Baking in nodes is particularly useful when you distribute an executable without an embedded flow. In such cases, baked-in nodes are available by default, even before any flows are deployed.

**Embedded Flows Automatically Include Their Nodes**
If you're distributing an executable with an embedded default flow, any third-party nodes installed during the flow’s design will be automatically bundled and expanded as part of the embedding process.
In this case, there's no need to manually bake in those nodes, as the embedding process ensures they are included.

## Autoload a web interface.
If you include a file of `AUTOLOAD` - along side your SFE, after the SFE has started  
it will load your default browser with the URL that is contained in `AUTOLOAD`

 - `/URI` : Appends the URI to the admin endpoint
 - `https://...` : Loads this full URL

## SFE Environment Variable.
There is an Environment Variable of `SFE` and this denotes the mode currently running.  
if it does not exist - Node-RED SFE is currently not being used

 - `1`:  `Design Time`
 - `2`:  `Production (Embedded Flow)`
 - `3`:  `Production (Clean)` (`--noload`)

## Disclaimer

Node-RED-SFE, is NOT designed to be a **S**mart **F**ire **E**ngine

(Great work CPT)











