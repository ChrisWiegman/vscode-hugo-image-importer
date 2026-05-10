import * as vscode from "vscode";
import { HugoImageDropProvider } from "./dropProvider";

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.languages.registerDocumentDropEditProvider(
			{ language: "markdown" },
			new HugoImageDropProvider(),
			{ dropMimeTypes: ["Files", "text/uri-list"] },
		),
	);
}

export function deactivate(): void {
	// intentionally empty
}
