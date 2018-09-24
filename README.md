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


# Install

- ```git clone https://huis@bitbucket.org/cirrusproject/vscode-crmscript.git```
- ```cd vscode-crmscript```
- ```npm install```
- Open VS Code from this folder (e.g., ```code .```) 
- Debug -> Start Debuging (F5)

# Devlopment

Code highlighting for CRMSCript. 

The language grammars (tokens) can be defined using TextMate. 
http://manual.macromates.com/en/language_grammars
and/or http://docs.sublimetext.info/en/latest/extensibility/syntaxdefs.html 
http://docs.sublimetext.info/en/latest/reference/syntaxdefs.html 

The language themes can be defined in  .tmTheme
https://code.visualstudio.com/docs/extensions/themes-snippets-colorizers 

