import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

export async function validateReferenceLibrary(client: LanguageClient): Promise<void> {
  const referenceLibraryExist = await checkReferenceLibraryExistence(client);

  let update = await shouldUpdateReferenceLibrary(referenceLibraryExist);

  await downloadReferenceLibraryWithProgress(client, update);

  await vscode.window.showInformationMessage('Done loading extension!');
}

async function checkReferenceLibraryExistence(client: LanguageClient): Promise<boolean> {
  return await client.sendRequest('workspace/executeCommand', {
    command: 'server.referenceLibrary.validate',
  });
}

async function shouldUpdateReferenceLibrary(referenceLibraryExist: boolean): Promise<boolean> {
  if (!referenceLibraryExist) {
    return true;
  }

  const result = await vscode.window.showInformationMessage(
    'Do you want to update the intellisense?',
    'Yes',
    'No'
  );

  return result === 'Yes';
}

async function downloadReferenceLibraryWithProgress(client: LanguageClient, update: boolean): Promise<void> {
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: update ? 'Downloading dependencies...' : 'Generating intellisense...',
    cancellable: false,
  }, async () => {
    await client.sendRequest('workspace/executeCommand', {
      command: 'server.referenceLibrary.download',
      arguments: [update]
    });
  });
}
