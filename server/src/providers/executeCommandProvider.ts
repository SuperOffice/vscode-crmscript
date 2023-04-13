import { ExecuteCommandParams, TextEdit, WorkspaceEdit, Connection, TextDocumentPositionParams } from "vscode-languageserver";
import { UpdateReferenceLibrary, validateDirPath } from "../updateReferenceLibrary";
import { _currentCursorPosition, documents } from "../server";

export async function executeCommandHandler(
    connection: Connection,
    params: ExecuteCommandParams,
    _currentCursorPosition: any
): Promise<any> {
    console.log("handleExecuteCommand");

    if (params.command === 'server.referenceLibrary.validate') {
        return validateDirPath();
    }

    if (params.command === 'server.referenceLibrary.download') {
        const update = params.arguments && params.arguments[0]; // Extract the update argument from params.arguments
        return UpdateReferenceLibrary(update);
    }

    if (params.command !== 'insertExampleCode' || _currentCursorPosition === null || !params.arguments) {
        return;
    }
    const _textDocumentText = documents?.get(_currentCursorPosition.textDocument.uri)?.getText();
    if (_textDocumentText) {
        const _textDocumentLines = _textDocumentText.split(/\r?\n/);
        const _textDocumentLine = _textDocumentLines[_currentCursorPosition.position.line];

        // Find the beginning and end position of the current word
        const wordRegExp = /[\w\d.]+/g;
        let match;
        let start = -1;
        let end = -1;
        while ((match = wordRegExp.exec(_textDocumentLine))) {
            start = match.index;
            end = match.index + match[0].length;
            break;
        }

        if (start >= 0 && end >= 0) {
            const textEdit: TextEdit = {
                range: {
                    start: { line: _currentCursorPosition.position.line, character: start },
                    end: { line: _currentCursorPosition.position.line, character: end }
                },
                newText: params.arguments[0]
            };

            const edit: WorkspaceEdit = {
                changes: {
                    [_currentCursorPosition.textDocument.uri]: [textEdit]
                }
            };

            const response = await connection.workspace.applyEdit(edit);
            if (!response.applied) {
                // handle the case where the edit was not applied
            }
        }
    }
}