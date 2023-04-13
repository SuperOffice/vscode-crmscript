import { VariableInfo } from './Interfaces';
import { completionItemRegistry } from './updateReferenceLibrary';

// Cache defined variables, used for getting correct intellisense for classes
export const variablesRegistry: Map<string, VariableInfo> = new Map();
export const methodsRegistry: Map<string, MethodInfo> = new Map();

export function updateVariablesRegistryOld(documentText: string): void {
    const regex = /(\w+)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)(?:\s*=\s*(.*))?;/g;
    let match: string[] | null;

    variablesRegistry.clear();
    while ((match = regex.exec(documentText)) !== null) {
        const variableType = match[1];
        const variableName = match[2];
        const variableLookup = completionItemRegistry.find(item => item.label === variableType);
        const variableInfo: VariableInfo = { name: variableName, href: variableLookup?.data.filename };
        variablesRegistry.set(variableName, variableInfo);
    }
}

export function updateVariablesRegistry(documentText: string): void {
    const regex = /(\w+)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)(?:\s*=\s*(.*))?;|(\w+)\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([\w\d_$]*))?/g
    let match: string[] | null;

    variablesRegistry.clear();
    methodsRegistry.clear();
    while ((match = regex.exec(documentText)) !== null) {
        const variableType = match[1];
        const variableName = match[2];
        const methodName = match[5];
        const methodParams = match[6];
        // Check if the match includes method parameters
        if(variableType == 'return'){
            continue;
        }
        else if(methodName){
            const methodInfo: MethodInfo = {
                params: methodParams.split(',').map(param => param.trim()),
                returns: match[4]
            };
            methodsRegistry.set(methodName, methodInfo);
        }
        else{
            const variableLookup = completionItemRegistry.find(item => item.label === variableType);
            const variableInfo: VariableInfo = { name: variableName, href: variableLookup?.data.filename };
            variablesRegistry.set(variableName, variableInfo);
        }
    }
}
    interface MethodInfo {
        params: string[];
        returns: string;
    }