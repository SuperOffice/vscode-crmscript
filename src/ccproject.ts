import * as vscode from 'vscode';
var fs = require('fs')

export function createProject(){
    console.log(__dirname);
    vscode.window.showInformationMessage("create here");
    var dir = 'C:\\Users\\huis\\work\\cirrus\\temp'
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);     
        console.log("created");
    }
    var diruri = vscode.Uri.parse('file:///C:/Users/huis/work/cirrus/temp')
    vscode.commands.executeCommand('vscode.openFolder', diruri)
}