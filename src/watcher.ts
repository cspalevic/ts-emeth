import chalk from "chalk";
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import {isAbsolute, parse as pathParse, format, relative, join} from 'path';
import {promisify} from 'util';
import {transform} from "./extract";

const writeFile = promisify(fs.writeFile);

export type TemplateFn = (fileName: string, keys: string[]) => string;

export type Options = {
    persistent?: boolean,
    verbose?: boolean,
    path: string[] | string,
    template?: TemplateFn | string,
    cwd?: string,
    outDir?: string,
    extension?: string,
    localsConvention?: 'asIs' | 'camelCase' | 'camelCaseOnly',
}

const importTemplate = async (file: string): Promise<TemplateFn> => {
    if (!file) {
        throw new Error(`Must provide a file`);
    }
    const ret = await import(file + '');
    return (ret.default || ret) as TemplateFn;
};


type Run = (fileName: string) => Promise<void | string>;
export const transformFile = async ({
                                        cwd = process.cwd(),
                                        localsConvention,
                                        template,
                                        outDir,
                                        extension = '',
                                        verbose
                                    }: Options): Promise<Run> => {
    console.log('template = ' + template);
    const extract = transform({context: cwd}, {localsConvention});
    const templateFn = typeof template === 'function' ? template : await importTemplate(template);
    return (filePath): Promise<string | void> => extract(filePath).then(keys => templateFn(filePath, Array.from(new Set(keys)))).then(async (content) => {
        const fName = format({...pathParse(filePath), base: undefined, ext: extension});
        const outFile = outDir ? relative(outDir, fName) : isAbsolute(fName) ? fName : join(cwd, fName);
        if (verbose) {
            console.log(chalk.yellowBright('Writing'), fName);
        }
        await writeFile(outFile, content, {encoding: 'utf8'});
        return outFile;
    });
};

export const watcher = async (opts: Options | undefined | void) => {
    if (!opts) {
        console.warn(`No options passed`);
        process.exit(1);
    }
    if (opts.verbose) {
        console.log(opts.persistent ? 'watching' : 'transforming', opts.path);
    }
    const createFile = await transformFile(opts);

    return chokidar.watch(opts.path, {awaitWriteFinish: true, persistent: opts.persistent, cwd: opts.cwd})
        .on('add', createFile)
        .on('change', createFile);
};