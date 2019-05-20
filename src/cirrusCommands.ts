import {CrmScriptProject, getProjectForCurrentFolder} from './cirrusProject'
import * as vscode from 'vscode';
import {uri2fspath} from './util';
import * as api from './api';

var fs = require('fs')

var count = 1;

var outputchannel:vscode.OutputChannel = undefined;

export function accumulate(){
    count = count + 1;
    console.log(count.toString());
}

export function downloadToCurrentFolder(){
    let csProject = getProjectForCurrentFolder();
    csProject.updateLocalMetaAndSource();
}

export function uploadFromCurrentFolder(){
    let csProject = getProjectForCurrentFolder();
    csProject.uploadAll();
}

export function createProject(){

    let result = vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true
    }).then((uris)=>{
        if(uris.length == 0){
            vscode.window.showInformationMessage("No folder selected");
            return;
        }
        let path = uri2fspath(uris[0]);
        if(!fs.existsSync(path)){
            fs.mkdirSync(path);
            console.log("folder created");
        }
        vscode.commands.executeCommand('vscode.openFolder', uris[0]).then(()=>{
            downloadToCurrentFolder();
        })
    })

}

export function onScriptFileSaved(d: vscode.TextDocument){
    let path = uri2fspath(d.uri);
    if(!path.endsWith('.crmscript')){
        return;
    }
    let ccproject = getProjectForCurrentFolder();
    ccproject.stampSavedScript(path);
}

export function login(){
    api.login().then(() => {
        if(!outputchannel)
            outputchannel = vscode.window.createOutputChannel("CRMScript");

        outputchannel.appendLine("Login Successful");
    }).catch(reason => {
        console.log("Login failed....");

        if(!outputchannel)
            outputchannel = vscode.window.createOutputChannel("CRMScript");

        outputchannel.appendLine("Login Failed");

    });
}

export function executeCurrentScript(){
    let ccproject = getProjectForCurrentFolder();
    let editor = vscode.window.activeTextEditor;
    if(!editor){
        vscode.window.showErrorMessage("No script is opened")
        return
    }
    let meta = ccproject.getScriptMetaFromAbsolutePath(uri2fspath(editor.document.uri))
    if(!meta){
        vscode.window.showErrorMessage("The active editor is not for a valid CRMScript")
        return
    }
    if(!meta.ejscriptId){
        vscode.window.showErrorMessage("Please download the latest scripts before execution")
        return
    }
    api.executeScript(meta, (res)=>{
        if(!outputchannel)
            outputchannel = vscode.window.createOutputChannel("CRMScript")
        let pureres =  JSON.parse(`{"text":${res}}`).text
        outputchannel.appendLine("")
        outputchannel.appendLine("")
        let date = new Date()
        outputchannel.appendLine(`====<${meta.fileName}> ${date.toLocaleString()}====`)
        outputchannel.append(pureres)
    });
}

export function init(){
    api.initApi();
}