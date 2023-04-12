/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	MarkupContent,
	MarkupKind,
	MarkedString,
	Hover,
	TextEdit,
	WorkspaceEdit
} from 'vscode-languageserver/node';

import {
	TextDocument,
} from 'vscode-languageserver-textdocument';

import { UpdateReferenceLibrary, completionItemRegistry, validateDirPath } from './updateReferenceLibrary';

import path = require('path');
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { MyCompletionItemData, VariableInfo, YmlFile } from './Interfaces';
import { updateVariablesRegistry, variablesRegistry } from './updateVariablesRegistry';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

//Add a Map to store the latest document URIs by the client
let _currentCursorPosition: TextDocumentPositionParams | null = null;

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

// Cache VariableInfo 
const variableInfoList: VariableInfo[] = [];

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	//Get reference-library from github
	/*UpdateReferenceLibrary()
		.then((result) => {
			//console.log(result);
		})
		.catch((error) => {
			console.error(error);
		});*/

	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				//resolveProvider: true
			},
			hoverProvider: true,
			executeCommandProvider: {
				commands: ['insertExampleCode', 'server.referenceLibrary.validate', 'server.referenceLibrary.download']
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});


connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

connection.onHover((params: TextDocumentPositionParams): Hover | undefined => {
	const doc: MarkedString[] = ["# Titlte", "### description"];
	return {
		contents: doc
	};
});

connection.onExecuteCommand(async (params) => {
	if (params.command === 'server.referenceLibrary.validate') {
		return validateDirPath();
	}

	if (params.command === 'server.referenceLibrary.download') {
		const update = params.arguments && params.arguments[0]; // Extract the update argument from params.arguments
		await UpdateReferenceLibrary(update);
    	return true;
	}

	//Needs to be refactored to onCodeAction
	if (params.command !== 'insertExampleCode' || _currentCursorPosition === null || !params.arguments) {
		return;
	}

	const { uri } = _currentCursorPosition.textDocument;
	const { line, character } = _currentCursorPosition.position;
	const myCompletionItemData = params.arguments[0] as MyCompletionItemData;
	const textEdit: TextEdit = {
		range: {
			start: { line, character },
			end: { line, character }
		},
		newText: decodeHtmlEntities(myCompletionItemData.exampleCode)
	};

	const edit: WorkspaceEdit = {
		changes: {
			[uri]: [textEdit]
		}
	};

	const response = await connection.workspace.applyEdit(edit);
	if (!response.applied) {
		// handle the case where the edit was not applied
	}
});

function decodeHtmlEntities(text: string): string {
	const entities: Record<string, string> = {
		'&quot;': '"',
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&#39;': "'",
		'&apos;': "'"
	};

	return text.replace(/&quot;|&amp;|&lt;|&gt;|&#39;|&apos;/g, (entity) => entities[entity]);
}

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});


// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'crmscript'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	const text = textDocument.getText();
	updateVariablesRegistry(text);

	// In this simple example we get the settings for every validate run.
	/*const settings = await getDocumentSettings(textDocument.uri);

	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Particularly for names'
				}
			];
		}
		diagnostics.push(diagnostic);
	}

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });*/
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	//create new completionItems
	_currentCursorPosition = _textDocumentPosition;
	const completionItems: CompletionItem[] = [];
	const _textDocumentText = documents?.get(_textDocumentPosition.textDocument.uri)?.getText();
	if (_textDocumentText) {
		const _textDocumentLines = _textDocumentText.split(";\r\n"); //Split textDocument into lines
		const _textDocumentLine = _textDocumentLines[_textDocumentPosition.position.line]; //Get correct line
		//Check if its a dot, that means this is possible an already defined variable
		const _character = _textDocumentLine.substring(_textDocumentPosition.position.character - 1, _textDocumentPosition.position.character);
		if (_character == ".") {
			const _variableName = _textDocumentLine.substring(0, _textDocumentPosition.position.character - 1);
			const variableInfo = variablesRegistry.get(_variableName);
			//search in completionItemRegistry for an item that has label equals to _variableName
			if (variableInfo) {
				addClassMethods(completionItems, variableInfo.href);
			}
			return completionItems;
		}
	}
	addvariablesRegistryToCompletionItems(completionItems, variablesRegistry);
	completionItems.push(...completionItemRegistry);
	return completionItems;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

function addvariablesRegistryToCompletionItems(completionItems: CompletionItem[], variablesRegistry: Map<string, VariableInfo>) {
	for (const [key, value] of variablesRegistry.entries()) {
		const obj = {
			label: key,
			kind: CompletionItemKind.Variable,
		};
		completionItems.push(obj);
	}
	return completionItems;
}

function addClassMethods(completionItems: CompletionItem[], ymlFileName: string) {
	const ymlFilePath = path.join(__dirname, 'reference', ymlFileName),
		contents = readFileSync(ymlFilePath, 'utf8'),
		data = load(contents) as YmlFile;

	for (let i = 1; i < data.items.length; ++i) {

		const markdown: MarkupContent = {
			kind: MarkupKind.Markdown,
			value: [
				'# ' + data.items[i].id,
				'[Docs] ' + "https://docs.superoffice.com/automation/crmscript/reference/" + data.items[0].uid + ".html", //TODO: Figure out a more dynamic way of setting this..
				'',
				'' + data.items[i].summary,
				'',
				'```javascript',
				'',
				'' + data.items[i].id,
				'',
				'```'
			].join('\n')
		};

		const obj = {
			label: data.items[i].id as string,
			kind: CompletionItemKind.Method,
			insertText: data.items[i].id, //Get string between <code> and </code>;,
			//detail: data.items[i].summary,
			documentation: markdown,
		};
		completionItems.push(obj);
	}
	return completionItems;
}