import { VariableInfo } from './Interfaces';
import { completionItemRegistry } from './updateReferenceLibrary';

// Cache defined variables, used for getting correct intellisense for classes
export const variablesRegistry: Map<string, VariableInfo> = new Map();

export function updateVariablesRegistry(documentText: string): void {
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
