import { CompletionItem, CompletionItemKind, MarkupContent, MarkupKind } from "vscode-languageserver/node";
import { MyCompletionItemData, YmlItem } from "./Interfaces";
import { completionItemRegistry } from "./updateReferenceLibrary";

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