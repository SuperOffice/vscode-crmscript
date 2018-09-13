import * as vscode from 'vscode';
import * as api from './apimockup';
import {uri2fspath, getCurrentFsPath} from './util';
var md5 = require('md5');
var fs = require('fs')


export interface ScriptMeta {
    EjscriptId?: number,
    UniqueIdentifier?: string,
    Description: string,
    LongDescription?: string,
    IncludeId?: string,
    Path: string,
    FileName?: string,
    BaseFileHash: string
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
        this.metas.forEach((meta) =>{
            this.composeFileName(meta)
        })
        this.saveMeta();
    }

    updateAllLocalScript(){
        this.metas.forEach((meta:ScriptMeta)=>{
            this.updateLocalScript(meta);
        })
    }

    updateLocalScript(meta: ScriptMeta){
        let scriptText = api.getScriptSource(meta);
        this.writeToSource(`${meta.Path}/${meta.FileName}`, scriptText);
    }

    uploadScript(meta: ScriptMeta){
        let path = `${this.rootfolder}/${this.scriptfolder}/${meta.Path}/${meta.FileName}`;
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
            let metapathname = `${meta.Path}/${meta.FileName}`;
            let res = (metapathname == path); 
            return res;
        });
    }

    timestampScript(absolutepath: string){
        let path = this.getRelativeSourcePath(absolutepath)
        let meta = this.getScriptMetaFromPath(path);
        if(! meta){
            meta = this.createScriptForSource(path);
        }
        let content = fs.readFileSync(absolutepath, 'utf-8')
        meta.BaseFileHash = md5(content);
        this.saveMeta();
    }

    createScriptForSource(relativepath: string){
        let lastslash = relativepath.lastIndexOf('/')
        let path = relativepath.substring(0, lastslash)
        let name = relativepath.substring(lastslash+1)
        let newmeta:ScriptMeta = 
        {
            Path: relativepath, 
            BaseFileHash: 'placeholder',
            Description: name,
            FileName: name
        }
        this.metas.push(newmeta);
        this.saveMeta();
        return newmeta;
    }

    private getRelativeSourcePath(absolutepath: string) {
        return absolutepath.substring(this.rootfolder.length + this.scriptfolder.length + 2);
    }

    /**
     * Write meta info into disk. Recommend to invoke every time the meta is changed, so that the file on the disk is the main reference.
     */
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

    private fileNameCounts: {[id: string]: number} = {};
    private composeFileName(meta: ScriptMeta){
        let pathNameNoExt = `${meta.Path}/${meta.Description}`;
        let count: number = 0;
        let postfix = "";
        if(this.fileNameCounts[pathNameNoExt]){
            count = this.fileNameCounts[pathNameNoExt]
            count = count + 1
            postfix = ` ${count}`
        }
        this.fileNameCounts[pathNameNoExt] = count;
        let pathName = `${pathNameNoExt}${postfix}.crmscript`;
        let name = pathName.substring(pathName.lastIndexOf('/') + 1)
        meta.FileName = name;
        return name;
    }
}



export function getProjectForCurrentFolder(){
    let rootpath = getCurrentFsPath();   
    let csProject = new CrmScriptProject(rootpath);
    return csProject;
}



