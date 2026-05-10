# Hugo Image Importer

A VS Code extension that streamlines adding images to Hugo content. Drag an image file from your file manager or VS Code's Explorer onto any open Hugo markdown file and the extension handles the rest automatically.

## What it does

1. **Copies** the image into `assets/images/YYYY/MM/` (using today's date). The destination is [configurable](#configuration). The original file is preserved in its source location.
2. **Inserts** the reference based on where you drop:
   - **Drop in the frontmatter** — if an `images:` array exists, the URL is appended to it (featured/hero image); otherwise a `![]()` tag is appended to the body.
   - **Drop in the body** — a `![]()` markdown tag is inserted at the line where you drop it.

## Requirements

The workspace must contain a Hugo configuration file (`hugo.toml`, `config.toml`, `hugo.yaml`, etc.) at the root or under `config/_default/`. The extension is a no-op outside Hugo sites.

## Supported formats

`.jpg` · `.jpeg` · `.png` · `.webp` · `.gif`

## Usage

1. Open your Hugo site folder in VS Code.
2. Open a markdown content file.
3. Drag an image from Finder/Explorer (or VS Code's file explorer) and drop it onto the open editor. Drop in the **frontmatter** to add to the `images:` array; drop in the **body** to insert an inline `![]()` tag.
4. The extension copies the file and updates the document. If VS Code shows a drop widget with multiple options, choose **"Import as Hugo image"**.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `hugoImageImporter.imagesDir` | `assets/images` | Path to the Hugo images directory, relative to the workspace root. Supports both `assets/` (Hugo Pipes) and `static/` directories. Ignored when `usePageBundle` is true. |
| `hugoImageImporter.organizeByDate` | `true` | When true, images are placed in a `YYYY/MM/` subdirectory beneath `imagesDir`. When false, images are placed directly in `imagesDir`. Ignored when `usePageBundle` is true. |
| `hugoImageImporter.usePageBundle` | `false` | When true, the image is placed in the same directory as the markdown file (Hugo leaf bundle mode) and referenced with a relative path. The `imagesDir` and `organizeByDate` settings are ignored. |
| `hugoImageImporter.frontmatterKey` | `images` | The YAML frontmatter key used for the featured/hero image array. Change to `image`, `cover`, `thumbnail`, etc. to match your theme's schema. Only used when dropping into the frontmatter. |
| `hugoImageImporter.copyInsteadOfMove` | `true` | When true (default), the source image is copied and the original is preserved. When false, the image is moved to the destination. |

### Image directory options

**`assets/images` (default)** — use Hugo Pipes for image processing. The `assets/` prefix is stripped when generating the URL reference, so `assets/images/2025/05/photo.jpg` is referenced as `/images/2025/05/photo.jpg`.

**`static/images` or `static/img`** — images are copied verbatim to the output without processing. The `static/` prefix is stripped the same way, so `static/img/2025/05/photo.jpg` is referenced as `/img/2025/05/photo.jpg`.

**Page bundles (`usePageBundle: true`)** — images are placed next to the markdown file. This works best when the content file is a leaf bundle (`content/posts/my-post/index.md`). The image is referenced by its filename only (e.g., `photo.jpg` / `![](photo.jpg)`), which Hugo resolves as a page resource.

## How image placement works

The drop position determines where the image reference goes.

### Drop in the frontmatter → `images:` array (featured image)

When you drop onto the frontmatter block and the post has an `images:` key, the URL is appended to that list:

```yaml
---
title: My Post
images:
  - /images/2025/08/hero.png      # existing
  - /images/2025/08/new-photo.png # added by extension
---
```

If the frontmatter has no `images:` key, the image falls through to a `![]()` tag in the body instead.

### Drop in the body → inline markdown tag

When you drop anywhere below the closing `---`, a standard markdown image tag is inserted at the line where you drop — regardless of whether an `images:` array exists in the frontmatter:

```markdown
---
title: My Post
images:
  - /images/2025/08/hero.png
---

Existing body content.

![](/images/2025/08/new-photo.png)
More body content.
```

## License

MIT
