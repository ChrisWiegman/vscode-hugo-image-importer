import * as assert from "assert";
import { appendMarkdown, insertAtBodyLine, insertImage, insertImageAtLine, isSupportedImageExtension, sanitizeFilename, urlFromImagesDir, urlFromPageBundle } from "../src/hugoContent";

describe("isSupportedImageExtension", () => {
	it("accepts known image extensions", () => {
		for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]) {
			assert.strictEqual(isSupportedImageExtension(ext), true, ext);
		}
	});

	it("accepts uppercase variants", () => {
		assert.strictEqual(isSupportedImageExtension(".JPG"), true);
		assert.strictEqual(isSupportedImageExtension(".PNG"), true);
		assert.strictEqual(isSupportedImageExtension(".AVIF"), true);
	});

	it("rejects non-image extensions", () => {
		assert.strictEqual(isSupportedImageExtension(".md"), false);
		assert.strictEqual(isSupportedImageExtension(".txt"), false);
		assert.strictEqual(isSupportedImageExtension(""), false);
	});
});

describe("sanitizeFilename", () => {
	it("lowercases the filename", () => {
		assert.strictEqual(sanitizeFilename("Photo.PNG"), "photo.png");
	});

	it("replaces spaces with hyphens", () => {
		assert.strictEqual(sanitizeFilename("my photo.jpg"), "my-photo.jpg");
	});

	it("collapses multiple spaces into one hyphen", () => {
		assert.strictEqual(sanitizeFilename("my  photo.jpg"), "my-photo.jpg");
	});

	it("removes parentheses and other special chars", () => {
		assert.strictEqual(sanitizeFilename("my photo (1).jpg"), "my-photo-1.jpg");
	});

	it("handles macOS screenshot filenames", () => {
		assert.strictEqual(
			sanitizeFilename("Screenshot 2026-05-10 at 14.32.55.png"),
			"screenshot-2026-05-10-at-14.32.55.png",
		);
	});

	it("preserves hyphens and underscores", () => {
		assert.strictEqual(sanitizeFilename("my_photo-hero.jpg"), "my_photo-hero.jpg");
	});

	it("collapses multiple hyphens", () => {
		assert.strictEqual(sanitizeFilename("my--photo.jpg"), "my-photo.jpg");
	});

	it("trims leading and trailing hyphens from the base", () => {
		assert.strictEqual(sanitizeFilename("(photo).jpg"), "photo.jpg");
	});

	it("falls back to 'image' when base is entirely stripped", () => {
		assert.strictEqual(sanitizeFilename("!!!.jpg"), "image.jpg");
	});

	it("lowercases the extension", () => {
		assert.strictEqual(sanitizeFilename("photo.JPEG"), "photo.jpeg");
	});
});

describe("urlFromImagesDir", () => {
	it("strips leading assets/ prefix", () => {
		assert.strictEqual(
			urlFromImagesDir("assets/images", "photo.png", "2025/08"),
			"/images/2025/08/photo.png",
		);
	});

	it("strips leading static/ prefix", () => {
		assert.strictEqual(
			urlFromImagesDir("static/img", "photo.png", "2025/08"),
			"/img/2025/08/photo.png",
		);
	});

	it("leaves non-assets non-static paths as-is", () => {
		assert.strictEqual(
			urlFromImagesDir("uploads/images", "photo.png", "2025/08"),
			"/uploads/images/2025/08/photo.png",
		);
	});

	it("omits subpath when not provided (organizeByDate=false)", () => {
		assert.strictEqual(
			urlFromImagesDir("assets/images", "photo.png"),
			"/images/photo.png",
		);
	});

	it("omits subpath for static/ dir (organizeByDate=false)", () => {
		assert.strictEqual(
			urlFromImagesDir("static/img", "photo.png"),
			"/img/photo.png",
		);
	});

	it("includes subpath with zero-padded month", () => {
		const url = urlFromImagesDir("assets/images", "photo.jpg", "2025/01");
		assert.ok(url.includes("/2025/01/"), `Expected /2025/01/ in ${url}`);
	});
});

describe("urlFromPageBundle", () => {
	it("returns just the filename (relative reference)", () => {
		assert.strictEqual(urlFromPageBundle("photo.png"), "photo.png");
	});

	it("preserves the original filename including extension", () => {
		assert.strictEqual(urlFromPageBundle("my-hero-image.webp"), "my-hero-image.webp");
	});
});

describe("appendMarkdown", () => {
	it("appends image tag after trimmed content with double newline", () => {
		const result = appendMarkdown("Hello world", "/images/2025/08/photo.png");
		assert.strictEqual(result, "Hello world\n\n![](/images/2025/08/photo.png)\n");
	});

	it("trims trailing whitespace before appending", () => {
		const result = appendMarkdown("Hello world   \n\n", "/images/photo.png");
		assert.strictEqual(result, "Hello world\n\n![](/images/photo.png)\n");
	});

	it("handles empty content", () => {
		const result = appendMarkdown("", "/images/photo.png");
		assert.strictEqual(result, "\n\n![](/images/photo.png)\n");
	});

	it("includes alt text when provided", () => {
		const result = appendMarkdown("Hello world", "/images/photo.png", "A sunset");
		assert.strictEqual(result, "Hello world\n\n![A sunset](/images/photo.png)\n");
	});
});

describe("insertAtBodyLine", () => {
	// Line layout:
	// 0: First paragraph.
	// 1: (empty)
	// 2: Second paragraph.
	const doc = "First paragraph.\n\nSecond paragraph.";

	it("inserts image at the drop line position", () => {
		const result = insertAtBodyLine(doc, "/images/photo.png", 1);
		assert.strictEqual(result, "First paragraph.\n![](/images/photo.png)\n\nSecond paragraph.", `Got: ${JSON.stringify(result)}`);
	});

	it("inserts image at drop line without leading blank line", () => {
		const result = insertAtBodyLine(doc, "/images/photo.png", 0);
		assert.strictEqual(result, "![](/images/photo.png)\nFirst paragraph.\n\nSecond paragraph.", `Got: ${JSON.stringify(result)}`);
	});

	it("inserts image at drop line without trailing blank line", () => {
		const result = insertAtBodyLine("Line one.\nLine two.", "/images/photo.png", 0);
		assert.strictEqual(result, "![](/images/photo.png)\nLine one.\nLine two.", `Got: ${JSON.stringify(result)}`);
	});

	it("includes alt text in the inserted tag", () => {
		const result = insertAtBodyLine(doc, "/images/photo.png", 1, "A nice view");
		assert.ok(result.includes("![A nice view](/images/photo.png)"), `Got: ${JSON.stringify(result)}`);
	});

	it("clamps drop line to document length", () => {
		const result = insertAtBodyLine("Single line.", "/images/photo.png", 999);
		assert.ok(result.includes("![](/images/photo.png)"), `Got: ${JSON.stringify(result)}`);
	});
});

describe("insertImage — no frontmatter", () => {
	it("appends to plain body content", () => {
		const result = insertImage("Some body text.", "/images/2025/08/photo.png");
		assert.strictEqual(result, "Some body text.\n\n![](/images/2025/08/photo.png)\n");
	});

	it("appends when content does not start with ---", () => {
		const result = insertImage("No frontmatter here.", "/images/photo.png");
		assert.ok(result.includes("![](/images/photo.png)"));
		assert.ok(!result.includes("images:"));
	});

	it("appends when frontmatter exists but has no images: key", () => {
		const doc = "---\ntitle: My Post\ndate: 2025-01-01\n---\n\nBody content.";
		const result = insertImage(doc, "/images/photo.png");
		assert.ok(result.endsWith("\n\n![](/images/photo.png)\n"), `Got: ${JSON.stringify(result)}`);
		assert.ok(!result.includes("images:"));
	});

	it("includes alt text in fallback append", () => {
		const result = insertImage("Body.", "/images/photo.png", "Alt here");
		assert.ok(result.includes("![Alt here](/images/photo.png)"));
	});
});

describe("insertImage — with images: frontmatter", () => {
	it("appends to an existing images: array (2-space indent)", () => {
		const doc =
			"---\ntitle: My Post\nimages:\n  - /images/2025/01/first.png\n---\n\nBody.";
		const result = insertImage(doc, "/images/2025/08/second.png");
		assert.ok(
			result.includes("  - /images/2025/01/first.png\n  - /images/2025/08/second.png"),
			`Got: ${JSON.stringify(result)}`,
		);
	});

	it("appends to an existing images: array (3-space indent)", () => {
		const doc =
			"---\ntitle: My Post\nimages:\n   - /images/2025/01/first.png\n---\n\nBody.";
		const result = insertImage(doc, "/images/2025/08/second.png");
		assert.ok(
			result.includes("   - /images/2025/01/first.png\n   - /images/2025/08/second.png"),
			`Got: ${JSON.stringify(result)}`,
		);
	});

	it("adds first entry with 2-space indent when images: is empty", () => {
		const doc = "---\ntitle: My Post\nimages:\n---\n\nBody.";
		const result = insertImage(doc, "/images/2025/08/photo.png");
		assert.ok(result.includes("images:\n  - /images/2025/08/photo.png"), `Got: ${JSON.stringify(result)}`);
	});

	it("fills a blank placeholder entry (  -) without creating a duplicate", () => {
		const doc = "---\ntitle: My Post\nimages:\n  -\n---\n\nBody.";
		const result = insertImage(doc, "/images/2025/08/photo.png");
		assert.ok(result.includes("images:\n  - /images/2025/08/photo.png"), `Got: ${JSON.stringify(result)}`);
		const entries = (result.match(/^\s+-\s/gm) ?? []);
		assert.strictEqual(entries.length, 1, "should have exactly one images entry");
	});

	it("fills a blank placeholder entry with trailing space (  - ) without creating a duplicate", () => {
		const doc = "---\ntitle: My Post\nimages:\n  - \n---\n\nBody.";
		const result = insertImage(doc, "/images/2025/08/photo.png");
		assert.ok(result.includes("images:\n  - /images/2025/08/photo.png"), `Got: ${JSON.stringify(result)}`);
		const entries = (result.match(/^\s+-\s/gm) ?? []);
		assert.strictEqual(entries.length, 1, "should have exactly one images entry");
	});

	it("appends after existing entry even when a blank placeholder also exists", () => {
		const doc = "---\ntitle: My Post\nimages:\n  - /images/first.png\n  -\n---\n\nBody.";
		const result = insertImage(doc, "/images/second.png");
		assert.ok(result.includes("  - /images/first.png"), `missing first entry in: ${JSON.stringify(result)}`);
		assert.ok(result.includes("  - /images/second.png"), `missing second entry in: ${JSON.stringify(result)}`);
		const entries = (result.match(/^\s+-\s\S/gm) ?? []);
		assert.strictEqual(entries.length, 2, "should have exactly two non-empty images entries");
	});

	it("does not duplicate images: key in document", () => {
		const doc = "---\ntitle: My Post\nimages:\n  - /images/first.png\n---\n\nBody.";
		const result = insertImage(doc, "/images/second.png");
		const count = (result.match(/^images:/gm) ?? []).length;
		assert.strictEqual(count, 1, "images: key appears more than once");
	});

	it("preserves body content after frontmatter", () => {
		const doc = "---\ntitle: Post\nimages:\n  - /images/a.png\n---\n\nBody text here.";
		const result = insertImage(doc, "/images/b.png");
		assert.ok(result.includes("Body text here."), "Body was lost");
	});

	it("does not append a markdown tag when images: exists", () => {
		const doc = "---\ntitle: Post\nimages:\n  - /images/a.png\n---\n\nBody.";
		const result = insertImage(doc, "/images/b.png");
		assert.ok(!result.includes("![]"), "Should not append markdown tag when using frontmatter");
	});
});

describe("insertImage — configurable frontmatter key", () => {
	it("uses a custom key when specified", () => {
		const doc = "---\ntitle: Post\ncover:\n  - /images/a.png\n---\n\nBody.";
		const result = insertImage(doc, "/images/b.png", "", "cover");
		assert.ok(result.includes("  - /images/b.png"), `Got: ${JSON.stringify(result)}`);
		assert.ok(!result.includes("![]"), "Should not append markdown tag");
	});

	it("falls back to append when custom key is absent", () => {
		const doc = "---\ntitle: Post\nimages:\n  - /images/a.png\n---\n\nBody.";
		const result = insertImage(doc, "/images/b.png", "", "cover");
		assert.ok(result.includes("![](/images/b.png)"), `Got: ${JSON.stringify(result)}`);
	});
});

describe("insertImageAtLine — position routing", () => {
	// line 0: ---
	// line 1: title: Post
	// line 2: images:
	// line 3:   - /images/a.png
	// line 4: ---   ← fmEndLine
	// line 5: (empty)
	// line 6: Body text.
	const docWithImages = "---\ntitle: Post\nimages:\n  - /images/a.png\n---\n\nBody text.";

	it("inserts into frontmatter images when dropped in frontmatter", () => {
		const result = insertImageAtLine(docWithImages, "/images/b.png", 2);
		assert.ok(result.includes("  - /images/b.png"), `Got: ${JSON.stringify(result)}`);
		assert.ok(!result.includes("![]"), "Should not insert inline markdown tag");
	});

	it("inserts into body at drop position when dropped in content area", () => {
		const result = insertImageAtLine(docWithImages, "/images/b.png", 6);
		assert.ok(result.includes("![](/images/b.png)"), `Got: ${JSON.stringify(result)}`);
		const fmEntries = (result.match(/^ {2}- /gm) ?? []).length;
		assert.strictEqual(fmEntries, 1, "Should not add to frontmatter images");
	});

	it("inserts between paragraphs, not at end of document", () => {
		const doc = "---\ntitle: Post\n---\n\nFirst.\n\nSecond.";
		// drop at line 5 (empty line between "First." and "Second.")
		const result = insertImageAtLine(doc, "/images/b.png", 5);
		const bodyOnly = result.slice(result.indexOf("\n---\n", 4) + 5);
		assert.ok(
			bodyOnly.includes("First.\n![](/images/b.png)\n\nSecond."),
			`Expected mid-body insertion, got: ${JSON.stringify(bodyOnly)}`,
		);
	});

	it("treats closing --- line as frontmatter", () => {
		const result = insertImageAtLine(docWithImages, "/images/b.png", 4);
		assert.ok(result.includes("  - /images/b.png"), `Got: ${JSON.stringify(result)}`);
		assert.ok(!result.includes("![]"));
	});

	it("treats line after closing --- as body", () => {
		const result = insertImageAtLine(docWithImages, "/images/b.png", 5);
		assert.ok(result.includes("![](/images/b.png)"), `Got: ${JSON.stringify(result)}`);
	});

	it("inserts into body when there is no frontmatter", () => {
		const result = insertImageAtLine("Just body.", "/images/photo.png", 0);
		assert.ok(result.includes("![](/images/photo.png)"));
	});

	it("inserts into body when frontmatter has no images: key, regardless of drop line", () => {
		const doc = "---\ntitle: Post\n---\n\nBody.";
		const result = insertImageAtLine(doc, "/images/photo.png", 1);
		assert.ok(result.includes("![](/images/photo.png)"));
		assert.ok(!result.includes("images:"));
	});

	it("includes alt text in body insertion", () => {
		const result = insertImageAtLine(docWithImages, "/images/b.png", 6, "My alt");
		assert.ok(result.includes("![My alt](/images/b.png)"), `Got: ${JSON.stringify(result)}`);
	});

	it("uses configurable frontmatter key", () => {
		const doc = "---\ntitle: Post\ncover:\n  - /images/a.png\n---\n\nBody.";
		const result = insertImageAtLine(doc, "/images/b.png", 2, "", "cover");
		assert.ok(result.includes("  - /images/b.png"), `Got: ${JSON.stringify(result)}`);
		assert.ok(!result.includes("![]"));
	});
});
