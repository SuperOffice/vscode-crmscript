import * as vscode from 'vscode';
import {CRMScriptIntellisense, ejScriptIntellisense} from './ejscriptIntellisense'

export function getCurrentWord(document: vscode.TextDocument, position: vscode.Position) {
    var i = position.character - 1;
    var text = document.lineAt(position.line).text;
    while (i >= 0 && ' \t\n\r\v"{[,'.indexOf(text.charAt(i)) === -1) {
        i--;
    }
    return text.substring(i + 1, position.character);
}

/**
 * Is the cursor stopping at a "."? Now used for auto completion
 * @param document 
 * @param position 
 */
export function isDot(document: vscode.TextDocument, position: vscode.Position){
    let lastChar = document.getText(new vscode.Range(position.translate(0, -1), position));
    return lastChar == '.'; 
}

export function getCurrentWordAtPosition(document: vscode.TextDocument, position: vscode.Position) {
    // get current word
    let rangeWord = document.getWordRangeAtPosition(position);
    let currentWord = '';
    if(rangeWord && rangeWord.start.isBefore(position)){
        currentWord = document.getText(rangeWord)
    }
    return currentWord;
}
    
export function getVarType(document: vscode.TextDocument, position: vscode.Position, variable: string): string{
    let text = document.lineAt(position).text
    let regexp = new RegExp(`\\w+\\W+${variable}\\b`)
    let matched = text.match(regexp)
    if(matched){
        let declText = matched[0]
        let typeText = declText.match(new RegExp('\\w+\\b'))[0]
        return typeText
    }
    return undefined;
}

export function createSnippetItem(info: CRMScriptIntellisense): vscode.CompletionItem {
    let text = info.text.split(".")[1];
    let help = info.help;
    // Read more here:
    // https://code.visualstudio.com/docs/extensionAPI/vscode-api#CompletionItem
    // https://code.visualstudio.com/docs/extensionAPI/vscode-api#SnippetString

    // For SnippetString syntax look here:
    // https://code.visualstudio.com/docs/editor/userdefinedsnippets#_creating-your-own-snippets

    let item = new vscode.CompletionItem(text, vscode.CompletionItemKind.Snippet);
    item.insertText = new vscode.SnippetString(text);
    item.documentation = new vscode.MarkdownString(help);

    return item;
}

export function getFunctionInfo(typename: string, functionname: string): string{
    let result = ejScriptIntellisense.find((value) =>{
        return value.text == `${typename}.${functionname}`
    })
    if(result)
        return result.help
    else
        return undefined
}

export function getAPIinfo(keyword: string): CRMScriptIntellisense[] {
    let result : CRMScriptIntellisense[] = [];

    if(keyword.endsWith(".")){
        keyword = keyword.split(".", 1)[0];
    }

    for (let suggestion of ejScriptIntellisense) {
        var text = suggestion.text;//getText(ejScriptIntellisense[i]);
        var help = suggestion.help;//getHelp(ejScriptIntellisense[i]);
        
        if(text.split(".", 1)[0] == keyword){//text.startsWith(keyword)
            result.push({text, help});
        }
    }

    return result;
}

/*
export function getText(info: CRMScriptIntellisense){
    return pluck(info, ['text'])[0];
}

export function getHelp(info: CRMScriptIntellisense){
    return pluck(info, ['help'])[0];
}

function pluck<T, K extends keyof T>(o: T, names: K[]): T[K][] {
    return names.map(n => o[n]);
}
*/

export function uri2fspath(uri: vscode.Uri){
    if(process.platform == 'win32'){
        return uri.path.substring(1);
    }
    else if(process.platform == 'darwin'){
        return uri.fsPath;
    }
    else{
        vscode.window.showErrorMessage("Platform not supported");
        return uri.fsPath;
    }
}

export function getCurrentFsPath(){
    let folders = vscode.workspace.workspaceFolders;
    if(folders.length > 1){
        vscode.window.showErrorMessage("Please keep only one folder opened");
        return;
    }
    if(folders.length == 0){
        vscode.window.showErrorMessage("No folder opened");
        return;
    }
    let rootpath = uri2fspath(vscode.workspace.workspaceFolders[0].uri);
    return rootpath
}