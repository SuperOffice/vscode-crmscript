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
	WorkspaceEdit,
	CodeActionKind,
	CodeActionParams,
	CodeAction
} from 'vscode-languageserver/node';

import {
	TextDocument,
} from 'vscode-languageserver-textdocument';

import { VariableInfo } from './Interfaces';
import { updateVariablesRegistry, variablesRegistry } from './updateVariablesRegistry';
import { completionHandler } from './providers/completionProvider';
import { executeCommandHandler } from './providers/executeCommandProvider';
import { codeActionHandler } from './providers/codeActionProvider';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
export const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

//Add a Map to store the latest document URIs by the client
export let _currentCursorPosition: TextDocumentPositionParams | null = null;

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

connection.onInitialize(async (params: InitializeParams) => {
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

	// Return the server capabilities
	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				//resolveProvider: true
			},
			hoverProvider: true,
			executeCommandProvider: {
				commands: ['insertExampleCode', 'server.referenceLibrary.validate', 'server.referenceLibrary.download']
			},
			workspace: {
				workspaceFolders: {
					supported: true
				}
			},
			codeActionProvider: {
				codeActionKinds: [CodeActionKind.Refactor]
			}
		}
	};
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

connection.onHover((params: TextDocumentPositionParams): Hover | undefined => {
	const doc: MarkedString[] = ["# Titlte", "### description"];
	return {
		contents: doc
	};
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
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

connection.onExecuteCommand(async (params) => {
	return await executeCommandHandler(connection, params, _currentCursorPosition);
});

connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	_currentCursorPosition = _textDocumentPosition;
	return completionHandler(
		_textDocumentPosition,
	);
});

connection.onCodeAction((params: CodeActionParams) => {
	return [codeActionHandler(params)];
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();