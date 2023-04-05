import { request } from 'http';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import path = require('path');
import { load } from 'js-yaml';
import { CompletionItem, CompletionItemKind, CompletionItemTag, MarkupContent, MarkupKind } from 'vscode-languageserver/node';
import { CategoryData, ChildData, MyCompletionItemData, TocData, TocItem } from './Interfaces';

const GITHUB_HOST = 'raw.githack.com';
const GITHUB_PATH_PREFIX = '/SuperOfficeDocs/superoffice-docs/main/docs/en/automation/crmscript/reference/';
const REFERENCE_FOLDER_PATH = './reference';

const debug = true;

let dirPath = '';
// Cache defined variables, used for getting correct intellisense for classes
export const completionItemRegistry: CompletionItem[] = [];

async function validateDirPath() {
  dirPath = path.join(__dirname, REFERENCE_FOLDER_PATH);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

async function fetchYMLfile(filename: string): Promise<string> {
  if (debug) {
    const filePath = path.join(dirPath, filename);
    const fileContents = readFileSync(filePath, 'utf8');
    return fileContents;
  }

  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: GITHUB_HOST,
        path: GITHUB_PATH_PREFIX + filename,
        method: 'GET',
      },
      function (response) {
        if (response.statusCode !== 200) {
          reject(`Error downloading file: HTTP ${response.statusCode}`);
          return;
        }
        const filePath = path.join(dirPath, filename);
        const fileStream = createWriteStream(filePath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          const fileContents = readFileSync(filePath, 'utf8');
          resolve(fileContents);
        });
      }
    );
    req.on('error', (error) => {
      reject(`Error downloading file: ${error.message}`);
    });
    req.end();
  });
}

async function getTocData(): Promise<TocData> {
  await validateDirPath();
  const result = await fetchYMLfile('toc.yml');
  return load(result) as TocData;
}

async function getCategoryData(tocItem: TocItem): Promise<CategoryData> {
  const result = await fetchYMLfile(tocItem.href);
  return load(result) as CategoryData;
}

async function getCategoryChildrenData(categoryData: CategoryData) {
  if (categoryData.items[0].type == "Namespace") {
    for (const child of categoryData.items[0].children) {
      try {
        const result = await fetchYMLfile(`${child}.yml`);
        const childData = load(result) as ChildData;
        addCompletionItem(childData as ChildData);
      } catch (error) {
        console.error(`Error downloading ${child}.yml: ${error}`);
      }
    }
  }
  else {
    console.error(`This is not a namespace`);
  }
}

export async function UpdateReferenceLibrary() {
  const tocData = await getTocData();
  for (const item of tocData.items) {
    if (item.href) {
      await getCategoryData(item)
        .then(async (categoryData) => {
          const categoryChildrenData = getCategoryChildrenData(categoryData);
        });
    }
    else {
      console.error(`Missing href: ${item.href}`);
    }
  }
}

function createMarkdown(childData: ChildData): MarkupContent {
  const example = childData.items[0].example || '';
  const exampleString = Array.isArray(example) ? example[0] : example;
  const codeBlock = /<code>(.*?)<\/code>/s.exec(exampleString)?.[1] || '';
  const myData: MyCompletionItemData = {
    filename: `${childData.items[0].uid}.yml`,
    exampleCode: codeBlock
  };
  return {
    kind: MarkupKind.Markdown,
    value: [
      `# ${childData.items[0].name}`,
      `[Docs] https://docs.superoffice.com/en/automation/crmscript/reference/${childData.items[0].uid}.html`,
      '',
      `${childData.items[0].summary}`,
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

function createCompletionItem(childData: ChildData): CompletionItem {
  const obj: CompletionItem = {
    label: childData.items[0].name,
    kind: CompletionItemKind.TypeParameter,
    insertText: `${childData.items[0].name} ${childData.items[0].name.toLowerCase()};`,
    documentation: createMarkdown(childData),
    data: {
      filename: `${childData.items[0].uid}.yml`,
      exampleCode: ''
    }
  };
  return obj;
}

function addCompletionItem(childData: ChildData) {
  completionItemRegistry.push(createCompletionItem(childData));
}