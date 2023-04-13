import {
    TextDocumentPositionParams,
    CompletionItem,
    CompletionItemKind,
    MarkupContent,
    MarkupKind
} from "vscode-languageserver/node";
import { documents } from "../server";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import path = require("path");
import {
    VariableInfo,
    YmlFile,
    YmlItem,
} from "../Interfaces";
import { completionItemRegistry } from "../updateReferenceLibrary";

export function completionHandler(
    _textDocumentPosition: TextDocumentPositionParams,
    variablesRegistry: Map<string, VariableInfo>
): CompletionItem[] {
    //create new completionItems
    const completionItems: CompletionItem[] = [];
    const _textDocumentText = documents
        ?.get(_textDocumentPosition.textDocument.uri)
        ?.getText();
    if (_textDocumentText) {
        const _textDocumentLines = _textDocumentText.split(/\r?\n/); //Split textDocument into lines
        const _textDocumentLine =
            _textDocumentLines[_textDocumentPosition.position.line]; //Get correct line
        //Check if its a dot, that means this is possible an already defined variable
        const _character = _textDocumentLine.substring(
            _textDocumentPosition.position.character - 1,
            _textDocumentPosition.position.character
        );
        if (_character == ".") {
            const _variableName = _textDocumentLine.substring(
                0,
                _textDocumentPosition.position.character - 1
            );
            const variableInfo = variablesRegistry.get(_variableName);
            //search in completionItemRegistry for an item that has label equals to _variableName
            if (variableInfo && variableInfo.href) {
                addClassMethods(completionItems, variableInfo.href);
            }
            return completionItems;
        }
    }
    addvariablesRegistryToCompletionItems(completionItems, variablesRegistry);
    completionItems.push(...completionItemRegistry);
    return completionItems;
}

export function addClassMethods(
    completionItems: CompletionItem[],
    ymlFileName: string
) {
    const ymlFilePath = path.join(__dirname, "..", "reference", ymlFileName),
        contents = readFileSync(ymlFilePath, "utf8"),
        ymlFile = load(contents) as YmlFile;

    ymlFile.items.slice(1).forEach((item) => {
            if(item.type === 'Method'){
                const obj: CompletionItem = {
                    label: item.name,
                    kind: CompletionItemKind.Method,
                    insertText: `${item.name};`,
                    documentation: createMarkdown(item),
                    data: {
                        filename: `${item.uid as string}.yml`,
                        exampleCode: "",
                    },
                };
                completionItems.push(obj);
            }
    });
    return completionItems;
}

export function addvariablesRegistryToCompletionItems(
    completionItems: CompletionItem[],
    variablesRegistry: Map<string, VariableInfo>
) {
    variablesRegistry.forEach((_value, key) => {
        const obj = {
            label: key,
            kind: CompletionItemKind.Class,
        };
        completionItems.push(obj);
    });
    return completionItems;
}

function createMarkdown(items: YmlItem): MarkupContent {
    const example = items.example || '';
    const exampleString = Array.isArray(example) ? example[0] : example;
    const codeBlock = decodeHtmlEntities(/<code>(.*?)<\/code>/s.exec(exampleString)?.[1] || '');
    return {
        kind: MarkupKind.Markdown,
        value: [
            `# ${items.name}`,
            `[Docs] https://docs.superoffice.com/en/automation/crmscript/reference/${items.uid}.html`,
            '',
            `${items.summary}`,
            '',
            '```crmscript',
            '',
            `${codeBlock}`,
            '',
            '```',
            '',
            ...(codeBlock ? [`Click [here](command:insertExampleCode?${encodeURIComponent(JSON.stringify(codeBlock))}) to insert the example code.`] : [])
        ].join('\n')
    };
}

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

function createCompletionItem(item: YmlItem, completionItemKind: CompletionItemKind): CompletionItem {
    const obj: CompletionItem = {
        label: item.name,
        kind: completionItemKind,
        insertText: `${item.name} ${item.name.toLowerCase()};`,
        documentation: createMarkdown(item),
        data: {
            filename: `${item.uid as string}.yml`,
            exampleCode: "",
        },
    };
    return obj;
}

export function addCompletionItem(items: YmlItem[]) {
    completionItemRegistry.push(createCompletionItem(items[0], CompletionItemKind.Class));
}

export function addCompletionClassItem(items: YmlItem[]) {
    items.forEach(element => {
        completionItemRegistry.push(createCompletionItem(element, CompletionItemKind.Method));
    });
}
