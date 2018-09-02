'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument} from 'vscode';
import { ejScriptIntellisense } from './ejscriptIntellisense';
import {getCurrentWord, createSnippetItem, getAPIinfo, getCurrentWordAtPosition} from './util';
import {login} from './auth';
import {createProject} from './ccproject'

const CRMSCRIPT_MODE: vscode.DocumentFilter = { language: 'crmscript', scheme: 'file' };

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "CRMScript" is now active!');

    // create a new word counter
    let wordCounter = new WordCounter();
    let controller = new WordCounterController(wordCounter);

    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(controller);
    context.subscriptions.push(wordCounter);

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed
        console.log("here")
        // Display a message box to the user
        vscode.window.showInformationMessage(login());

        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No open text editor!');
            return; // No open text editor
        }

        var selection = editor.selection;
        var text = editor.document.getText(selection);

        // Display a message box to the user
        vscode.window.showInformationMessage('Selected characters: ' + text.length);
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.createProject', () => {
        createProject()
    })
    context.subscriptions.push(disposable);

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
            CRMSCRIPT_MODE, new CRMScriptCompletionItemProvider(), '.', '\"')
    );
    context.subscriptions.push(vscode.languages.registerHoverProvider(
                    CRMSCRIPT_MODE, new CRMScriptHoverProvider())
    );
}

class CRMScriptCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise(
            (resolve, reject) => {                
                let items: vscode.CompletionItem[] = [];

                let currentWord = getCurrentWord(document, position);
                vscode.window.showInformationMessage(currentWord);

                //let currentWord = getCurrentWordAtPosition(document, position);
                //vscode.window.showInformationMessage(currentWord);

                let apiItems = getAPIinfo(currentWord);

                for(let item of apiItems) {
                    items.push(createSnippetItem(item));
                }
                
                resolve(items);
            }
        );
    }
}

class CRMScriptHoverProvider implements vscode.HoverProvider {
    public provideHover (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {		
        //let currentWord = getCurrentWord(document, position);
        //let info = getAPIinfo("String");
        //let s = info[0].help;

        let result: vscode.Hover = {
            contents: [ejScriptIntellisense[0].help]//[s]
        };
        return result;
	}
}

class WordCounter {

    private _statusBarItem: StatusBarItem;

    public updateWordCount() {

        // Create as needed
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;

        // Only update status if an Markdown file
        if (doc.languageId === "crmscript") {
            let wordCount = this._getWordCount(doc);

            // Update the status bar
		this._statusBarItem.text = wordCount !== 1 ? `$(pencil) ${wordCount} Words` : '$(pencil) 1 Word';
		this._statusBarItem.show();
        } else {
            this._statusBarItem.hide();
        }
    }

    public _getWordCount(doc: TextDocument): number {

        let docContent = doc.getText();

        // Parse out unwanted whitespace so the split is accurate
        docContent = docContent.replace(/(< ([^>]+)<)/g, '').replace(/\s+/g, ' ');
        docContent = docContent.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        let wordCount = 0;
        if (docContent != "") {
            wordCount = docContent.split(" ").length;
        }

        return wordCount;
    }

    dispose() {
        this._statusBarItem.dispose();
    }
}

class WordCounterController {

    private _wordCounter: WordCounter;
    private _disposable: Disposable;

    constructor(wordCounter: WordCounter) {
        this._wordCounter = wordCounter;

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        // update the counter for the current file
        this._wordCounter.updateWordCount();

        // create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    private _onEvent() {
        this._wordCounter.updateWordCount();
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}