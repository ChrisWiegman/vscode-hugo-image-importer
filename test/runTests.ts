import * as path from "path";
import { runTests } from "@vscode/test-electron";

function sanitizeLaunchEnv(): void {
	delete process.env.ELECTRON_RUN_AS_NODE;
	delete process.env.VSCODE_CLI;
}

async function main(): Promise<void> {
	sanitizeLaunchEnv();

	const extensionDevelopmentPath = path.resolve(__dirname, "../../");
	const extensionTestsPath = path.resolve(__dirname, "./suite/index");

	await runTests({ extensionDevelopmentPath, extensionTestsPath });
}

main().catch((err: unknown) => {
	console.error("Failed to run tests:", err);
	process.exit(1);
});
