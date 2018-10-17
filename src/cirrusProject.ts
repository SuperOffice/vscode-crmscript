import * as vscode from 'vscode';
import {createScriptAndSource} from './apimockup';
import {getScriptSource, listAllScripts, uploadScriptSource, getNameSpace, deleteScript} from './api';
import {uri2fspath, getCurrentFsPath} from './util';
var md5 = require('md5');
var fs = require('fs')

export interface ScriptMeta {
    registeredDate?: string,
    updatedDate?: string,
    uniqueIdentifier?: string,
    description?: string,
    path: string,
    name?: string,
    includeId?: string,
    accessKey?: string,
    PrimaryKey?: string,
    hierarchyFullname?: string,
    htmlOutput?: boolean,
    extraMenuId?: number,
    ejscriptId?: number,
    hierarchyId?: number,
    fileName?:string,
    baseFileHash?: string
}

export interface ClientMeta{
    id: string;
    secret: string;
}

/**
 * The main class to manage a CRMScript local project.
 * A new object is created every time the follow commands are executed: Download source, upload source, and a source code file saved
 * A new meta object is loaded from the file system when a project object is created.
 */
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

    /**
     * Now it's the only opened way to download the meta information from the online tenant. In other words, if you want to update the meta information, you will get all the source code updated as well.
     */
    updateLocalMetaAndSource(){
        let metatext = listAllScripts((metatext)=>{
            this.metas = JSON.parse(metatext);
            this.metas.forEach((meta) =>{
                this.composeFileName(meta)
            })
            this.saveMeta();
            this.updateAllLocalScript();
        });
        
    }

    updateAllLocalScript(){
        this.metas.forEach((meta:ScriptMeta)=>{
            this.updateLocalScript(meta);
        })
    }

    updateLocalScript(meta: ScriptMeta){
        getScriptSource(meta, (res) =>{
            //let puretext = this.fromRemoteText(res)
            let puretext = res
            meta.baseFileHash = md5(puretext)         
            this.writeToSource(`${meta.path}/${meta.fileName}`, puretext)
            this.saveMeta()
        });
    }

    uploadScript(meta: ScriptMeta){
        let path = `${this.rootfolder}/${this.scriptfolder}/${meta.path}/${meta.fileName}`;

        if(!fs.existsSync(path)){
            deleteScript(meta, (res)=>{
                console.log(res)
            })
            return
        }

        let content = fs.readFileSync(path, 'utf-8');
        
        let newhash = md5(content)
        if(newhash != meta.baseFileHash)
            //uploadScriptSource(meta, this.toRemoteText(content));
            uploadScriptSource(meta, content, (res)=>{
                //console.log(res)
                meta.uniqueIdentifier = res.UniqueIdentifier
                meta.baseFileHash = md5(res.Source)
                this.saveMeta()
            })
    
    }

    uploadAll(){
        this.metas.forEach((meta)=>{
            this.uploadScript(meta);
        })
    }

    deleteEmptyScripts(){
        this.metas.forEach((meta)=>{
            let path = `${this.rootfolder}/${this.scriptfolder}/${meta.path}/${meta.fileName}`;
            if(!fs.existsSync(path)){
                deleteScript(meta, (res)=>{
                    console.log(res)
                })
            }
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
            let metapathname = `${meta.path}/${meta.fileName}`;
            let res = (metapathname == path); 
            return res;
        });
    }

    getScriptMetaFromAbsolutePath(absolutepath: string){
        let path = this.getRelativeSourcePath(absolutepath)
        return this.getScriptMetaFromPath(path)
    }

    stampSavedScript(absolutepath: string){
        let path = this.getRelativeSourcePath(absolutepath)
        let meta = this.getScriptMetaFromPath(path);
        if(!meta){
            meta = this.createScriptForSource(path);
        }
        //let content = fs.readFileSync(absolutepath, 'utf-8') 
        //meta.BaseFileHash = md5(content);
        //this.saveMeta();
    }

    createScriptForSource(relativepath: string){
        let lastslash = relativepath.lastIndexOf('/')
        let path = relativepath.substring(0, lastslash)
        let fileName = relativepath.substring(lastslash+1)
        let name = fileName.substring(0, fileName.lastIndexOf('.'));
        let namespace = getNameSpace();
        //let uid = `${getNameSpace()}.${relativepath}`.replace('/', '.').replace(' ', '_')
        let newmeta:ScriptMeta = 
        {
            path: path, 
            baseFileHash: 'no hash from server',
            name: name,
            fileName: fileName
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
        if(meta.path.endsWith("/"))
            meta.path = meta.path.substring(0, meta.path.length-1)
        let pathNameNoExt = `${meta.path}/${meta.name}`;
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
        meta.fileName = name;
        return name;
    }

    private toRemoteText(cleantext){
         //The following lines check if the convertion is reversable
        let recover = JSON.stringify({text: cleantext})
        let remotetext = recover.substring(8, recover.length - 1)
        // console.log(recover)
        // console.log(recover.substring(8, recover.length - 1) == res)
        return remotetext
    }

    private fromRemoteText(remotetext){
        let puretext = JSON.parse(`{"text":${remotetext}}`).text
        return puretext
    }
}



export function getProjectForCurrentFolder(){
    let rootpath = getCurrentFsPath();   
    let csProject = new CrmScriptProject(rootpath);
    return csProject;
}



