import {ScriptMeta} from './cirrusProject'
import * as vscode from 'vscode'

var token:string = undefined;

export function listAllScripts(): string{
    //return '[{"uid":"cs1", "path":"account/newname.crmscript"}, {"uid":"csn", "path":"a.crmscript"}]'

    return `[
          {
            "EjscriptId": 13,
            "UniqueIdentifier": "Cust26320-ejscript-13",
            "Description": "Callback script for compact mode",
            "LongDescription": "This script is the one returning the JSON data for the compact mode.",
            "IncludeId": "SuperOffice_compactModeCallback",
            "Path": "#Scripts/System scripts",
            "BaseFileHash": "0AB05EDCBE5A5CFC2C018EFAEAEDEFA8"
          },
          {
            "EjscriptId": 25,
            "UniqueIdentifier": "Cust26320-ejscript-25",
            "Description": "Create request",
            "LongDescription": "This script is used for creating a new request, and adding a message to it.",
            "IncludeId": "SuperMacro_createRequest",
            "Path": "#Scripts/Macro foundation scripts",
            "BaseFileHash": "70D223BD45CABD6D2E4F1C11B13A162C"
          }
        ]`
}

export function getScriptSource(meta: ScriptMeta): string{
    return `Some content for ${meta.uniqueIdentifier}`
}

export function login(id:string, secret:string){
    if(id == "myid" && secret == "correct")
        token = "defined";
}

export function uploadScriptSource(meta: ScriptMeta, content: string){
    vscode.window.showInformationMessage(`uploaded: ${meta.path} with timestamp ${meta.baseFileHash}, and content ${content}`);
}

export function createScriptAndSource(meta: ScriptMeta, content: string){
    vscode.window.showInformationMessage(`created: ${meta.path} with timestamp ${meta.baseFileHash}, and content ${content}`);
}