import { request } from 'http';
import { createWriteStream, readFileSync } from 'fs';
import { load } from "js-yaml";
import path = require('path');
import { TocRoot } from './interface';

export const tocYmlFileName = "toc.yml";





function getTocFile(tocYmlFileName: string) {
  return new Promise((resolve) => {
    request(
      {
        host: 'raw.githack.com',
        path: '/SuperOfficeDocs/superoffice-docs/main/docs/en/automation/crmscript/reference/' + tocYmlFileName,
        method: 'GET',
      },
      function (response) {
        response.on('end', () => {
          resolve(response);
        });
        const fileStream = createWriteStream(path.join(__dirname, 'reference', tocYmlFileName));
        response.pipe(fileStream);
      }
    )
      .end();
  });
}

function getYmlFile(ymlFileName: string) {
  const fileStream = createWriteStream(path.join(__dirname, 'reference', ymlFileName));
  const req = request(
    {
      host: 'raw.githack.com',
      path: '/SuperOfficeDocs/superoffice-docs/main/docs/en/automation/crmscript/reference/' + ymlFileName,
      method: 'GET',
    },
    response => {
      response.pipe(fileStream);
      return response;
    }
  );
  req.end();
}

export function updateReferenceLibrary(tocYmlFileName: string) {
  console.log(path.join(__dirname, 'reference', tocYmlFileName));
  try {
    getTocFile(tocYmlFileName)
      .then(response => {
        const filePath = path.join(__dirname, 'reference', tocYmlFileName),
          contents = readFileSync(filePath, 'utf8'),
          data = load(contents) as TocRoot;
        data.items.forEach(function (item) {

          //Check if item.href is undefined
          if (item.href != undefined) {
            getYmlFile(item.href);
            if (item.items !== undefined) {
              item.items.forEach(function (innerItem) {
                if (innerItem.name != "Enums") {
                  getYmlFile(innerItem.href);
                }
                else {
                  if (innerItem.items) {
                    innerItem.items.forEach(function (enumItem) {
                      getYmlFile(enumItem.href);
                    });
                  }
                }
              });
            }
          }
          else {
            console.log("Cant find yml-file for: " + item.name);
          }
        });
      })
      .catch(error => {
        console.log(error);
      });
  } catch (err) {
    console.log(err);
  }
}