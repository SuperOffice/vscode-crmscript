# CRMScript IDE

An offline IDE for customising SuperOffice CRM with its CRMScript langange

# Features

- Project management
    * Login to your online tenant of SuperOffice to get access to the scripts. Command "Cirrus: Login"
    * Download/update CRMScripts from the remote tenant into a local project. Command "Cirrus: Download scripts to the current folder". NB: Your local changes may be overwritten.
    * Editing the meta-information and script source code
    * Create new scripts inside the local project
    * Delete a script
    * Upload scripts into the tenant. Command "Cirrus: Upload all in the current folder".
    * Execute the Script opened in the current editor. Command "Cirrus: Execute the current script". Results will be shown in OUTPUT->CRMSCript
- CRMScript editor
    * Syntax highlighting
    * Auto-completion of variables with candidate functions
    * Pop-up function documents by mouse hovering
- Built-in features by Visual Studio Code
    * Source control (Git)
    * Code search, find, replace
    * Snippets (only user-defined snippets so far)
    * ...


# Install from source code

- ```git clone https://github.com/SuperOffice/vscode-crmscript```
- ```cd vscode-crmscript```
- ```npm install```
- Open VS Code from this folder (e.g., ```code .```) 
- Debug -> Start Debuging (F5)

# Install from binary
- Download vsix package: https://github.com/SuperOffice/vscode-crmscript/releases/download/0.0.1/crmscript-0.0.1.vsix
- Open VS Code, run command "Extensions: Install from VSIX"

