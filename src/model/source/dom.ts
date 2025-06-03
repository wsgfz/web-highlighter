import type { DomNode, HighlighterOptions } from '@src//types';
import type HighlightSource from '@src/model/source/index';
import { ROOT_IDX } from '@src/util/const';
import { getNodeTextContent, findTextInNode, normalizeText } from '@src/util/text-matcher';

/**
 * Because of supporting highlighting a same area (range overlapping),
 * Highlighter will calculate which text-node and how much offset it actually be,
 * based on the origin website dom node and the text offset.
 *
 * @param {Node} $parent element node in the origin website dom tree
 * @param {number} offset text offset in the origin website dom tree
 * @param {boolean} robustMode whether to enable robust mode
 * @return {DomNode} DOM a dom info object
 */
export const getTextChildByOffset = ($parent: Node, offset: number, robustMode = false): DomNode => {
    const nodeStack: Node[] = [$parent];

    let $curNode: Node = null;
    let curOffset = 0;
    let startOffset = 0;

    while (($curNode = nodeStack.pop())) {
        const children = $curNode.childNodes;

        for (let i = children.length - 1; i >= 0; i--) {
            nodeStack.push(children[i]);
        }

        if ($curNode.nodeType === 3) {
            startOffset = offset - curOffset;
            curOffset += $curNode.textContent.length;

            if (curOffset >= offset) {
                break;
            }
        }
    }

    // Robust mode: if exact node not found, try to find the closest text node
    if (!$curNode && robustMode) {
        const walker = document.createTreeWalker($parent, NodeFilter.SHOW_TEXT);

        let lastTextNode: Node = null;
        let textNode: Node;

        // Find the last text node as fallback
        while ((textNode = walker.nextNode())) {
            lastTextNode = textNode;
        }

        if (lastTextNode) {
            $curNode = lastTextNode;
            startOffset = Math.min(startOffset, lastTextNode.textContent?.length || 0);
        }
    }

    if (!$curNode) {
        $curNode = $parent;
        startOffset = 0;
    }

    // Robust mode: ensure startOffset doesn't exceed node text length
    if (robustMode && $curNode.nodeType === 3) {
        const textLength = $curNode.textContent?.length || 0;

        startOffset = Math.max(0, Math.min(startOffset, textLength));
    }

    return {
        $node: $curNode,
        offset: startOffset,
    };
};

/**
 * Get sibling level nodes around the original index
 */
const getSiblingLevelNodes = (
    $root: Document | HTMLElement,
    tagName: string,
    originalIndex: number,
    levels: number,
): Node[] => {
    const allNodes = $root.getElementsByTagName(tagName);
    const nodes: Node[] = [];

    // Expand levels upward and downward
    for (let level = 1; level <= levels; level++) {
        // Search upward
        const upperIndex = originalIndex - level;

        if (upperIndex >= 0 && upperIndex < allNodes.length) {
            nodes.push(allNodes[upperIndex]);
        }

        // Search downward
        const lowerIndex = originalIndex + level;

        if (lowerIndex >= 0 && lowerIndex < allNodes.length) {
            nodes.push(allNodes[lowerIndex]);
        }
    }

    return nodes;
};

/**
 * Search for target text within specified text range
 */
const searchTextInRange = (
    text: string,
    targetText: string,
    startOffset: number,
    searchRange: number,
): { found: boolean; start: number; end: number } => {
    const normalizedText = normalizeText(text);
    const normalizedTarget = normalizeText(targetText);

    // Calculate search range
    const searchStart = Math.max(0, startOffset - searchRange);
    const searchEnd = Math.min(text.length, startOffset + targetText.length + searchRange);

    // Search for target text within range
    const searchText = normalizedText.slice(searchStart, searchEnd);
    const foundIndex = searchText.indexOf(normalizedTarget);

    if (foundIndex !== -1) {
        const actualStart = searchStart + foundIndex;
        const actualEnd = actualStart + normalizedTarget.length;

        return {
            found: true,
            start: actualStart,
            end: actualEnd,
        };
    }

    return { found: false, start: -1, end: -1 };
};

/**
 * Unified robust search function - search directly from HighlightSource to final DOM nodes
 */
const robustSearch = (
    hs: HighlightSource,
    $root: Document | HTMLElement,
    robustOptions?: HighlighterOptions['robustRestore'],
): { startInfo: DomNode; endInfo: DomNode } | null => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { startMeta, endMeta, text: targetText, id } = hs;
    const searchRange = robustOptions?.searchThreshold || 50;
    const maxLevels = robustOptions?.maxLevels || 3;

    // Helper function: try to match text in specified node
    const tryMatchInNode = (node: Node, offset: number): { startInfo: DomNode; endInfo: DomNode } | null => {
        const nodeText = getNodeTextContent(node);
        let targetOffset: number | null = null;

        // 1. Try exact match at original offset
        const originalText = nodeText.slice(offset, offset + targetText.length);

        if (normalizeText(originalText) === normalizeText(targetText)) {
            targetOffset = offset;
        } else if (robustOptions?.enabled) {
            // 2. Range search
            const searchResult = searchTextInRange(nodeText, targetText, offset, searchRange);

            if (searchResult.found) {
                targetOffset = searchResult.start;
            }
        }

        // 3. DOM positioning
        if (targetOffset !== null) {
            const textRange = findTextInNode(node, targetText, targetOffset);

            if (textRange) {
                return {
                    startInfo: {
                        $node: textRange.startNode,
                        offset: textRange.startOffset,
                    },
                    endInfo: {
                        $node: textRange.endNode,
                        offset: textRange.endOffset,
                    },
                };
            }
        }

        return null;
    };

    // Step 1: Try original node
    try {
        const originalNode =
            startMeta.parentIndex === ROOT_IDX
                ? $root
                : $root.getElementsByTagName(startMeta.parentTagName)[startMeta.parentIndex];

        if (originalNode) {
            const result = tryMatchInNode(originalNode, startMeta.textOffset);

            if (result) {
                return result;
            }
        }
    } catch (error: unknown) {
        // Silent error handling
    }

    // Step 2: Search sibling level nodes
    if (robustOptions?.enabled) {
        const siblingNodes = getSiblingLevelNodes($root, startMeta.parentTagName, startMeta.parentIndex, maxLevels);

        for (const siblingNode of siblingNodes) {
            const result = tryMatchInNode(siblingNode, startMeta.textOffset);

            if (result) {
                return result;
            }
        }
    }

    return null;
};

/**
 * get start and end parent element from meta info
 *
 * @param {HighlightSource} hs
 * @param {HTMLElement | Document} $root root element, default document
 * @param {HighlighterOptions['robustRestore']} robustOptions robust restore options
 * @return {Object}
 */
export const queryElementNode = (
    hs: HighlightSource,
    $root: Document | HTMLElement,
    robustOptions?: HighlighterOptions['robustRestore'],
): { start: Node; end: Node; startInfo?: DomNode; endInfo?: DomNode } => {
    // Use new unified search function
    const searchResult = robustSearch(hs, $root, robustOptions);

    if (searchResult) {
        // Return root for compatibility, actual DOM info is in startInfo/endInfo
        return {
            start: $root,
            end: $root,
            startInfo: searchResult.startInfo,
            endInfo: searchResult.endInfo,
        };
    }

    // Fallback: use traditional method
    const startIndex = hs.startMeta.parentIndex;
    const endIndex = hs.endMeta.parentIndex;

    const start = startIndex === ROOT_IDX ? $root : $root.getElementsByTagName(hs.startMeta.parentTagName)[startIndex];
    const end = endIndex === ROOT_IDX ? $root : $root.getElementsByTagName(hs.endMeta.parentTagName)[endIndex];

    return { start: start || $root, end: end || $root };
};
