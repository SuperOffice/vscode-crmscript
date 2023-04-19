import { createWriteStream, existsSync, mkdirSync, promises as fsPromises } from 'fs';
import path = require('path');
import { load } from 'js-yaml';
import { CompletionItem } from 'vscode-languageserver/node';
import { YmlFile, YmlItem } from './Interfaces';
import axios from 'axios';
import { addCompletionClassItem, addCompletionItem } from './providers/completionProvider';

const GITHUB_HOST = 'raw.githack.com';
const GITHUB_PATH_PREFIX = '/SuperOfficeDocs/superoffice-docs/main/docs/en/automation/crmscript/reference/';
const REFERENCE_FOLDER_PATH = path.join(__dirname, './reference');

let updateReferenceLibraryFiles = false;

// Cache defined variables, used for getting correct intellisense for classes
export const completionItemRegistry: CompletionItem[] = [];

export async function validateDirPath(): Promise<Boolean> {
  if (!existsSync(REFERENCE_FOLDER_PATH)) {
    mkdirSync(REFERENCE_FOLDER_PATH, { recursive: true });
    return false;
  }
  return true;
}

async function fetchYMLfile(filename: string): Promise<string | undefined> {
  const filePath = path.join(REFERENCE_FOLDER_PATH, filename);

  if (!updateReferenceLibraryFiles) {
    const fileContents = await fsPromises.readFile(filePath, 'utf8');
    return fileContents;
  }

  try {
    const response = await axios.get(`https://${GITHUB_HOST}${GITHUB_PATH_PREFIX}${filename}`, {
      responseType: 'stream',
    });

    const fileStream = createWriteStream(filePath);
    response.data.pipe(fileStream);

    await new Promise<void>((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    const fileContents = await fsPromises.readFile(filePath, 'utf8');
    return fileContents;
  } catch (error) {
    console.error(`Error downloading file ${filename}: ${(error as Error).message}`);
  }
}

async function parseChildren(children: string[]): Promise<void> {
  for (const child of children) {
    try {
      const result = await fetchYMLfile(`${child}.yml`);
      if (result) {
        const childFile = load(result) as YmlFile;
        addCompletionItem(childFile.items as YmlItem[]);
      } else {
        console.error(`Could not find file ${child}.yml`);
      }
    } catch (error) {
      console.error(`Error on file ${child}.yml: ${error}`);
    }
  }
}

async function parseYMLfile(file: YmlFile) {
  if (file.items[0].type == "Namespace") {
    await parseChildren(file.items[0].children as string[]);
  } 
  else if (file.items[0].type == "Class") {
    addCompletionClassItem(file.items as YmlItem[]);
    //console.error(`This is a type Class: ${file.items[0].uid}`);
  }
  else {
    console.error(`Unknown type: ${file.items[0].type}`);
  }
}

async function processTocItems(items: YmlItem[]): Promise<void> {
  for (const item of items) {
    if (item.href) {
      const result = await fetchYMLfile(item.href);
      if (result) {
        const ymlFile = load(result) as YmlFile
        await parseYMLfile(ymlFile);
      } else {
        console.error(`Could not download file: ${item.href}`);
      }
    } else {
      console.error(`Missing href: ${item.href} for file: ${item.uid}.yml. Skipping this file`);
    }
  }
}

export async function UpdateReferenceLibrary(update: boolean) {
  updateReferenceLibraryFiles = update;
  await validateDirPath();

  const result = await fetchYMLfile('toc.yml');
  if (result) {
    const tocFile = load(result) as YmlFile;
    if (tocFile) {
      await processTocItems(tocFile.items);
    }
  } else {
    console.error(`Could not download toc.yml`);
  }
  return true;
}

