import { request } from 'http';
import { createWriteStream, existsSync, mkdirSync, readFileSync, promises as fsPromises } from 'fs';
import path = require('path');
import { load } from 'js-yaml';
import { CompletionItem, CompletionItemKind, CompletionItemTag, MarkupContent, MarkupKind } from 'vscode-languageserver/node';
import { YmlFile, YmlItem, MyCompletionItemData } from './Interfaces';
import axios from 'axios';
import { addCompletionItem } from './completionItems';

const GITHUB_HOST = 'raw.githack.com';
const GITHUB_PATH_PREFIX = '/SuperOfficeDocs/superoffice-docs/main/docs/en/automation/crmscript/reference/';
const REFERENCE_FOLDER_PATH = './reference';

let updateReferenceLibraryFiles = false;

let dirPath = '';
// Cache defined variables, used for getting correct intellisense for classes
export const completionItemRegistry: CompletionItem[] = [];

export async function validateDirPath(): Promise<Boolean> {
  dirPath = path.join(__dirname, REFERENCE_FOLDER_PATH);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    return false;
  }
  return true;
}


async function fetchYMLfile(filename: string): Promise<string | undefined> {
  const filePath = path.join(dirPath, filename);

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

async function getYmlFile(filename: string): Promise<YmlFile | undefined> {
  const result = await fetchYMLfile(filename);
  if (result) {
    const ymlFile = load(result) as YmlFile;
    return load(result) as YmlFile;
  }
}

async function getCategoryChildrenData(file: YmlFile) {
  if (file.items[0].type == "Namespace") {
    for (const child of file.items[0].children as string[]) {
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
  } else {
    console.error(`This is not a namespace`);
  }
}

export async function UpdateReferenceLibrary(update: boolean) {
  updateReferenceLibraryFiles = update;
  await validateDirPath();
  const tocFile = await getYmlFile('toc.yml');
  if(tocFile){
    for (const item of tocFile.items) {
      if (item.href) {
        await getYmlFile(item.href)
          .then(async (categoryData) => {
            if(categoryData){
              const categoryChildrenData = getCategoryChildrenData(categoryData);
            }
          });
      }
      else {
        console.error(`Missing href: ${item.href} for file: ${item.uid}.yml. Skipping this file`);
      }
    }
  }
}
/*LEGACY */
async function fetchYMLfileOld(filename: string): Promise<string> {
  if (!updateReferenceLibraryFiles) {
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