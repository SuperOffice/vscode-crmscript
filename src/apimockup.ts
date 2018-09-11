import {ScriptMeta} from './ccproject'
import * as vscode from 'vscode'

var token:string = undefined;

export function listAllScripts(): string{
    return '[{"uid":"cs1", "path":"account/newname.crmscript"}, {"uid":"csn", "path":"a.crmscript"}]'
}

export function getScriptSource(meta: ScriptMeta): string{
    return `Some content for ${meta.uid}`
}

export function login(id:string, secret:string){
    if(id == "myid" && secret == "correct")
        token = "defined";
}

export function uploadScriptSource(meta: ScriptMeta, content: string){
    vscode.window.showInformationMessage(`uploaded: ${meta.path} with timestamp ${meta.timestamp}, and content ${content}`);
}