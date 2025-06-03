/**
 * HighlightSource Class (HSource)
 * This Object can be deSerialized to HRange.
 * Also it has the ability for persistence.
 */

import type { DomMeta, HookMap, DomNode, HighlighterOptions } from '@src/types';
import HighlightRange from '@src/model/range/index';
import { queryElementNode, getTextChildByOffset } from '@src/model/source/dom';

class HighlightSource {
    startMeta: DomMeta;

    endMeta: DomMeta;

    text: string;

    id: string;

    extra?: unknown;

    __isHighlightSource: unknown;

    constructor(startMeta: DomMeta, endMeta: DomMeta, text: string, id: string, extra?: unknown) {
        this.startMeta = startMeta;
        this.endMeta = endMeta;
        this.text = text;
        this.id = id;
        this.__isHighlightSource = {};

        if (extra) {
            this.extra = extra;
        }
    }

    deSerialize(
        $root: Document | HTMLElement,
        hooks: HookMap,
        robustOptions?: HighlighterOptions['robustRestore'],
    ): HighlightRange {
        const queryResult = queryElementNode(this, $root, robustOptions);
        const { start, end, startInfo, endInfo } = queryResult;
        const robustMode = robustOptions?.enabled || false;

        let finalStartInfo: DomNode;
        let finalEndInfo: DomNode;

        // If we have precise DOM node info, use it directly
        if (startInfo && endInfo) {
            finalStartInfo = startInfo;
            finalEndInfo = endInfo;
        } else {
            // Fallback to traditional method
            finalStartInfo = getTextChildByOffset(start, this.startMeta.textOffset, robustMode);
            finalEndInfo = getTextChildByOffset(end, this.endMeta.textOffset, robustMode);
        }

        if (!hooks.Serialize.Restore.isEmpty()) {
            const res: DomNode[] = hooks.Serialize.Restore.call(this, finalStartInfo, finalEndInfo) || [];

            finalStartInfo = res[0] || finalStartInfo;
            finalEndInfo = res[1] || finalEndInfo;
        }

        const range = new HighlightRange(finalStartInfo, finalEndInfo, this.text, this.id, true);

        return range;
    }
}

export default HighlightSource;
