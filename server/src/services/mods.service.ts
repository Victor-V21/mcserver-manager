import fs from 'fs';
import path from 'path';
import { ConfigService } from './config.service';
import { SUBDIRS } from '../config/constants';
import { ModItem } from '../types';

export class ModsService {
  private static instance: ModsService;
  private configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): ModsService {
    if (!ModsService.instance) {
      ModsService.instance = new ModsService();
    }
    return ModsService.instance;
  }

  public getModsDir(): string {
    const dir = this.configService.resolvePath(SUBDIRS.MODS);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public listMods(): ModItem[] {
    const dir = this.getModsDir();
    try {
      const files = fs.readdirSync(dir);
      const mods: ModItem[] = [];

      for (const file of files) {
        if (!file.endsWith('.jar') && !file.endsWith('.jar.disabled')) {
          continue;
        }

        const fullPath = path.join(dir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            mods.push({
              name: file,
              filename: file,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              isEnabled: file.endsWith('.jar'),
            });
          }
        } catch {
          // ignore stat errors on volatile files
        }
      }

      return mods.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error('Error reading mods directory:', err);
      return [];
    }
  }

  public listEnabledModFiles(): { filename: string; fullPath: string }[] {
    const dir = this.getModsDir();
    return this.listMods()
      .filter((mod) => mod.isEnabled)
      .map((mod) => ({
        filename: mod.filename,
        fullPath: path.join(dir, mod.filename),
      }));
  }

  public toggleMod(filename: string, enable: boolean): { success: boolean; newName: string } {
    let safeName = path.basename(filename);
    const dir = this.getModsDir();
    let currentPath = path.join(dir, safeName);

    if (!fs.existsSync(currentPath)) {
      if (safeName.endsWith('.disabled') && fs.existsSync(path.join(dir, safeName.slice(0, -'.disabled'.length)))) {
        safeName = safeName.slice(0, -'.disabled'.length);
        currentPath = path.join(dir, safeName);
      } else if (!safeName.endsWith('.disabled') && fs.existsSync(path.join(dir, `${safeName}.disabled`))) {
        safeName = `${safeName}.disabled`;
        currentPath = path.join(dir, safeName);
      } else {
        throw new Error(`Mod file "${safeName}" not found`);
      }
    }

    let newName = safeName;
    if (enable) {
      if (safeName.endsWith('.jar.disabled')) {
        newName = safeName.slice(0, -'.disabled'.length);
      }
    } else {
      if (safeName.endsWith('.jar')) {
        newName = `${safeName}.disabled`;
      }
    }

    if (newName !== safeName) {
      const newPath = path.join(dir, newName);
      fs.renameSync(currentPath, newPath);
    }

    return { success: true, newName };
  }

  public renameMod(oldName: string, newName: string): { success: boolean; finalName: string } {
    const safeOld = path.basename(oldName);
    let safeNew = path.basename(newName);

    if (!safeNew.endsWith('.jar') && !safeNew.endsWith('.jar.disabled')) {
      safeNew += '.jar';
    }

    const dir = this.getModsDir();
    const oldPath = path.join(dir, safeOld);
    const newPath = path.join(dir, safeNew);

    if (!fs.existsSync(oldPath)) {
      throw new Error(`Mod file "${safeOld}" not found`);
    }

    if (fs.existsSync(newPath) && safeOld !== safeNew) {
      throw new Error(`Target file name "${safeNew}" already exists`);
    }

    fs.renameSync(oldPath, newPath);
    return { success: true, finalName: safeNew };
  }

  public deleteMod(filename: string): boolean {
    const safeName = path.basename(filename);
    const dir = this.getModsDir();
    const filePath = path.join(dir, safeName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  public disableAllMods(): { success: boolean; count: number } {
    const dir = this.getModsDir();
    if (!fs.existsSync(dir)) return { success: true, count: 0 };

    let count = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.jar') && !file.endsWith('.jar.disabled')) {
        const oldPath = path.join(dir, file);
        const newPath = path.join(dir, `${file}.disabled`);
        try {
          fs.renameSync(oldPath, newPath);
          count++;
        } catch (e) {
          console.error(`Error disabling mod ${file}:`, e);
        }
      }
    }
    return { success: true, count };
  }

  public deleteAllMods(): { success: boolean; count: number } {
    const dir = this.getModsDir();
    if (!fs.existsSync(dir)) return { success: true, count: 0 };

    let count = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.jar') || file.endsWith('.jar.disabled')) {
        const filePath = path.join(dir, file);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            count++;
          }
        } catch (e) {
          console.error(`Error deleting mod ${file}:`, e);
        }
      }
    }
    return { success: true, count };
  }
}
