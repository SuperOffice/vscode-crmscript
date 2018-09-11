import {ScriptMeta} from './ccproject'
import * as vscode from 'vscode'

var token:string = undefined;

export function listAllScripts(): string{
    return '[{"uid":"cs1", "path":"account/newname.crmscript"}, {"uid":"csn", "path":"a.crmscript"}]'
}

export function getScriptSource(uid: string): string{
    if(!token) return undefined;
    return `Some content for ${uid}`
}

export function login(id:string, secret:string){
    if(id == "myid" && secret == "correct")
        token = "defined";
}

export function uploadScriptSource(meta: ScriptMeta){
    vscode.window.showInformationMessage(`uploaded: ${meta.path} with timestamp ${meta.timestamp}`);
}