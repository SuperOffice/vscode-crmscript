import path = require("path");
import { promises as fsPromises } from "fs";
import { load } from 'js-yaml';
import { YmlFile } from "../Interfaces";
import { decode } from 'he';

type MethodInformation = {
    name: string;
    summary: string;
};

type ClassInformation = {
    methods: MethodInformation[];
    summary: string;
};

type CompletionItem = Record<string, ClassInformation>;

const completionItems: CompletionItem = {};

const REFERENCE_FOLDER_PATH = path.join(__dirname, '..', './reference');
const COMPLETIONITEMS_FILE_PATH = path.join(__dirname, 'completionItems.json');

export async function CreateIntellisenseFromFileContent(fileContent: YmlFile): Promise<void> {
    const startTime = performance.now();
    // Prepare a list of promises for Promise.all
    const methodInfoPromises: Promise<void>[] = [];
    let parentClassName = '';
    for (const item of fileContent.items) {
        if (item.type === 'Class') {
            if(!completionItems.hasOwnProperty(item.name)){
                completionItems[item.name] = {
                    methods: [],
                    summary: item.summary || '',
                };
                parentClassName = item.name;
            }
        } else if (item.type === 'Method') {
            if (parentClassName) {
                methodInfoPromises.push(
                    getCodeBlock(item.example)
                        .then(example => {
                            const methodInfo = {
                                name: item.name,
                                summary: item.summary || '',
                                example,
                            };
                            const classItem = completionItems[parentClassName];
                            if(classItem){
                                classItem.methods.push(methodInfo);
                            }
                        })
                        .catch(error => {
                            console.error(`Error getting code block for ${item.name}: ${error}`);
                        })
                );
            }
        }
    }

    // Wait for all getCodeBlock promises to resolve
    await Promise.allSettled(methodInfoPromises);

    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    console.log(`Elapsed time: ${elapsedTime} ms`);
}

export async function writeAllCompletionItemsToFile(): Promise<boolean> {
    await fsPromises.writeFile(COMPLETIONITEMS_FILE_PATH, JSON.stringify(completionItems, null, 2), 'utf-8');
    return true;
}

async function getCodeBlock(example?: string | string[]): Promise<string> {
    const exampleString = example ? (Array.isArray(example) ? example[0] : example) : '';
    return decode(/<code>(.*?)<\/code>/s.exec(exampleString)?.[1] || '');
}