import * as vscode from 'vscode';
import * as api from './apimockup';
import {uri2fspath} from './util'
var fs = require('fs')


export interface ScriptMeta{
    uid?: string;
    path: string;
    timestamp?: string;
}

export interface ClientMeta{
    id: string;
    secret: string;
}

export class CrmScriptProject{
    
    existingfolders: string[] = [];
    scriptfolder: string = 'src';
    metafile = 'meta.json';
    clientfile = 'client.json'

    rootfolder: string;
    metas: ScriptMeta[];
    client: ClientMeta;

    constructor(root: string){
        this.rootfolder = root;
        let metafullpath = `${this.rootfolder}/${this.metafile}`;
        let clientfullpath = `${this.rootfolder}/${this.clientfile}`
        if(fs.existsSync(clientfullpath)){
            this.client = JSON.parse(fs.readFileSync(clientfullpath))
        }
        else{
            this.client = {id: "Client ID", secret:"ClientSecret"};
            fs.writeFile(clientfullpath, JSON.stringify(this.client), (err)=>{
                if(err) throw err;
                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(clientfullpath));
                vscode.window.showWarningMessage("Please provide the client id and client secret");
            });
            
        }
        if(fs.existsSync(metafullpath)){
            let content = fs.readFileSync(metafullpath);
            this.metas = JSON.parse(content)
        }
        else{
            this.metas = [];
        }
    }

    updateLocalMeta(){
        let metatext = api.listAllScripts();
        this.metas = JSON.parse(metatext);
        this.saveMeta();
    }

    updateAllLocalScript(){
        this.metas.forEach((meta:ScriptMeta)=>{
            this.updateLocalScript(meta);
        })
    }

    updateLocalScript(meta: ScriptMeta){
        let scriptText = api.getScriptSource(meta);
        this.writeToSource(meta.path, scriptText);
    }

    uploadScript(meta: ScriptMeta){
        let path = `${this.rootfolder}/${this.scriptfolder}/${meta.path}`;
        let content = fs.readFileSync(path, 'utf-8');
        api.uploadScriptSource(meta, content);
    }

    uploadAll(){
        this.metas.forEach((meta)=>{
            this.uploadScript(meta);
        })
    }

    /**
     * Write Script to files
     * @param path 
     * @param content 
     */
    writeToSource(path: string, content: string){
        let relativepath = `${this.scriptfolder}/${path}`
        this.mkdir(relativepath.substring(0, relativepath.lastIndexOf('/')));
        fs.writeFile(`${this.rootfolder}/${relativepath}`, content, (err)=>{
            if (err) console.log(err)
        });
    }

    getScriptMetaFromPath(path: string){
        return this.metas.find((meta) => {
            return meta.path == path;
        });
    }

    timestampScript(absolutepath: string){
        let path = this.getRelativeSourcePath(absolutepath)
        let meta = this.getScriptMetaFromPath(path);
        if(! meta){
            meta = this.createScriptForSource(path);
        }
        meta.timestamp = new Date().getTime().toString();
        this.saveMeta();
    }

    createScriptForSource(relativepath: string){
        let newmeta:ScriptMeta = {path: relativepath, timestamp: new Date().getTime().toString()}
        this.metas.push(newmeta);
        this.saveMeta();
        return newmeta;
    }

    private getRelativeSourcePath(absolutepath: string) {
        return absolutepath.substring(this.rootfolder.length + this.scriptfolder.length + 2);
    }

    saveMeta(){
        let formattedMetaText = JSON.stringify(this.metas, null, 2);
        fs.writeFileSync(`${this.rootfolder}/${this.metafile}`, formattedMetaText);
    }

    /**
     * Recursively create the folders in a path
     * @param relativePath 
     */
    private mkdir(relativePath: string){
        if(this.existingfolders.indexOf(relativePath) > -1){
            return;
        }

        let parentPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
        if(parentPath.length > 0)
            this.mkdir(parentPath);
       
        let absolutepath = `${this.rootfolder}/${relativePath}`;
        if(!fs.existsSync(absolutepath)){
            fs.mkdirSync(absolutepath);
        }
        this.existingfolders.push(relativePath)    
    }
}

export function getProjectForCurrentFolder(){
    let folders = vscode.workspace.workspaceFolders;
    if(folders.length > 1){
        vscode.window.showErrorMessage("Please keep only one folder opened");
        return;
    }
    if(folders.length == 0){
        vscode.window.showErrorMessage("No folder opened");
        return;
    }
    let rootpath = uri2fspath(vscode.workspace.workspaceFolders[0].uri);   
    let csProject = new CrmScriptProject(rootpath);
    return csProject;
}



