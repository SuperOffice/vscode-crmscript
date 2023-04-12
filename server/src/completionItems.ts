import { CompletionItem, CompletionItemKind, MarkupContent, MarkupKind } from "vscode-languageserver/node";
import { MyCompletionItemData, VariableInfo, YmlFile, YmlItem } from "./Interfaces";
import { completionItemRegistry } from "./updateReferenceLibrary";
import path = require("path");
import { readFileSync } from "fs";
import { load } from "js-yaml";

function createMarkdown(items: YmlItem): MarkupContent {
    const example = items.example || '';
    const exampleString = Array.isArray(example) ? example[0] : example;
    const codeBlock = /<code>(.*?)<\/code>/s.exec(exampleString)?.[1] || '';
    const myData: MyCompletionItemData = {
      filename: `${items.uid}.yml`,
      exampleCode: codeBlock
    };
    return {
      kind: MarkupKind.Markdown,
      value: [
        `# ${items.name}`,
        `[Docs] https://docs.superoffice.com/en/automation/crmscript/reference/${items.uid}.html`,
        '',
        `${items.summary}`,
        '',
        '```javascript',
        '',
        `${codeBlock}`,
        '',
        '```',
        '',
        `Click [here](command:insertExampleCode?${encodeURIComponent(JSON.stringify(myData))}) to insert the example code.`
      ].join('\n')
    };
  }
  
  function createCompletionItem(items: YmlItem[]): CompletionItem {
    const obj: CompletionItem = {
      label: items[0].name,
      kind: CompletionItemKind.TypeParameter,
      insertText: `${items[0].name} ${items[0].name.toLowerCase()};`,
      documentation: createMarkdown(items[0]),
      data: {
        filename: `${items[0].uid as string}.yml`,
        exampleCode: ''
      }
    };
    return obj;
  }
  
  export function addCompletionItem(items: YmlItem[]) {
    completionItemRegistry.push(createCompletionItem(items));
  }

  export function addClassMethods(completionItems: CompletionItem[], ymlFileName: string) {
	const ymlFilePath = path.join(__dirname, 'reference', ymlFileName),
		contents = readFileSync(ymlFilePath, 'utf8'),
		ymlFile = load(contents) as YmlFile;

	for (let i = 1; i < ymlFile.items.length; ++i) {

        const obj: CompletionItem = {
            label: ymlFile.items[i].name,
            kind: CompletionItemKind.TypeParameter,
            insertText: `${ymlFile.items[i].name} ${ymlFile.items[i].name.toLowerCase()};`,
            documentation: createMarkdown(ymlFile.items[i]),
            data: {
              filename: `${ymlFile.items[i].uid as string}.yml`,
              exampleCode: ''
            }
          };

		completionItems.push(obj);
	}
	return completionItems;
}

export function addvariablesRegistryToCompletionItems(completionItems: CompletionItem[], variablesRegistry: Map<string, VariableInfo>) {
	for (const [key, value] of variablesRegistry.entries()) {
		const obj = {
			label: key,
			kind: CompletionItemKind.Variable,
		};
		completionItems.push(obj);
	}
	return completionItems;
}