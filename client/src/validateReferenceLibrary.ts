import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

export async function validateReferenceLibrary(client: LanguageClient): Promise<void> {
  // Send the request to the LSP server and await the response
  const referenceLibraryExist = await client.sendRequest('workspace/executeCommand', {
    command: 'server.referenceLibrary.validate',
  });

  let update = false;

  if (!referenceLibraryExist) {
    update = true;
    vscode.window.showInformationMessage('ReferenceLibrary missing. This will be downloaded');
  }
  else {
    const result = await vscode.window.showInformationMessage(
      'Do you want to update the ReferenceLibrary?',
      { modal: true },
      'Yes',
      'No'
    );

    if (result === 'Yes') {
      update = true;
    }
  }

  //TODO: Fix the issue where it returns done before it is actually done downloading the files
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Downloading ReferenceLibrary...',
    cancellable: false,
  }, async () => {
    await client.sendRequest('workspace/executeCommand', {
      command: 'server.referenceLibrary.download',
      arguments: [update]
    });
  });


  // Wait for the download promise to resolve before displaying the message
  await vscode.window.showInformationMessage('Done downloading ReferenceLibrary');
}
