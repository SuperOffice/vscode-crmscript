import {CrmScriptProject, getProjectForCurrentFolder} from './cirrusProject'
import * as vscode from 'vscode';
import {uri2fspath} from './util';
import * as api from './api';

var fs = require('fs')

var count = 1;

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
    ccproject.timestampScript(path);
}

export function login(){
    api.openCallBackServer();
    api.login()
}