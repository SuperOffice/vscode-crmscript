import { CompletionItem, CompletionItemKind, MarkupContent, MarkupKind } from "vscode-languageserver/node";
import { MyCompletionItemData, YmlFile, YmlItem } from "./Interfaces";
import { completionItemRegistry } from "./updateReferenceLibrary";
import path = require("path");
import { readFileSync } from "fs";
import { load } from "js-yaml";

function createMarkdown(items: YmlItem[]): MarkupContent {
    const example = items[0].example || '';
    const exampleString = Array.isArray(example) ? example[0] : example;
    const codeBlock = /<code>(.*?)<\/code>/s.exec(exampleString)?.[1] || '';
    const myData: MyCompletionItemData = {
      filename: `${items[0].uid}.yml`,
      exampleCode: codeBlock
    };
    return {
      kind: MarkupKind.Markdown,
      value: [
        `# ${items[0].name}`,
        `[Docs] https://docs.superoffice.com/en/automation/crmscript/reference/${items[0].uid}.html`,
        '',
        `${items[0].summary}`,
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
      documentation: createMarkdown(items),
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