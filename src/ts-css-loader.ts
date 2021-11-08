import loader from 'css-loader';
import {generate} from './generate';

const LOCALS_RE = /[\s\S]*exports\.locals\s*=\s*([\s\S]*});\s+?[\s\S]*/mg;

export default function (...args: any[]) {
    //Ignore if not enabled for css modules.
    if (!this.query.modules) {
        return loader.apply(this, args);
    }
    const async = () => {
        const cb = this.async();
        return (e, o) => {
            if (e || o == null) {
                return cb(e, o);
            }
            let keys;
            try {
                keys = Object.keys(JSON.parse((o + '').replace(LOCALS_RE, '$1')));
            } catch (err) {
                console.warn(`A css file:"${this.resourcePath}" was found without the "exports.locals" found the is usually
a misconfiguration.`)
                console.trace(err);
                return cb(err, o);
            }
            generate(this.resourcePath, keys, this.query).then(() => cb(null, o), cb);

        }
    };
    return loader.call({...this, async}, ...args);
}