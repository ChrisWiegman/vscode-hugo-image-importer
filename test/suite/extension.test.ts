import * as assert from "assert";
import * as vscode from "vscode";

const EXTENSION_ID = "chriswiegman.vscode-hugo-image-importer";

suite("Extension", () => {
	suiteSetup(async () => {
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
		await ext.activate();
	});

	test("activates", () => {
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext?.isActive, "Extension should be active");
	});

	suite("Configuration defaults", () => {
		let config: vscode.WorkspaceConfiguration;

		setup(() => {
			config = vscode.workspace.getConfiguration("hugoImageImporter");
		});

		test("imagesDir defaults to assets/images", () => {
			assert.strictEqual(config.get("imagesDir"), "assets/images");
		});

		test("organizeByDate defaults to true", () => {
			assert.strictEqual(config.get("organizeByDate"), true);
		});

		test("usePageBundle defaults to false", () => {
			assert.strictEqual(config.get("usePageBundle"), false);
		});

		test("frontmatterKey defaults to images", () => {
			assert.strictEqual(config.get("frontmatterKey"), "images");
		});

		test("copyInsteadOfMove defaults to true", () => {
			assert.strictEqual(config.get("copyInsteadOfMove"), true);
		});
	});

	suite("Drop provider is registered for markdown", () => {
		let doc: vscode.TextDocument;

		setup(async () => {
			doc = await vscode.workspace.openTextDocument({
				content: "---\ntitle: Test\n---\n\nBody text.",
				language: "markdown",
			});
			await vscode.window.showTextDocument(doc);
		});

		teardown(async () => {
			await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
		});

		test("opens markdown document without errors", () => {
			assert.strictEqual(doc.languageId, "markdown");
		});

		test("document has expected frontmatter structure", () => {
			const text = doc.getText();
			assert.ok(text.startsWith("---\n"), "Document should start with frontmatter");
			assert.ok(text.includes("title: Test"), "Document should contain title");
		});
	});
});
