/**
 * Text matching utilities for robust highlight restoration
 */

/**
 * Normalize text: remove extra whitespace and convert to lowercase
 */
export const normalizeText = (text: string): string => {
    if (!text) {
        return '';
    }

    const result = text.trim().toLowerCase();

    return result.replace(/\s+/g, ' ');
};

/**
 * Get all text content from a DOM node
 */
export const getNodeTextContent = (node: Node): string => {
    if (node.nodeType === 3) {
        // Text node
        return node.textContent || '';
    }

    let text = '';
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);

    let textNode: Node;

    while ((textNode = walker.nextNode())) {
        text += textNode.textContent || '';
    }

    return text;
};

/**
 * Find DOM node range containing specified text with precise offset support
 */
export const findTextInNode = (
    node: Node,
    targetText: string,
    startOffset = 0,
): { startNode: Node; startOffset: number; endNode: Node; endOffset: number } | null => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);

    let currentOffset = 0;
    let startNode: Node = null;
    let endNode: Node = null;
    let startNodeOffset = 0;
    let endNodeOffset = 0;
    let found = false;

    const targetStart = startOffset;
    const targetEnd = startOffset + targetText.length;

    let textNode: Node;

    while ((textNode = walker.nextNode())) {
        const nodeText = textNode.textContent || '';
        const nodeLength = nodeText.length;

        // Check if target text starts in current node
        if (!found && currentOffset + nodeLength > targetStart) {
            startNode = textNode;
            startNodeOffset = Math.max(0, targetStart - currentOffset);
            found = true;
        }

        // Check if target text ends in current node
        if (found && currentOffset + nodeLength >= targetEnd) {
            endNode = textNode;
            endNodeOffset = Math.min(nodeLength, targetEnd - currentOffset);
            break;
        }

        currentOffset += nodeLength;
    }

    if (startNode && endNode) {
        return {
            startNode,
            startOffset: startNodeOffset,
            endNode,
            endOffset: endNodeOffset,
        };
    }

    return null;
};
