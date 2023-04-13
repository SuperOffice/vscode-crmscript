import { CodeAction, CodeActionKind, CodeActionParams, TextEdit } from 'vscode-languageserver';
import { TextDocumentEdit } from 'vscode-languageserver-types';

async function codeActionHandlerOld(params: CodeActionParams): Promise<CodeAction[]> {

  const edits: TextDocumentEdit[] = [];
  // Add your code actions here, by adding edits to the `edits` array.

  const codeAction: CodeAction = {
		title: 'Custom Code Action',
		kind: CodeActionKind.QuickFix
	};
	return [
		codeAction
	];
}

export function codeActionHandler(params: CodeActionParams): CodeAction {
  const action = CodeAction.create("Insert 'Hello, world!'", CodeActionKind.QuickFix);
  action.edit = {
      changes: {
          [params.textDocument.uri]: [TextEdit.insert(params.range.start, 'Hello, world!')]
      }
  };
  return action;
}

