import * as path from "path";
import * as vscode from "vscode";
import { insertImageAtLine, isSupportedImageExtension, sanitizeFilename, urlFromImagesDir, urlFromPageBundle } from "./hugoContent";

const HUGO_CONFIG_FILES = [
	"hugo.toml",
	"config.toml",
	"hugo.yaml",
	"hugo.yml",
	"config.yaml",
	"config.yml",
	"config/_default/hugo.toml",
	"config/_default/config.toml",
];

async function isHugoSite(wsUri: vscode.Uri): Promise<boolean> {
	for (const cfg of HUGO_CONFIG_FILES) {
		try {
			await vscode.workspace.fs.stat(vscode.Uri.joinPath(wsUri, cfg));
			return true;
		} catch {
			// not found, try next
		}
	}
	return false;
}

interface DroppedImage {
	uri: vscode.Uri;
	name: string;
}

async function getDroppedImages(dataTransfer: vscode.DataTransfer): Promise<DroppedImage[]> {
	const seen = new Map<string, DroppedImage>();

	// text/uri-list handles multi-file drops from the OS and VS Code explorer
	const uriListText = await dataTransfer.get("text/uri-list")?.asString();
	if (uriListText) {
		for (const line of uriListText.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			try {
				const uri = vscode.Uri.parse(trimmed, true);
				if (uri.scheme !== "file") continue;
				const ext = path.extname(uri.path);
				if (isSupportedImageExtension(ext)) {
					const key = uri.toString();
					if (!seen.has(key)) {
						seen.set(key, { uri, name: path.basename(uri.path) });
					}
				}
			} catch {
				// skip unparseable lines
			}
		}
	}

	// Iterate all items to catch individual DataTransferFile entries
	for (const [, item] of dataTransfer) {
		const file = item.asFile();
		if (!file?.uri) continue;
		const ext = path.extname(file.name);
		if (!isSupportedImageExtension(ext)) continue;
		const key = file.uri.toString();
		if (!seen.has(key)) {
			seen.set(key, { uri: file.uri, name: file.name });
		}
	}

	return [...seen.values()];
}

function isWithinWorkspace(wsUri: vscode.Uri, targetUri: vscode.Uri): boolean {
	const wsPath = wsUri.path.endsWith("/") ? wsUri.path : `${wsUri.path}/`;
	return targetUri.path.startsWith(wsPath);
}

async function resolveDestUri(
	dirUri: vscode.Uri,
	name: string,
): Promise<{ uri: vscode.Uri; name: string } | null> {
	const ext = path.extname(name);
	const base = path.basename(name, ext);
	for (let i = 0; i <= 99; i++) {
		const candidate = i === 0 ? name : `${base}-${i}${ext}`;
		const uri = vscode.Uri.joinPath(dirUri, candidate);
		try {
			await vscode.workspace.fs.stat(uri);
			// file exists, try next suffix
		} catch {
			return { uri, name: candidate };
		}
	}
	void vscode.window.showWarningMessage(
		`Hugo Image Importer: could not find a unique filename for ${name}`,
	);
	return null;
}

export class HugoImageDropProvider implements vscode.DocumentDropEditProvider {
	async provideDocumentDropEdits(
		document: vscode.TextDocument,
		position: vscode.Position,
		dataTransfer: vscode.DataTransfer,
		_token: vscode.CancellationToken,
	): Promise<vscode.DocumentDropEdit | undefined> {
		const wsFolder = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!wsFolder) return undefined;

		if (!(await isHugoSite(wsFolder.uri))) return undefined;

		const imageFiles = await getDroppedImages(dataTransfer);
		if (imageFiles.length === 0) return undefined;

		const config = vscode.workspace.getConfiguration("hugoImageImporter", document.uri);
		const imagesDir = config.get<string>("imagesDir", "assets/images");
		const organizeByDate = config.get<boolean>("organizeByDate", true);
		const usePageBundle = config.get<boolean>("usePageBundle", false);
		const frontmatterKey = config.get<string>("frontmatterKey", "images");
		const copyInsteadOfMove = config.get<boolean>("copyInsteadOfMove", true);

		const pendingImages = imageFiles.map((img) => ({
			img,
			sanitizedName: sanitizeFilename(img.name),
			alt: "",
		}));

		let destDirUri: vscode.Uri;
		let subpath: string | undefined;

		if (usePageBundle) {
			destDirUri = vscode.Uri.joinPath(document.uri, "..");
		} else {
			if (organizeByDate) {
				const now = new Date();
				const year = String(now.getFullYear());
				const month = String(now.getMonth() + 1).padStart(2, "0");
				subpath = `${year}/${month}`;
				destDirUri = vscode.Uri.joinPath(wsFolder.uri, imagesDir, year, month);
			} else {
				destDirUri = vscode.Uri.joinPath(wsFolder.uri, imagesDir);
			}
			if (!isWithinWorkspace(wsFolder.uri, destDirUri)) {
				void vscode.window.showErrorMessage(
					"Hugo Image Importer: imagesDir setting must be within the workspace root",
				);
				return undefined;
			}
			await vscode.workspace.fs.createDirectory(destDirUri);
		}

		const urlPaths: Array<{ url: string; alt: string }> = [];
		for (const { img, sanitizedName, alt } of pendingImages) {
			const resolved = await resolveDestUri(destDirUri, sanitizedName);
			if (!resolved) return undefined;
			const { uri: destUri, name: finalName } = resolved;

			if (copyInsteadOfMove) {
				await vscode.workspace.fs.copy(img.uri, destUri, { overwrite: false });
			} else {
				await vscode.workspace.fs.rename(img.uri, destUri, { overwrite: false });
			}

			urlPaths.push({
				url: usePageBundle
					? urlFromPageBundle(finalName)
					: urlFromImagesDir(imagesDir, finalName, subpath),
				alt,
			});
		}

		let content = document.getText();
		for (const { url, alt } of urlPaths) {
			content = insertImageAtLine(content, url, position.line, alt, frontmatterKey);
		}

		const workspaceEdit = new vscode.WorkspaceEdit();
		const fullRange = new vscode.Range(
			document.positionAt(0),
			document.positionAt(document.getText().length),
		);
		workspaceEdit.replace(document.uri, fullRange, content);

		const dropEdit = new vscode.DocumentDropEdit("");
		dropEdit.additionalEdit = workspaceEdit;
		return dropEdit;
	}
}
