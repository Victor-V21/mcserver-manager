import fs from 'fs';
import path from 'path';
import { ConfigService } from './config.service';

export interface FileItem {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string;
}

export class FilesService {
  private static instance: FilesService;
  private configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): FilesService {
    if (!FilesService.instance) {
      FilesService.instance = new FilesService();
    }
    return FilesService.instance;
  }

  private resolveSafePath(relativePath: string = ''): string {
    const root = this.configService.getRootPath();
    const cleanRel = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const resolved = path.resolve(root, cleanRel);

    // Prevent directory traversal outside root
    if (!resolved.startsWith(root)) {
      return root;
    }
    return resolved;
  }

  public listFiles(relativePath: string = ''): {
    currentPath: string;
    parentPath: string | null;
    items: FileItem[];
  } {
    const root = this.configService.getRootPath();
    const dirPath = this.resolveSafePath(relativePath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const relFromRoot = path.relative(root, dirPath);
    let parentPath: string | null = null;
    if (relFromRoot && relFromRoot !== '.' && relFromRoot !== '') {
      const parent = path.dirname(relFromRoot);
      parentPath = parent === '.' ? '' : parent;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items: FileItem[] = [];

    for (const entry of entries) {
      // Don't show hidden git files or temporary files
      if (entry.name.startsWith('.git') || entry.name.endsWith('.tmp')) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      try {
        const stats = fs.statSync(fullPath);
        const itemRel = path.relative(root, fullPath);
        items.push({
          name: entry.name,
          relativePath: itemRel,
          isDirectory: entry.isDirectory(),
          size: entry.isDirectory() ? 0 : stats.size,
          modified: stats.mtime.toISOString(),
          extension: entry.isDirectory() ? 'dir' : path.extname(entry.name).slice(1).toLowerCase(),
        });
      } catch {}
    }

    // Sort: directories first, then alphabetically
    items.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });

    return {
      currentPath: relFromRoot === '.' ? '' : relFromRoot,
      parentPath,
      items,
    };
  }

  public getFileContent(relativePath: string): string {
    const filePath = this.resolveSafePath(relativePath);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${relativePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      throw new Error('Cannot read directory as file');
    }

    // Limit read size to 5MB for browser safety
    if (stats.size > 5 * 1024 * 1024) {
      throw new Error('File is too large to open in web editor (> 5MB)');
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  public saveFileContent(relativePath: string, content: string): void {
    const filePath = this.resolveSafePath(relativePath);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Backup existing file
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      } catch {}
    }

    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  public createDirectory(relativePath: string, dirName: string): string {
    const cleanDirName = path.basename(dirName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const parent = this.resolveSafePath(relativePath);
    const targetDir = path.join(parent, cleanDirName);

    if (fs.existsSync(targetDir)) {
      throw new Error('Directory already exists');
    }

    fs.mkdirSync(targetDir, { recursive: true });
    const root = this.configService.getRootPath();
    return path.relative(root, targetDir);
  }

  public renameItem(oldRelativePath: string, newName: string): void {
    const oldPath = this.resolveSafePath(oldRelativePath);
    if (!fs.existsSync(oldPath)) {
      throw new Error('Item does not exist');
    }

    const safeNewName = path.basename(newName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const newPath = path.join(path.dirname(oldPath), safeNewName);

    if (fs.existsSync(newPath)) {
      throw new Error('An item with this name already exists');
    }

    fs.renameSync(oldPath, newPath);
  }

  public deleteItem(relativePath: string): void {
    const targetPath = this.resolveSafePath(relativePath);
    const root = this.configService.getRootPath();

    // Prevent deleting root itself
    if (targetPath === root) {
      throw new Error('Cannot delete server root directory');
    }

    if (!fs.existsSync(targetPath)) {
      return;
    }

    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
  }
}
