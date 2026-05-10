import * as path from "path";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

export function isSupportedImageExtension(ext: string): boolean {
	return IMAGE_EXTS.has(ext.toLowerCase());
}

export function sanitizeFilename(name: string): string {
	const ext = path.extname(name);
	const base = path.basename(name, ext);
	const sanitized = base
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9._-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	return `${sanitized || "image"}${ext.toLowerCase()}`;
}

export function urlFromImagesDir(imagesDir: string, filename: string, subpath?: string): string {
	const urlBase = imagesDir.replace(/^(assets|static)\//, "");
	return subpath ? `/${urlBase}/${subpath}/${filename}` : `/${urlBase}/${filename}`;
}

export function urlFromPageBundle(filename: string): string {
	return filename;
}

export function appendMarkdown(content: string, urlPath: string, alt = ""): string {
	return `${content.trimEnd()}\n\n![${alt}](${urlPath})\n`;
}

export function insertAtBodyLine(content: string, urlPath: string, dropLine: number, alt = ""): string {
	const lines = content.split("\n");
	const insertAt = Math.max(0, Math.min(dropLine, lines.length));
	lines.splice(insertAt, 0, `![${alt}](${urlPath})`);
	return lines.join("\n");
}

export function insertImageAtLine(content: string, urlPath: string, dropLine: number, alt = "", frontmatterKey = "images"): string {
	if (!content.startsWith("---\n")) return insertAtBodyLine(content, urlPath, dropLine, alt);
	const fmEndIdx = content.indexOf("\n---", 4);
	if (fmEndIdx === -1) return insertAtBodyLine(content, urlPath, dropLine, alt);
	const fmEndLine = content.slice(0, fmEndIdx + 1).split("\n").length - 1;
	if (dropLine > fmEndLine) return insertAtBodyLine(content, urlPath, dropLine, alt);
	return insertImage(content, urlPath, alt, frontmatterKey);
}

export function insertImage(content: string, urlPath: string, alt = "", frontmatterKey = "images"): string {
	const fmEnd = content.indexOf("\n---", 4);
	if (!content.startsWith("---\n") || fmEnd === -1) {
		return appendMarkdown(content, urlPath, alt);
	}
	const frontmatter = content.slice(4, fmEnd);
	const safeKey = frontmatterKey.replace(/[\r\n]/g, "");
	const keyPattern = new RegExp(`^${escapeRegExp(safeKey)}:`, "m");
	if (!keyPattern.test(frontmatter)) {
		return appendMarkdown(content, urlPath, alt);
	}
	const keyEscaped = escapeRegExp(safeKey);
	return content.replace(
		new RegExp(`^(${keyEscaped}:)((?:\\n[ \\t]+-[^\\n]*)*)`, "m"),
		(_: string, key: string, block: string) => {
			const existingLines = block.split("\n").filter((line: string) => /^[ \t]+-\s*\S/.test(line));
			const indent =
				existingLines.length > 0 ? (existingLines[0].match(/^([ \t]+)/)?.[1] ?? "  ") : "  ";
			return [key, ...existingLines, `${indent}- ${urlPath}`].join("\n");
		},
	);
}

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
