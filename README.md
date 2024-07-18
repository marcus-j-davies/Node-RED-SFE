# Node-RED SFE

A Single File Executable toolkit for Node-RED.

## Precursor

Node-RED is an insanely capable, Visual Auotmation and Data Processing platform, built around Node JS.  
Its been used in the following environments:

 - Home IoT Automation
 - Data Processing
 - Enterprize Business Automation
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

  The simplicity of Node-RED means its been used as a core piece of the puzzle in application design, say to automate actions, process data so on and so forth.  
  
  This presents a few problems/hurdles:  

  As Node-RED is based on Node JS, The code for an application, automation, process is easily viewed, and can be messed with, let alone exposing IP, that should not be made easily acessbile.

  Example: You're tasked by your Client to design a dashboard, that takes input from a user, and it gets processed  with your magic sauce/IP, there will be some level of code (or all of it), that you dont want to reveal or be messed with.

  Whilst Node-RED can require authentication to the Editor, gaining access to the code/flow data, is with very little effort.

  There are other hurdles at play, such as the requirement to have Node JS installed.

  ## Introducing Node-RED SFE

  Node-RED SFE is a toolkit, that brings a solution to the aforementioned hurdles,  
  it is a system, that can package up your Node-RED project into a Single File Executable.

   - 1 Executable File
   - No need to install Node JS on the target server
   - Your Code/IP is not easily accessed
   - Portable Application

   Using API's from https://esbuild.github.io and https://github.com/yao-pkg/pkg

   This toolkit allows you to design a flow, application, dashboard - whatever you like, ESBulds it all, and outputs a Single File Executable,  
   that starts up your flow as if it was a compiled/native application, and without the need for Node JS to be installed.

   This results in the code/flow data not being easily accessible, and the ability to 'modify' or 'play' with the end result severely inhibited.

## Sold! Sold! Sold!
So lets get started.  

Node-RED SFE currently uses Node-RED 4.

 - Clone this repo
 - Issue `npm install`
 - Issue `npm run-script develop`

 You're now in 'Design Time'

 - Install Extra Nodes
 - Create Your flows
 - Deploy
 - ect etc 

 Once you're happy, terminate Node-RED SFE

 - Issue `npm run-script build`
 - Issue `npm run-script package`

 You will now have an SFE in `./build/dist` - Congraulations!

 ## Configuration

 Node-RED employes a configuration for its self, and this can be found in `settings.js`

 ```js
/* Node-RED Settings
 *
 * Note : The following properties/objects will be ignored as they are integral to the running of Node-RED SFE
 *  - userDir
 *  - logging
 *  - functionGlobalContext
 *  - editorTheme
 *  - readOnly
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
				password: '$2a$12$J0TtWc6Newz3DuC1nbScoee1jXS/hSuHQ2KeMRRD58Wxp7ZNk6uo6',
				permissions: '*'
			}
		]
	}
};
 ```

 There are a few important things to change here.

  - `credentialSecret` - The encryprion key for credentials that might be used in your flow
  - `disableEditor` - If the editor should be disabled in the final output executable
  - And of course the creds to the editor, if you choose to keep it active

  You are free, to add anything in here, that is supported by Node-RED, but pay attention to the stuff that is overwritten

 ## ReadOnly File System.

The final executable will contain an embedded file system, and this of course is read only,  
therefore, if you did not block access to the Editor (`disableEditor`) and try to deploy (or install Nodes) after - it will fail.

Node-RED SFE can actually operate in 2 ways however:

 - With an Embdded flow (the main use case)
 - A standard Node-RED portable application  

 Both scenarios will output an SFE - so Node JS is still not required in either setup.  
 The mode is manipulated based on, if there is a directory called `NRHomeDir`

 When you run `npm run-script build` - it will check if there is such a directory,  
 if there is, it will package it up, and cause it to "lock" to the developed/embedded flow. 

 If the editor is left accesible, The mode is identified by the login image, as well as certain actions, that wont be supported in a ReadOnly file system.

 <img src="./resources/node-red-256-embedded.png" alt="drawing" width="150"/>
 <img src="./resources/node-red-256-external.png" alt="drawing" width="150"/>

`npm run-script develop` basically just starts Node-RED and sets the `userDir` to this folder.  
 `NRHomeDir` is no different to the `.node-red` directory.

 If a flow is not embedded - the SFE will create a directory called `NRHomeDir` on start up, if its not already created.
 This allows you to deploy the executable with a modifiable flow (but note: this allows to view the flow code)

 For a typical use case, you will:

  - `npm run-script develop`
  - Desing your application
  - Set `disableEditor` to true
  - `npm run-script build`
  - `npm run-script package`
  - Distribute the SFE

  How you use this toolkit, is entirely upto you 

 ## Application Logging.

 The SFE adds a global Logging function to Node-RED, to allow debug logs to be created.

 ```js
 const Log = global.get('SFELOG');
 Log('info','My Application','Hello, World')
 ```

 This is a daily rotated log file.  
 The log file is named `sfe-%DATE%.log` with a 7 day retention policy.  

 The date format is **YYYY-MM-DD-HH**

 These log entries are also printed at the console, but are identified as `FLOW:Label`
 Example:

 ```
 /* Console */
 [2024-07-14 03:29:53] info     FLOW:My Application    : Hello, World

 /* Log File */
 [2024-07-14 03:29:53] info     My Application    : Hello, World
 ```


 