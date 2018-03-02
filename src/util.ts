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

export function getCurrentWordAtPosition(document: vscode.TextDocument, position: vscode.Position) {
    // get current word
    let wordAtPosition = document.getWordRangeAtPosition(position);
    let currentWord = '';
    if (wordAtPosition && wordAtPosition.start.character < position.character) {
        //let word = document.getText(wordAtPosition);
        //currentWord = word.substr(0, position.character - wordAtPosition.start.character);//Only get partial word from the beginning of the current word to the position of cursor
        
        //Another way: Get the whole current word having the cursor
        currentWord = document.getText(wordAtPosition);
    }

    return currentWord;
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