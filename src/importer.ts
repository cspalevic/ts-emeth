import theme from 'emeth';

type Component = Record<string, string>
type Context = ((key: string) => any) & { keys(): string[] };
type Theme = Record<string, Component>;

function isFunction(v: unknown): v is Function {
    return typeof v === 'function';
}

function isContext(ctx: Context | Theme): ctx is Context {
    return isFunction(ctx) && isFunction(ctx.keys);
}

export const importer = (ctx: Context | Theme) => theme(isContext(ctx) ? ctx.keys().reduce((ret: Theme, key) => {
    ret[key.replace(/(?:.+?)?([^//]*)\.cssm$/, '$1')] = (ctx(key) as Component);
    return ret;
}, {}) : ctx);
