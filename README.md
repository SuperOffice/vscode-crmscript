# CRMScript IDE

An offline IDE for customising SuperOffice CRM with its CRMScript langange

# Features

- Project management
  * Login to your online tenant of SuperOffice to get access to the scripts. Command "Cirrus: Login"
  * Download/update CRMScripts from the remote tenant into a local project. Command "Cirrus: Download scripts to the current folder". NB: Your local changes may be overwritten.
  * Editing the meta-information and script source code
  * Create new scripts inside the local project
  * Upload scripts into the tenant. Command "Cirrus: Upload all in the current folder".
- CRMScript editor
  * Syntax highlighting
  * Auto-completion of variables with candidate functions
  * Pop-up function documents by mouse hovering
- Built-in features by Visual Studio Code
  * Source control (Git)
  * Code search, find, replace
  * Snippets (only user-defined snippets so far)
  * ...



- Download a CrmScript project into the current opened folder: "Cirrus: Download Cirrus: Download scripts to the current folder". NB: Your changed may be overwritten. We recommend you to commit your changes before downloading.
- Upload the current project: "Cirrus: Upload all in the current folder"

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

# Install

- ```git clone https://huis@bitbucket.org/cirrusproject/vscode-crmscript.git```
- ```cd vscode-crmscript```
- ```npm install```
- Open VS Code from this folder (e.g., ```code .```) and debug

# Devlopment

Code highlighting for CRMSCript. 

The language grammars (tokens) can be defined using TextMate. 
http://manual.macromates.com/en/language_grammars
and/or http://docs.sublimetext.info/en/latest/extensibility/syntaxdefs.html 
http://docs.sublimetext.info/en/latest/reference/syntaxdefs.html 

The language themes can be defined in  .tmTheme
https://code.visualstudio.com/docs/extensions/themes-snippets-colorizers 

# Extension Settings

`language-configuration-crmscript.json` is to provide Smart Bracket Matching

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

