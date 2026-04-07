import type { FileNode } from '../code-studio/core/types';

export interface ElectronFS {
  openDirectory: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  readdir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; path: string }[]>;
  exists: (filePath: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electron?: {
      getAppVersion: () => Promise<string>;
      fs: ElectronFS;
    };
  }
}

export const isElectron = typeof window !== 'undefined' && window.electron !== undefined;

export async function loadLocalDirectory(rootPath?: string): Promise<FileNode | null> {
  if (!isElectron || !window.electron) throw new Error('Not in Electron environment');

  const electron = window.electron;
  const targetPath = rootPath || (await window.electron.fs.openDirectory());
  if (!targetPath) return null;

  const name = targetPath.split(/[/\\]/).pop() || targetPath;
  const rootNode: FileNode = {
    id: `local-${targetPath}`,
    name,
    type: 'folder',
    children: []
  };

  const traverse = async (currentPath: string, node: FileNode) => {
    const entries = await electron.fs.readdir(currentPath);
    for (const entry of entries) {
      if (
        entry.name === 'node_modules' || 
        entry.name === '.git' || 
        entry.name === '.next' ||
        entry.name === 'out' ||
        entry.name === '.DS_Store'
      ) continue;

      const childNode: FileNode = {
        id: `local-${entry.path}`,
        name: entry.name,
        type: entry.isDirectory ? 'folder' : 'file',
      };

      if (entry.isDirectory) {
        childNode.children = [];
        await traverse(entry.path, childNode);
      }
      
      if (!node.children) node.children = [];
      node.children.push(childNode);
    }
  };

  await traverse(targetPath, rootNode);
  return rootNode;
}
